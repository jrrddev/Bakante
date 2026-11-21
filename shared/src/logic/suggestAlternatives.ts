import type { AlternativeRoom, Booking, Facility, FreeTimeSlot } from '../types.ts';
import { checkConflictBinarySearch } from './checkConflict.ts';
import { minutesToTime, timeToMinutes } from './timeUtils.ts';

/**
 * STEP 3A: Find Open Time Gaps on the Same Facility
 *
 * Scans the day from openTime (e.g. 07:00) to closeTime (e.g. 21:00)
 * around already-booked slots and returns gaps long enough to fit `durationMin`.
 * Results are sorted by whichever slot starts closest to the user's preferred time.
 */
export function findFreeSlotsOnSameRoom(
  facility: Facility,
  sortedBookings: Booking[],
  preferredStartMin: number,
  durationMin: number,
  bufferMinutes = 0
): FreeTimeSlot[] {
  const openMin = timeToMinutes(facility.openTime) ?? 3 * 60;
  const closeMin = timeToMinutes(facility.closeTime) ?? 23 * 60;
  const slots: FreeTimeSlot[] = [];

  // Track the earliest minute currently free
  let cursorMin = openMin;

  for (const booking of sortedBookings) {
    const gapEnd = booking.startMin - bufferMinutes;
    if (gapEnd - cursorMin >= durationMin) {
      slots.push({
        startTime: minutesToTime(cursorMin),
        endTime: minutesToTime(cursorMin + durationMin),
        startMin: cursorMin,
        endMin: cursorMin + durationMin,
        distanceMinutes: Math.abs(cursorMin - preferredStartMin),
      });
    }
    cursorMin = Math.max(cursorMin, booking.endMin + bufferMinutes);
  }

  // Check remaining open window after the last booking of the day
  if (closeMin - cursorMin >= durationMin) {
    slots.push({
      startTime: minutesToTime(cursorMin),
      endTime: minutesToTime(cursorMin + durationMin),
      startMin: cursorMin,
      endMin: cursorMin + durationMin,
      distanceMinutes: Math.abs(cursorMin - preferredStartMin),
    });
  }

  slots.sort((a, b) => a.distanceMinutes - b.distanceMinutes);
  return slots.slice(0, 3);
}

/**
 * STEP 3B: Rank Alternative Rooms Using a Transparent 100-Point Best-Fit Score
 *
 * Breakdown:
 * - Capacity Fit (45 pts): 45 * (attendees / room.capacity)
 *   Rewards rooms that fit tightly so a 30-person meeting does not waste a 500-seat auditorium.
 * - Equipment Match (35 pts): 35 * (matchedAmenities / requestedAmenities)
 *   Rewards rooms that have the requested Projector, Sound System, or Lab PCs.
 * - Same Building Bonus (20 pts): +20 if the alternative is in the same building.
 */
export function suggestAlternativeRooms(params: {
  requestedFacility: Facility;
  allFacilities: Facility[];
  bookingsByFacility: Record<string, Booking[]>;
  startMin: number;
  endMin: number;
  attendees: number;
  requiredAmenities?: string[];
  bufferMinutes?: number;
}): AlternativeRoom[] {
  const {
    requestedFacility,
    allFacilities,
    bookingsByFacility,
    startMin,
    endMin,
    attendees,
    requiredAmenities = [],
    bufferMinutes = 0,
  } = params;

  const alternatives: AlternativeRoom[] = [];

  for (const candidate of allFacilities) {
    if (candidate.id === requestedFacility.id) {
      continue;
    }

    // Must be big enough for the requested attendees
    if (candidate.capacity < attendees) {
      continue;
    }

    // Must be within this room's operating hours
    const openMin = timeToMinutes(candidate.openTime) ?? 3 * 60;
    const closeMin = timeToMinutes(candidate.closeTime) ?? 23 * 60;
    if (startMin < openMin || endMin > closeMin) {
      continue;
    }

    // Must have zero time conflicts for [startMin, endMin)
    const roomBookings = bookingsByFacility[candidate.id] || [];
    const conflictCheck = checkConflictBinarySearch(
      roomBookings,
      startMin,
      endMin,
      bufferMinutes
    );
    if (conflictCheck.hasConflict) {
      continue;
    }

    // Calculate transparent 100-point Best-Fit score
    const capacityScore = Math.round(45 * (attendees / candidate.capacity));

    const matchedAmenities = requiredAmenities.filter((item) =>
      candidate.amenities.includes(item)
    );
    const amenityScore =
      requiredAmenities.length === 0
        ? 35
        : Math.round(35 * (matchedAmenities.length / requiredAmenities.length));

    const buildingScore = candidate.building === requestedFacility.building ? 20 : 0;
    const totalScore = capacityScore + amenityScore + buildingScore;

    alternatives.push({
      facility: candidate,
      totalScore,
      capacityScore,
      amenityScore,
      buildingScore,
      matchedAmenities,
    });
  }

  // Sort highest score first
  alternatives.sort((a, b) => b.totalScore - a.totalScore);
  return alternatives.slice(0, 4);
}
