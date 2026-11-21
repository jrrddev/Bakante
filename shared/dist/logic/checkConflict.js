import { doTimesOverlap } from "./timeUtils.js";
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
export function checkConflictBinarySearch(sortedBookings, requestedStartMin, requestedEndMin, bufferMinutes = 0) {
    const n = sortedBookings.length;
    if (n === 0) {
        return {
            hasConflict: false,
            conflicts: [],
            binarySearchSteps: 0,
            linearScanSteps: 0,
        };
    }
    const effectiveEndMin = requestedEndMin + bufferMinutes;
    let steps = 0;
    // Binary search for the first booking whose startMin >= requestedStartMin
    let low = 0;
    let high = n - 1;
    let firstAfterIndex = n;
    while (low <= high) {
        steps += 1;
        const mid = Math.floor((low + high) / 2);
        if (sortedBookings[mid].startMin >= requestedStartMin) {
            firstAfterIndex = mid;
            high = mid - 1;
        }
        else {
            low = mid + 1;
        }
    }
    const conflicts = [];
    // Check the booking immediately BEFORE `firstAfterIndex` (it started earlier,
    // so it might still be running past `requestedStartMin`).
    if (firstAfterIndex > 0) {
        steps += 1;
        const previousBooking = sortedBookings[firstAfterIndex - 1];
        if (doTimesOverlap(requestedStartMin, effectiveEndMin, previousBooking.startMin, previousBooking.endMin + bufferMinutes)) {
            conflicts.push(previousBooking);
        }
    }
    // Check bookings starting AT OR AFTER `requestedStartMin` while they start
    // before our requested booking finishes.
    for (let i = firstAfterIndex; i < n; i++) {
        steps += 1;
        const candidate = sortedBookings[i];
        if (candidate.startMin >= effectiveEndMin) {
            // Because the array is sorted, no later booking can possibly overlap. Stop early!
            break;
        }
        if (doTimesOverlap(requestedStartMin, effectiveEndMin, candidate.startMin, candidate.endMin + bufferMinutes)) {
            conflicts.push(candidate);
        }
    }
    return {
        hasConflict: conflicts.length > 0,
        conflicts,
        binarySearchSteps: steps,
        linearScanSteps: n,
    };
}
