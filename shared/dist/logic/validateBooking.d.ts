import type { BookingRequest, Facility, ValidationResult } from '../types.ts';
/**
 * STEP 1: Input Gatekeeper (O(1) constant time)
 *
 * Checks every required field and business rule BEFORE touching the schedule.
 * This stops incomplete rows, room-name typos, inverted times, and overcrowding
 * from ever entering the system -> 0% Error Rate.
 */
export declare function validateBookingRequest(request: BookingRequest, facilities: Facility[]): ValidationResult;
