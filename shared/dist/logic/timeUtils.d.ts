/**
 * Simple time helpers for converting "HH:MM" strings into plain numbers (minutes from midnight).
 * Using integer minutes makes sorting and overlap math exact and easy to read.
 */
/**
 * Converts a 24-hour time string like "09:30" into minutes from midnight (570).
 * Returns null if the format is invalid.
 */
export declare function timeToMinutes(timeStr: string): number | null;
/**
 * Converts minutes from midnight (e.g. 570) back into "09:30".
 */
export declare function minutesToTime(totalMinutes: number): string;
/**
 * Checks whether two half-open time ranges [startA, endA) and [startB, endB) overlap.
 *
 * Why this formula works:
 * Two bookings overlap ONLY IF each booking starts before the other one finishes.
 * Back-to-back bookings like 09:00-11:00 and 11:00-13:00 do NOT overlap because
 * 11:00 < 11:00 is false.
 */
export declare function doTimesOverlap(startA: number, endA: number, startB: number, endB: number): boolean;
/**
 * Checks whether a date string is in valid "YYYY-MM-DD" format.
 */
export declare function isValidDateFormat(dateStr: string): boolean;
