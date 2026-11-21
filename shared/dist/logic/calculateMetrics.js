export const BAKANTE_MANUAL_SECONDS_PER_REQUEST = 6.0; // 120s for 20 single-form UI bookings
/**
 * Official Tech4ISATU Hackathon Section 9.1 Formula:
 *   % Improvement = |Baseline - New| / Baseline * 100
 *
 * Returns null when Baseline is 0 (guideline rule: report qualitative gain instead).
 * Caps strictly positive non-zero values (e.g. milliseconds vs. 360s) at 99.99%
 * so we never falsely report 100.00% improvement when processing time > 0.
 */
export function calculateImprovementPercent(baselineValue, newValue) {
    if (baselineValue <= 0) {
        return null;
    }
    const rawPercent = (Math.abs(baselineValue - newValue) / baselineValue) * 100;
    const rounded = Number(rawPercent.toFixed(2));
    if (newValue > 0 && newValue < baselineValue && rounded >= 100) {
        return 99.99;
    }
    return rounded;
}
/**
 * Builds the official 3-row Section 9.4 Metrics Scorecard:
 *   1. Processing Time (3-way: Manual Walk-In vs. Bakante Manual Form vs. Bakante Batch Import)
 *   2. Duplicate / Conflict Rate
 *   3. Error Rate
 */
export function buildMetricsScorecard(params) {
    const { manual, systemTotalMs, systemConflictsAdmitted, systemErrorsAdmitted, totalRequests, } = params;
    const safeTotal = Math.max(1, totalRequests);
    const bakanteManualSeconds = params.bakanteManualTimeSeconds ??
        Number((safeTotal * BAKANTE_MANUAL_SECONDS_PER_REQUEST).toFixed(1));
    const systemTotalSeconds = systemTotalMs / 1000;
    const manualUiImprovement = calculateImprovementPercent(manual.totalTimeSeconds, bakanteManualSeconds);
    const batchImprovement = calculateImprovementPercent(manual.totalTimeSeconds, systemTotalSeconds);
    const manualConflictRate = (manual.conflictsMissedCount / safeTotal) * 100;
    const systemConflictRate = (systemConflictsAdmitted / safeTotal) * 100;
    const conflictImprovement = calculateImprovementPercent(manualConflictRate, systemConflictRate);
    const manualErrorRate = (manual.errorsAdmittedCount / safeTotal) * 100;
    const systemErrorRate = (systemErrorsAdmitted / safeTotal) * 100;
    const errorImprovement = calculateImprovementPercent(manualErrorRate, systemErrorRate);
    return [
        {
            metric: `Processing Time (${safeTotal} requests)`,
            baselineDisplay: `${manual.totalTimeSeconds.toFixed(1)} sec (${(manual.totalTimeSeconds / safeTotal).toFixed(1)} s/req walk-in)`,
            newSystemDisplay: `Manual form: ${bakanteManualSeconds.toFixed(1)} sec (${(bakanteManualSeconds / safeTotal).toFixed(1)} s/req) · Batch: ${systemTotalSeconds.toFixed(4)} sec (${(systemTotalMs / safeTotal).toFixed(2)} ms/req)`,
            improvementDisplay: manualUiImprovement !== null && batchImprovement !== null
                ? `${manualUiImprovement.toFixed(2)}% (manual) · ${batchImprovement.toFixed(2)}% (batch)`
                : 'N/A',
            improvementPercent: batchImprovement,
            testMethod: 'Timed 20 requests: Walk-in (360s) vs. Bakante form vs. Excel upload',
        },
        {
            metric: 'Duplicate / Conflict Rate',
            baselineDisplay: `${manualConflictRate.toFixed(1)}% (${manual.conflictsMissedCount}/${safeTotal} in unvalidated sheet)`,
            newSystemDisplay: `${systemConflictRate.toFixed(1)}% (${systemConflictsAdmitted}/${safeTotal} admitted)`,
            improvementDisplay: conflictImprovement !== null
                ? `${conflictImprovement.toFixed(1)}% reduction`
                : '0 -> 0 (already optimal)',
            improvementPercent: conflictImprovement,
            testMethod: 'Counted how many overlapping bookings were allowed',
        },
        {
            metric: 'Error Rate (invalid data)',
            baselineDisplay: `${manualErrorRate.toFixed(1)}% (${manual.errorsAdmittedCount}/${safeTotal} in unvalidated sheet)`,
            newSystemDisplay: `${systemErrorRate.toFixed(1)}% (${systemErrorsAdmitted}/${safeTotal} admitted)`,
            improvementDisplay: errorImprovement !== null
                ? `${errorImprovement.toFixed(1)}% reduction`
                : '0 -> 0 (already optimal)',
            improvementPercent: errorImprovement,
            testMethod: 'Counted how many invalid entries (typos, bad times, over-capacity) were allowed',
        },
    ];
}
