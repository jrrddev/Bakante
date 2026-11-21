import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
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
import { BASELINE_DIR } from './paths.ts';

/**
 * Loads the official ISATU facility list from baseline/facilities.json.
 */
export function loadFacilitiesFromFile(): Facility[] {
  const filePath = path.join(BASELINE_DIR, 'facilities.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Facility[];
}

/**
 * Simple SQLite wrapper powered by Node 24's built-in `node:sqlite`.
 *
 * Key design choices:
 * 1. Composite index `(facility_id, date, start_min)` keeps each room's bookings
 *    sorted by start time so Binary Search works cleanly.
 * 2. `BEGIN IMMEDIATE` locks writes during check-and-insert so two users cannot
 *    double-book the same room at the exact same millisecond.
 */
export class BakanteDatabase {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    this.db = new DatabaseSync(dbPath);
    this.setupSchema();
    this.seedFacilities(loadFacilitiesFromFile());
  }

  private setupSchema(): void {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        building TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        amenities_json TEXT NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookings (
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
      );

      CREATE INDEX IF NOT EXISTS idx_bookings_facility_date_start
      ON bookings (facility_id, date, start_min);
    `);
  }

  private seedFacilities(facilities: Facility[]): void {
    const validIds = facilities.map((f) => f.id);
    if (validIds.length > 0) {
      const placeholders = validIds.map(() => '?').join(', ');
      this.db
        .prepare(`DELETE FROM bookings WHERE facility_id NOT IN (${placeholders})`)
        .run(...validIds);
      this.db
        .prepare(`DELETE FROM facilities WHERE id NOT IN (${placeholders})`)
        .run(...validIds);
    }

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO facilities
        (id, name, building, capacity, amenities_json, open_time, close_time)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const f of facilities) {
      stmt.run(
        f.id,
        f.name,
        f.building,
        f.capacity,
        JSON.stringify(f.amenities),
        f.openTime,
        f.closeTime
      );
    }
  }

  getFacilities(): Facility[] {
    const rows = this.db
      .prepare('SELECT * FROM facilities ORDER BY building, name')
      .all() as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      building: String(row.building),
      capacity: Number(row.capacity),
      amenities: JSON.parse(String(row.amenities_json)) as string[],
      openTime: String(row.open_time),
      closeTime: String(row.close_time),
    }));
  }

  /**
   * Returns bookings sorted by start_min so Binary Search can inspect them directly.
   */
  getBookings(filters?: { date?: string; facilityId?: string }): Booking[] {
    const clauses: string[] = [];
    const params: string[] = [];

    if (filters?.date) {
      clauses.push('date = ?');
      params.push(filters.date);
    }
    if (filters?.facilityId) {
      clauses.push('facility_id = ?');
      params.push(filters.facilityId);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM bookings ${where} ORDER BY date, facility_id, start_min`)
      .all(...params) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
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

  /**
   * Evaluates a booking request WITHOUT saving it (used for live form previews).
   */
  checkBookingAvailability(request: BookingRequest): BookingEvaluation {
    return this.evaluateRequest(request, false);
  }

  /**
   * Atomically validates, checks for conflicts via Binary Search, and saves if clear.
   * Uses `BEGIN IMMEDIATE` so simultaneous bookings cannot double-book the same slot.
   */
  createBookingAtomic(request: BookingRequest): BookingEvaluation {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.evaluateRequest(request, true);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private evaluateRequest(
    request: BookingRequest,
    saveIfAvailable: boolean
  ): BookingEvaluation {
    const facilities = this.getFacilities();
    const bufferMinutes = request.bufferMinutes ?? 0;

    // STEP 1: Input Gatekeeper O(1)
    const validation = validateBookingRequest(request, facilities);
    if (!validation.isValid || !validation.facility) {
      return {
        status: 'VALIDATION_ERROR',
        message: validation.errors[0] || 'Invalid booking request.',
        validationErrors: validation.errors,
        conflicts: [],
        binarySearchSteps: 0,
        linearScanSteps: 0,
        freeSlotsSameRoom: [],
        alternativeRooms: [],
      };
    }

    const facility = validation.facility;
    const startMin = validation.startMin!;
    const endMin = validation.endMin!;

    // STEP 2: Sorted Binary Search Conflict Check O(log n)
    const roomBookings = this.getBookings({
      date: request.date,
      facilityId: facility.id,
    });

    const conflictCheck = checkConflictBinarySearch(
      roomBookings,
      startMin,
      endMin,
      bufferMinutes
    );

    // STEP 3A: If conflict found, compute free same-room gaps + 100-pt alternative rooms
    if (conflictCheck.hasConflict) {
      const allDayBookings = this.getBookings({ date: request.date });
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
        status: 'CONFLICT',
        message: `Conflict in ${facility.name} on ${request.date}: overlaps with ${conflictDesc}.`,
        validationErrors: [],
        conflicts: conflictCheck.conflicts,
        binarySearchSteps: conflictCheck.binarySearchSteps,
        linearScanSteps: conflictCheck.linearScanSteps,
        freeSlotsSameRoom,
        alternativeRooms,
      };
    }

    // Dry-run check stops here without saving
    if (!saveIfAvailable) {
      return {
        status: 'AVAILABLE',
        message: `${facility.name} is available from ${request.startTime} to ${request.endTime}.`,
        validationErrors: [],
        conflicts: [],
        binarySearchSteps: conflictCheck.binarySearchSteps,
        linearScanSteps: conflictCheck.linearScanSteps,
        freeSlotsSameRoom: [],
        alternativeRooms: [],
      };
    }

    // STEP 3B: Save confirmed booking
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

    this.db
      .prepare(
        `INSERT INTO bookings
          (id, facility_id, date, start_time, end_time, start_min, end_min,
           requester_name, office, event_title, attendees, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
        newBooking.createdAt
      );

    return {
      status: 'BOOKED',
      message: `Confirmed booking for ${facility.name} (${newBooking.startTime}–${newBooking.endTime}).`,
      booking: newBooking,
      validationErrors: [],
      conflicts: [],
      binarySearchSteps: conflictCheck.binarySearchSteps,
      linearScanSteps: conflictCheck.linearScanSteps,
      freeSlotsSameRoom: [],
      alternativeRooms: [],
    };
  }

  deleteBooking(id: string): boolean {
    const info = this.db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
    return info.changes > 0;
  }

  clearAllBookings(): void {
    this.db.exec('DELETE FROM bookings');
  }

  /**
   * Seeds realistic demo bookings for the live calendar (only the valid sample bookings).
   */
  resetToDemoSchedule(): number {
    this.clearAllBookings();
    const datasetPath = path.join(BASELINE_DIR, 'dataset.json');
    const dataset = JSON.parse(fs.readFileSync(datasetPath, 'utf-8')) as Array<
      BookingRequest & { expectedOutcome: string }
    >;

    let seeded = 0;
    for (const item of dataset) {
      if (item.expectedOutcome === 'BOOKED') {
        const res = this.createBookingAtomic(item);
        if (res.status === 'BOOKED') {
          seeded += 1;
        }
      }
    }
    return seeded;
  }

  close(): void {
    this.db.close();
  }
}
