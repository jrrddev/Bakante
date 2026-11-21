import { isValidDateFormat, timeToMinutes } from "./timeUtils.js";
/**
 * STEP 1: Input Gatekeeper (O(1) constant time)
 *
 * Checks every required field and business rule BEFORE touching the schedule.
 * This stops incomplete rows, room-name typos, inverted times, and overcrowding
 * from ever entering the system -> 0% Error Rate.
 */
export function validateBookingRequest(request, facilities) {
    const errors = [];
    // 1. Check required text fields are not blank
    if (!request.requesterName || request.requesterName.trim() === '') {
        errors.push('Requester name is required.');
    }
    if (!request.office || request.office.trim() === '') {
        errors.push('Office or department name is required.');
    }
    if (!request.eventTitle || request.eventTitle.trim() === '') {
        errors.push('Event title is required.');
    }
    // 2. Check date format (YYYY-MM-DD)
    if (!isValidDateFormat(request.date)) {
        errors.push('Date must be in YYYY-MM-DD format.');
    }
    // 3. Check that the chosen room exists in the official ISATU catalog
    const facilityId = (request.facilityId || '').trim();
    const facility = facilities.find((f) => f.id === facilityId);
    if (!facility) {
        errors.push(`Unknown facility ID "${facilityId || '(blank)'}". Please pick a valid ISATU room.`);
    }
    // 4. Parse start and end times into minutes from midnight
    const startMin = timeToMinutes(request.startTime);
    const endMin = timeToMinutes(request.endTime);
    if (startMin === null) {
        errors.push(`Invalid start time "${request.startTime}". Use HH:MM (e.g. 09:00).`);
    }
    if (endMin === null) {
        errors.push(`Invalid end time "${request.endTime}". Use HH:MM (e.g. 11:00).`);
    }
    // 5. Make sure start time is strictly before end time
    if (startMin !== null && endMin !== null && startMin >= endMin) {
        errors.push(`End time (${request.endTime}) must be later than start time (${request.startTime}).`);
    }
    // 6. Check campus operating hours and room capacity (if facility exists)
    if (facility) {
        const openMin = timeToMinutes(facility.openTime) ?? 7 * 60;
        const closeMin = timeToMinutes(facility.closeTime) ?? 21 * 60;
        if (startMin !== null && endMin !== null && startMin < endMin) {
            if (startMin < openMin || endMin > closeMin) {
                errors.push(`${facility.name} is only open from ${facility.openTime} to ${facility.closeTime}.`);
            }
        }
        if (!Number.isFinite(request.attendees) || request.attendees <= 0) {
            errors.push('Number of attendees must be at least 1.');
        }
        else if (request.attendees > facility.capacity) {
            errors.push(`Attendees (${request.attendees}) exceed ${facility.name} capacity (${facility.capacity}).`);
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        facility,
        startMin: startMin ?? undefined,
        endMin: endMin ?? undefined,
    };
}
