/**
 * Simple time helpers for converting "HH:MM" strings into plain numbers (minutes from midnight).
 * Using integer minutes makes sorting and overlap math exact and easy to read.
 */
/**
 * Converts a 24-hour time string like "09:30" into minutes from midnight (570).
 * Returns null if the format is invalid.
 */
export function timeToMinutes(timeStr) {
    if (typeof timeStr !== 'string') {
        return null;
    }
    const trimmed = timeStr.trim();
    const match = /^(\d{2}):(\d{2})$/.exec(trimmed);
    if (!match) {
        return null;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
}
/**
 * Converts minutes from midnight (e.g. 570) back into "09:30".
 */
export function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    return `${hh}:${mm}`;
}
/**
 * Checks whether two half-open time ranges [startA, endA) and [startB, endB) overlap.
 *
 * Why this formula works:
 * Two bookings overlap ONLY IF each booking starts before the other one finishes.
 * Back-to-back bookings like 09:00-11:00 and 11:00-13:00 do NOT overlap because
 * 11:00 < 11:00 is false.
 */
export function doTimesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}
/**
 * Checks whether a date string is in valid "YYYY-MM-DD" format.
 */
export function isValidDateFormat(dateStr) {
    if (typeof dateStr !== 'string') {
        return false;
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim());
}
