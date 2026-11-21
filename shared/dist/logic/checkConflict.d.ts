import type { Booking, ConflictCheckResult } from '../types.ts';
/**
 * STEP 2: Fast Conflict Checker using Binary Search — O(log n)
 *
 * Precondition: `sortedBookings` MUST be sorted in ascending order by `startMin`
 * (our SQLite index `idx_bookings_facility_date_start` guarantees this automatically).
 *
 * Why Binary Search is better than a manual spreadsheet scan:
 * - A manual operator reads every row from top to bottom: O(n) comparisons.
 * - Binary Search jumps straight to the requested start time in log2(n) steps,
 *   then checks only the immediate neighbors that could possibly overlap.
 */
export declare function checkConflictBinarySearch(sortedBookings: Booking[], requestedStartMin: number, requestedEndMin: number, bufferMinutes?: number): ConflictCheckResult;
