import crypto from 'node:crypto';
import { createClient, type Client } from '@libsql/client/web';
import {
  checkConflictBinarySearch,
  findFreeSlotsOnSameRoom,
  suggestAlternativeRooms,
  validateBookingRequest,
  type Booking,
  type BookingEvaluation,
  type BookingRequest,
  type Facility,
} from '@bakante/shared';
import {
  readDatasetSafe,
  readFacilitiesSafe,
} from './baselineData.ts';

export function loadFacilitiesFromFile(): Facility[] {
  return readFacilitiesSafe();
}

export interface TursoConfig {
  url: string;
  authToken?: string;
}

/**
 * Core evaluation engine shared by both Turso cloud storage and in-memory benchmark replay.
 */
function evaluateAgainstSchedule(params: {
  request: BookingRequest;
  facilities: Facility[];
  roomBookings: Booking[];
  allDayBookings: Booking[];
  saveIfAvailable: boolean;
}): { evaluation: BookingEvaluation; newBooking?: Booking } {
  const { request, facilities, roomBookings, allDayBookings, saveIfAvailable } = params;
  const bufferMinutes = request.bufferMinutes ?? 0;

  // STEP 1: Input Gatekeeper O(1)
  const validation = validateBookingRequest(request, facilities);
  if (!validation.isValid || !validation.facility) {
    return {
      evaluation: {
        status: 'VALIDATION_ERROR',
        message: validation.errors[0] || 'Invalid booking request.',
        validationErrors: validation.errors,
        conflicts: [],
        binarySearchSteps: 0,
        linearScanSteps: 0,
        freeSlotsSameRoom: [],
        alternativeRooms: [],
      },
    };
  }

  const facility = validation.facility;
  const startMin = validation.startMin!;
  const endMin = validation.endMin!;

  // STEP 2: Sorted Binary Search Conflict Check O(log n)
  const conflictCheck = checkConflictBinarySearch(
    roomBookings,
    startMin,
    endMin,
    bufferMinutes
  );

  // STEP 3A: If conflict found, compute free same-room gaps + 100-pt alternative rooms
  if (conflictCheck.hasConflict) {
    const bookingsByFacility: Record<string, Booking[]> = {};
    for (const b of allDayBookings) {
      if (!bookingsByFacility[b.facilityId]) {
        bookingsByFacility[b.facilityId] = [];
      }
      bookingsByFacility[b.facilityId].push(b);
    }

    const freeSlotsSameRoom = findFreeSlotsOnSameRoom(
      facility,
      roomBookings,
      startMin,
      endMin - startMin,
      bufferMinutes
    );

    const alternativeRooms = suggestAlternativeRooms({
      requestedFacility: facility,
      allFacilities: facilities,
      bookingsByFacility,
      startMin,
      endMin,
      attendees: request.attendees,
      requiredAmenities: request.requiredAmenities,
      bufferMinutes,
    });

    const conflictDesc = conflictCheck.conflicts
      .map((c) => `"${c.eventTitle}" (${c.startTime}–${c.endTime})`)
      .join(', ');

    return {
      evaluation: {
        status: 'CONFLICT',
        message: `Conflict in ${facility.name} on ${request.date}: overlaps with ${conflictDesc}.`,
        validationErrors: [],
        conflicts: conflictCheck.conflicts,
        binarySearchSteps: conflictCheck.binarySearchSteps,
        linearScanSteps: conflictCheck.linearScanSteps,
        freeSlotsSameRoom,
        alternativeRooms,
      },
    };
  }

  if (!saveIfAvailable) {
    return {
      evaluation: {
        status: 'AVAILABLE',
        message: `${facility.name} is available from ${request.startTime} to ${request.endTime}.`,
        validationErrors: [],
        conflicts: [],
        binarySearchSteps: conflictCheck.binarySearchSteps,
        linearScanSteps: conflictCheck.linearScanSteps,
        freeSlotsSameRoom: [],
        alternativeRooms: [],
      },
    };
  }

  const newBooking: Booking = {
    id: `BK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    facilityId: facility.id,
    date: request.date.trim(),
    startTime: request.startTime.trim(),
    endTime: request.endTime.trim(),
    startMin,
    endMin,
    requesterName: request.requesterName.trim(),
    office: request.office.trim(),
    eventTitle: request.eventTitle.trim(),
    attendees: request.attendees,
    createdAt: new Date().toISOString(),
  };

  return {
    newBooking,
    evaluation: {
      status: 'BOOKED',
      message: `Confirmed booking for ${facility.name} (${newBooking.startTime}–${newBooking.endTime}).`,
      booking: newBooking,
      validationErrors: [],
      conflicts: [],
      binarySearchSteps: conflictCheck.binarySearchSteps,
      linearScanSteps: conflictCheck.linearScanSteps,
      freeSlotsSameRoom: [],
      alternativeRooms: [],
    },
  };
}

/**
 * BakanteDatabase supports two modes:
 * 1. Turso Cloud LibSQL (`new BakanteDatabase({ url, authToken })`) — used in production
 *    on Vercel and local dev when `TURSO_DATABASE_URL` is configured.
 * 2. Fast In-Memory Store (`new BakanteDatabase(':memory:')`) — used for isolated
 *    sub-millisecond benchmark replays and unit tests with zero network latency.
 */
export class BakanteDatabase {
  private client: Client | null = null;
  private initPromise: Promise<void> | null = null;
  private memFacilities: Facility[] = [];
  private memBookings: Booking[] = [];

  constructor(target: ':memory:' | TursoConfig = ':memory:') {
    if (target === ':memory:') {
      this.memFacilities = [...loadFacilitiesFromFile()].sort((a, b) =>
        `${a.building}-${a.name}`.localeCompare(`${b.building}-${b.name}`)
      );
    } else {
      const normalizedUrl = target.url.startsWith('libsql://')
        ? target.url.replace(/^libsql:\/\//, 'https://')
        : target.url;
      this.client = createClient({
        url: normalizedUrl,
        authToken: target.authToken,
      });
    }
  }

  get isTurso(): boolean {
    return this.client !== null;
  }

  /**
   * Initializes Turso schema, syncs the 9 ISATU facilities, and seeds demo bookings
   * if the database is brand-new/empty. Safe to call repeatedly (memoized).
   */
  async ensureInitialized(): Promise<void> {
    if (!this.client) {
      return;
    }
    if (!this.initPromise) {
      this.initPromise = this.initializeTursoSchemaAndSeed();
    }
    await this.initPromise;
  }

  private async initializeTursoSchemaAndSeed(): Promise<void> {
    if (!this.client) return;

    await this.client.batch(
      [
        `CREATE TABLE IF NOT EXISTS facilities (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          building TEXT NOT NULL,
          capacity INTEGER NOT NULL,
          amenities_json TEXT NOT NULL,
          open_time TEXT NOT NULL,
          close_time TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          facility_id TEXT NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          start_min INTEGER NOT NULL,
          end_min INTEGER NOT NULL,
          requester_name TEXT NOT NULL,
          office TEXT NOT NULL,
          event_title TEXT NOT NULL,
          attendees INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (facility_id) REFERENCES facilities(id),
          CHECK (end_min > start_min)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_bookings_facility_date_start
         ON bookings (facility_id, date, start_min)`,
      ],
      'write'
    );

    const facilities = loadFacilitiesFromFile();
    const validIds = facilities.map((f) => f.id);
    const placeholders = validIds.map(() => '?').join(', ');

    await this.client.execute({
      sql: `DELETE FROM bookings WHERE facility_id NOT IN (${placeholders})`,
      args: validIds,
    });
    await this.client.execute({
      sql: `DELETE FROM facilities WHERE id NOT IN (${placeholders})`,
      args: validIds,
    });

    await this.client.batch(
      facilities.map((f) => ({
        sql: `INSERT OR REPLACE INTO facilities
              (id, name, building, capacity, amenities_json, open_time, close_time)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          f.id,
          f.name,
          f.building,
          f.capacity,
          JSON.stringify(f.amenities),
          f.openTime,
          f.closeTime,
        ],
      })),
      'write'
    );

    const countRes = await this.client.execute(
      'SELECT COUNT(*) as cnt FROM bookings'
    );
    const count = Number(countRes.rows[0]?.cnt ?? 0);
    if (count === 0) {
      await this.seedDemoBookingsBatch();
    }
  }

  private async seedDemoBookingsBatch(): Promise<{
    seededCount: number;
    blockedConflicts: number;
    caughtErrors: number;
    totalDatasetItems: number;
  }> {
    const tempMem = new BakanteDatabase(':memory:');
    const dataset = readDatasetSafe();
    const toInsert: Booking[] = [];
    let blockedConflicts = 0;
    let caughtErrors = 0;

    // Run EVERY entry from baseline/dataset.json through Bakante's validation & conflict engine
    for (const item of dataset) {
      const res = tempMem.createBookingAtomicSync(item);
      if (res.status === 'BOOKED' && res.booking) {
        toInsert.push(res.booking);
      } else if (res.status === 'CONFLICT') {
        blockedConflicts += 1;
      } else if (res.status === 'VALIDATION_ERROR') {
        caughtErrors += 1;
      }
    }

    if (this.client && toInsert.length > 0) {
      await this.client.batch(
        toInsert.map((b) => ({
          sql: `INSERT INTO bookings
                (id, facility_id, date, start_time, end_time, start_min, end_min,
                 requester_name, office, event_title, attendees, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            b.id,
            b.facilityId,
            b.date,
            b.startTime,
            b.endTime,
            b.startMin,
            b.endMin,
            b.requesterName,
            b.office,
            b.eventTitle,
            b.attendees,
            b.createdAt,
          ],
        })),
        'write'
      );
    }

    return {
      seededCount: toInsert.length,
      blockedConflicts,
      caughtErrors,
      totalDatasetItems: dataset.length,
    };
  }

  /**
   * Synchronous path for in-memory benchmark replay (`:memory:` mode only).
   */
  createBookingAtomicSync(request: BookingRequest): BookingEvaluation {
    const roomBookings = this.memBookings
      .filter((b) => b.date === request.date && b.facilityId === request.facilityId)
      .sort((a, b) => a.startMin - b.startMin);
    const allDayBookings = this.memBookings
      .filter((b) => b.date === request.date)
      .sort((a, b) => a.startMin - b.startMin);

    const { evaluation, newBooking } = evaluateAgainstSchedule({
      request,
      facilities: this.memFacilities,
      roomBookings,
      allDayBookings,
      saveIfAvailable: true,
    });

    if (newBooking) {
      this.memBookings.push(newBooking);
      this.memBookings.sort((a, b) =>
        a.date !== b.date
          ? a.date.localeCompare(b.date)
          : a.facilityId !== b.facilityId
            ? a.facilityId.localeCompare(b.facilityId)
            : a.startMin - b.startMin
      );
    }

    return evaluation;
  }

  async getFacilities(): Promise<Facility[]> {
    if (!this.client) {
      return this.memFacilities;
    }
    await this.ensureInitialized();
    const res = await this.client.execute(
      'SELECT * FROM facilities ORDER BY building, name'
    );
    return res.rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      building: String(row.building),
      capacity: Number(row.capacity),
      amenities: JSON.parse(String(row.amenities_json)) as string[],
      openTime: String(row.open_time),
      closeTime: String(row.close_time),
    }));
  }

  async getBookings(filters?: {
    date?: string;
    facilityId?: string;
  }): Promise<Booking[]> {
    if (!this.client) {
      return this.memBookings.filter((b) => {
        if (filters?.date && b.date !== filters.date) return false;
        if (filters?.facilityId && b.facilityId !== filters.facilityId) return false;
        return true;
      });
    }

    await this.ensureInitialized();
    const clauses: string[] = [];
    const args: string[] = [];

    if (filters?.date) {
      clauses.push('date = ?');
      args.push(filters.date);
    }
    if (filters?.facilityId) {
      clauses.push('facility_id = ?');
      args.push(filters.facilityId);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const res = await this.client.execute({
      sql: `SELECT * FROM bookings ${where} ORDER BY date, facility_id, start_min`,
      args,
    });

    return res.rows.map((row) => ({
      id: String(row.id),
      facilityId: String(row.facility_id),
      date: String(row.date),
      startTime: String(row.start_time),
      endTime: String(row.end_time),
      startMin: Number(row.start_min),
      endMin: Number(row.end_min),
      requesterName: String(row.requester_name),
      office: String(row.office),
      eventTitle: String(row.event_title),
      attendees: Number(row.attendees),
      createdAt: String(row.created_at),
    }));
  }

  async checkBookingAvailability(
    request: BookingRequest
  ): Promise<BookingEvaluation> {
    const [facilities, allDayBookings] = await Promise.all([
      this.getFacilities(),
      this.getBookings({ date: request.date }),
    ]);
    const roomBookings = allDayBookings.filter(
      (b) => b.facilityId === request.facilityId
    );

    return evaluateAgainstSchedule({
      request,
      facilities,
      roomBookings,
      allDayBookings,
      saveIfAvailable: false,
    }).evaluation;
  }

  async createBookingAtomic(request: BookingRequest): Promise<BookingEvaluation> {
    if (!this.client) {
      return this.createBookingAtomicSync(request);
    }

    await this.ensureInitialized();
    const [facilities, allDayBookings] = await Promise.all([
      this.getFacilities(),
      this.getBookings({ date: request.date }),
    ]);
    const roomBookings = allDayBookings.filter(
      (b) => b.facilityId === request.facilityId
    );

    const { evaluation, newBooking } = evaluateAgainstSchedule({
      request,
      facilities,
      roomBookings,
      allDayBookings,
      saveIfAvailable: true,
    });

    if (newBooking) {
      await this.client.execute({
        sql: `INSERT INTO bookings
              (id, facility_id, date, start_time, end_time, start_min, end_min,
               requester_name, office, event_title, attendees, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          newBooking.id,
          newBooking.facilityId,
          newBooking.date,
          newBooking.startTime,
          newBooking.endTime,
          newBooking.startMin,
          newBooking.endMin,
          newBooking.requesterName,
          newBooking.office,
          newBooking.eventTitle,
          newBooking.attendees,
          newBooking.createdAt,
        ],
      });
    }

    return evaluation;
  }

  async deleteBooking(id: string): Promise<boolean> {
    if (!this.client) {
      const prevLen = this.memBookings.length;
      this.memBookings = this.memBookings.filter((b) => b.id !== id);
      return this.memBookings.length < prevLen;
    }

    await this.ensureInitialized();
    const res = await this.client.execute({
      sql: 'DELETE FROM bookings WHERE id = ?',
      args: [id],
    });
    return res.rowsAffected > 0;
  }

  async clearAllBookings(): Promise<void> {
    if (!this.client) {
      this.memBookings = [];
      return;
    }
    await this.ensureInitialized();
    await this.client.execute('DELETE FROM bookings');
  }

  async resetToDemoSchedule(): Promise<{
    seededCount: number;
    blockedConflicts: number;
    caughtErrors: number;
    totalDatasetItems: number;
  }> {
    if (!this.client) {
      this.memBookings = [];
      const dataset = readDatasetSafe();
      let seededCount = 0;
      let blockedConflicts = 0;
      let caughtErrors = 0;

      for (const item of dataset) {
        const res = this.createBookingAtomicSync(item);
        if (res.status === 'BOOKED') {
          seededCount += 1;
        } else if (res.status === 'CONFLICT') {
          blockedConflicts += 1;
        } else if (res.status === 'VALIDATION_ERROR') {
          caughtErrors += 1;
        }
      }
      return {
        seededCount,
        blockedConflicts,
        caughtErrors,
        totalDatasetItems: dataset.length,
      };
    }

    await this.ensureInitialized();
    await this.client.execute('DELETE FROM bookings');
    return this.seedDemoBookingsBatch();
  }

  close(): void {
    if (this.client) {
      this.client.close();
    }
  }
}
