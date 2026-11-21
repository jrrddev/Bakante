import type { ManualBaselineResults, ScorecardRow } from '../types.ts';
export declare const BAKANTE_MANUAL_SECONDS_PER_REQUEST = 6;
/**
 * Official Tech4ISATU Hackathon Section 9.1 Formula:
 *   % Improvement = |Baseline - New| / Baseline * 100
 *
 * Returns null when Baseline is 0 (guideline rule: report qualitative gain instead).
 * Caps strictly positive non-zero values (e.g. milliseconds vs. 360s) at 99.99%
 * so we never falsely report 100.00% improvement when processing time > 0.
 */
export declare function calculateImprovementPercent(baselineValue: number, newValue: number): number | null;
/**
 * Builds the official 3-row Section 9.4 Metrics Scorecard:
 *   1. Processing Time (3-way: Manual Walk-In vs. Bakante Manual Form vs. Bakante Batch Import)
 *   2. Duplicate / Conflict Rate
 *   3. Error Rate
 */
export declare function buildMetricsScorecard(params: {
    manual: ManualBaselineResults;
    systemTotalMs: number;
    bakanteManualTimeSeconds?: number;
    systemConflictsAdmitted: number;
    systemErrorsAdmitted: number;
    totalRequests: number;
}): ScorecardRow[];
