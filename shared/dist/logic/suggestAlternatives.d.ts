import type { AlternativeRoom, Booking, Facility, FreeTimeSlot } from '../types.ts';
/**
 * STEP 3A: Find Open Time Gaps on the Same Facility
 *
 * Scans the day from openTime (e.g. 07:00) to closeTime (e.g. 21:00)
 * around already-booked slots and returns gaps long enough to fit `durationMin`.
 * Results are sorted by whichever slot starts closest to the user's preferred time.
 */
export declare function findFreeSlotsOnSameRoom(facility: Facility, sortedBookings: Booking[], preferredStartMin: number, durationMin: number, bufferMinutes?: number): FreeTimeSlot[];
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
export declare function suggestAlternativeRooms(params: {
    requestedFacility: Facility;
    allFacilities: Facility[];
    bookingsByFacility: Record<string, Booking[]>;
    startMin: number;
    endMin: number;
    attendees: number;
    requiredAmenities?: string[];
    bufferMinutes?: number;
}): AlternativeRoom[];
