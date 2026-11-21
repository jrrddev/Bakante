/**
 * Core data shapes used across the Bakante backend, frontend, and tests.
 */
export interface Facility {
    id: string;
    name: string;
    building: string;
    capacity: number;
    amenities: string[];
    openTime: string;
    closeTime: string;
}
export interface Booking {
    id: string;
    facilityId: string;
    date: string;
    startTime: string;
    endTime: string;
    startMin: number;
    endMin: number;
    requesterName: string;
    office: string;
    eventTitle: string;
    attendees: number;
    createdAt: string;
}
export interface BookingRequest {
    facilityId: string;
    date: string;
    startTime: string;
    endTime: string;
    requesterName: string;
    office: string;
    eventTitle: string;
    attendees: number;
    requiredAmenities?: string[];
    bufferMinutes?: number;
}
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    facility?: Facility;
    startMin?: number;
    endMin?: number;
}
export interface ConflictCheckResult {
    hasConflict: boolean;
    conflicts: Booking[];
    /** Number of bookings inspected using Binary Search O(log n) */
    binarySearchSteps: number;
    /** Number of bookings a manual spreadsheet scan would inspect O(n) */
    linearScanSteps: number;
}
export interface FreeTimeSlot {
    startTime: string;
    endTime: string;
    startMin: number;
    endMin: number;
    distanceMinutes: number;
}
export interface AlternativeRoom {
    facility: Facility;
    totalScore: number;
    capacityScore: number;
    amenityScore: number;
    buildingScore: number;
    matchedAmenities: string[];
}
export interface BookingEvaluation {
    status: 'BOOKED' | 'AVAILABLE' | 'CONFLICT' | 'VALIDATION_ERROR';
    message: string;
    booking?: Booking;
    validationErrors: string[];
    conflicts: Booking[];
    binarySearchSteps: number;
    linearScanSteps: number;
    freeSlotsSameRoom: FreeTimeSlot[];
    alternativeRooms: AlternativeRoom[];
}
export interface DatasetItem extends BookingRequest {
    requestId: string;
    expectedOutcome: 'BOOKED' | 'CONFLICT' | 'VALIDATION_ERROR';
    scenarioNote: string;
}
export interface ManualBaselineResults {
    isPlaceholder: boolean;
    recordedBy: string;
    recordedAt: string;
    totalRequests: number;
    totalTimeSeconds: number;
    conflictsMissedCount: number;
    errorsAdmittedCount: number;
    notes: string;
}
export interface ReplayItemResult {
    requestId: string;
    facilityId: string;
    date: string;
    timeRange: string;
    eventTitle: string;
    expectedOutcome: 'BOOKED' | 'CONFLICT' | 'VALIDATION_ERROR';
    actualOutcome: 'BOOKED' | 'CONFLICT' | 'VALIDATION_ERROR';
    matchedExpectation: boolean;
    durationMs: number;
    binarySearchSteps: number;
    linearScanSteps: number;
    summary: string;
    suggestedRoomId?: string;
}
export interface ScorecardRow {
    metric: string;
    baselineDisplay: string;
    newSystemDisplay: string;
    improvementDisplay: string;
    improvementPercent: number | null;
    testMethod: string;
}
export interface BenchmarkSummary {
    ranAt: string;
    sourceLabel: string;
    totalRequests: number;
    bookedCount: number;
    conflictBlockedCount: number;
    errorCaughtCount: number;
    totalSystemTimeMs: number;
    avgSystemTimeMs: number;
    bakanteManualTimeSeconds: number;
    bakanteManualImprovementPercent: number | null;
    totalBinarySearchSteps: number;
    totalLinearScanSteps: number;
    allMatchedExpectations: boolean;
    manualBaseline: ManualBaselineResults;
    scorecard: ScorecardRow[];
    items: ReplayItemResult[];
}
