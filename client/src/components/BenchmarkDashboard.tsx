import { useEffect, useRef, useState } from 'react';
import type { BenchmarkSummary, BookingRequest } from '@bakante/shared';
import * as XLSX from 'xlsx';
import { api } from '../api.ts';

type AuditFilter = 'ALL' | 'BOOKED' | 'CONFLICT' | 'VALIDATION_ERROR';

type ParsedImportRow = BookingRequest & {
  requestId?: string;
  expectedOutcome?: string;
};

/**
 * Normalizes spreadsheet column names (supports both dataset.csv headers
 * and manual_log_template.csv headers).
 */
function mapSpreadsheetRow(raw: Record<string, unknown>, index: number): ParsedImportRow {
  const getString = (...keys: string[]): string => {
    for (const key of keys) {
      const val = raw[key];
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
    return '';
  };

  const amenitiesText = getString('requiredAmenities', 'Required_Amenities', 'amenities');
  const requiredAmenities = amenitiesText
    ? amenitiesText
        .split(/[|,]/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return {
    requestId: getString('requestId', 'Request_ID') || `ROW-${String(index + 1).padStart(2, '0')}`,
    facilityId: getString('facilityId', 'Room_ID', 'facility'),
    date: getString('date', 'Date'),
    startTime: getString('startTime', 'Start_Time'),
    endTime: getString('endTime', 'End_Time'),
    requesterName: getString('requesterName', 'Requester'),
    office: getString('office', 'Office'),
    eventTitle: getString('eventTitle', 'Event_Title'),
    attendees: Number(raw.attendees ?? raw.Attendees ?? 0),
    requiredAmenities,
    expectedOutcome: getString('expectedOutcome') || undefined,
  };
}

export function BenchmarkDashboard() {
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [commitToLiveSchedule, setCommitToLiveSchedule] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);
  const [auditFilter, setAuditFilter] = useState<AuditFilter>('ALL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    handleRunReplay();
  }, []);

  async function handleRunReplay() {
    setIsRunning(true);
    setImportError(null);
    try {
      const replay = await api.runBenchmarkReplay();
      setSummary(replay);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsRunning(true);
    setImportError(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
        defval: '',
      });

      if (rawRows.length === 0) {
        setImportError('The selected spreadsheet has no data rows.');
        return;
      }

      const mappedRows = rawRows.map(mapSpreadsheetRow);
      const result = await api.importSpreadsheetBatch({
        fileName: file.name,
        rows: mappedRows,
        commitToLiveSchedule,
      });
      setSummary(result);
    } catch {
      setImportError('Could not read spreadsheet. Please upload a valid .xlsx, .xls, or .csv file.');
    } finally {
      setIsRunning(false);
    }
  }

  async function handleDownloadSampleXlsx() {
    const { dataset } = await api.getBaseline();
    const exportRows = dataset.map((item) => ({
      requestId: item.requestId,
      facilityId: item.facilityId,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      requesterName: item.requesterName,
      office: item.office,
      eventTitle: item.eventTitle,
      attendees: item.attendees,
      requiredAmenities: (item.requiredAmenities ?? []).join('|'),
      expectedOutcome: item.expectedOutcome,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Bookings');
    XLSX.writeFile(workbook, 'bakante_sample_20_requests.xlsx');
  }

  async function handleCopyMarkdown() {
    if (!summary) return;
    const rows = summary.scorecard
      .map(
        (r) =>
          `| ${r.metric} | ${r.baselineDisplay} | ${r.newSystemDisplay} | **${r.improvementDisplay}** | ${r.testMethod} |`
      )
      .join('\n');
    const md = [
      '| Metric | Baseline (Manual) | New System (Bakante) | % Improvement | Test Method |',
      '|---|---|---|---|---|',
      rows,
    ].join('\n');

    await navigator.clipboard.writeText(md);
    setCopiedMarkdown(true);
    setTimeout(() => setCopiedMarkdown(false), 2500);
  }

  if (!summary) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="h-8 w-56 rounded bg-slate-200" />
          <div className="flex gap-2">
            <div className="h-8 w-36 rounded bg-slate-200" />
            <div className="h-8 w-36 rounded bg-slate-200" />
            <div className="h-8 w-36 rounded bg-slate-200" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-5 space-y-2">
              <div className="h-3 w-28 rounded bg-slate-200" />
              <div className="h-7 w-24 rounded bg-slate-200" />
              <div className="h-3 w-32 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div className="h-4 w-64 rounded bg-slate-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2.5">
                <div className="h-3 w-32 rounded bg-slate-200" />
                <div className="h-2 w-full rounded-full bg-slate-200" />
                <div className="h-2 w-2/3 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-full rounded bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const manual = summary.manualBaseline;
  const totalReq = Math.max(1, summary.totalRequests);
  const filteredItems =
    auditFilter === 'ALL'
      ? summary.items
      : summary.items.filter((item) => item.actualOutcome === auditFilter);

  const manualConflictPct = (manual.conflictsMissedCount / totalReq) * 100;
  const manualErrorPct = (manual.errorsAdmittedCount / totalReq) * 100;

  return (
    <div className="space-y-8">
      {/* Header + Excel/CSV Batch Import Controls */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Baseline &amp; Scorecard
          </h2>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelected}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleDownloadSampleXlsx}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Download sample .xlsx
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRunning}
              className="rounded-md border border-blue-700 bg-white px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 cursor-pointer"
            >
              Import Excel / CSV
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              {copiedMarkdown ? 'Copied Markdown' : 'Copy Markdown'}
            </button>
            <button
              type="button"
              onClick={handleRunReplay}
              disabled={isRunning}
              className="rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? 'Running...' : 'Run 20-request replay'}
            </button>
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={commitToLiveSchedule}
              onChange={(e) => setCommitToLiveSchedule(e.target.checked)}
              className="rounded border-slate-300 text-blue-700"
            />
            Also save valid imported rows to live Schedule
          </label>
        </div>
      </div>

      {importError && (
        <div className="rounded-md border border-red-200 border-l-[3px] border-l-red-600 bg-red-50/70 px-4 py-3 text-xs font-medium text-red-800">
          {importError}
        </div>
      )}

      {/* High-Contrast 4-Column Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Processing time (3-way)</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-blue-700 tabular-nums">
            {summary.totalSystemTimeMs.toFixed(2)} ms
          </div>
          <div className="mt-0.5 text-xs text-slate-500 tabular-nums">
            Batch · {summary.bakanteManualTimeSeconds.toFixed(0)}s Bakante manual ·{' '}
            {manual.totalTimeSeconds.toFixed(0)}s walk-in
          </div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Valid bookings saved</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
            {summary.bookedCount} / {summary.totalRequests}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">Includes back-to-back</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Conflicts blocked</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
            {summary.conflictBlockedCount} ({manualConflictPct.toFixed(1)}% manual rate)
          </div>
          <div className="mt-0.5 text-xs text-slate-500">0% double-bookings admitted</div>
        </div>
        <div className="p-5">
          <div className="text-xs font-medium text-slate-500">Invalid errors caught</div>
          <div className="mt-1 text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
            {summary.errorCaughtCount} ({manualErrorPct.toFixed(1)}% manual rate)
          </div>
          <div className="mt-0.5 text-xs text-slate-500">0% invalid entries admitted</div>
        </div>
      </div>

      {/* High-Contrast Comparison Bars */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900">
          3-way Processing Time &amp; Accuracy Comparison (lower is better)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Processing time (3 modes)
            </div>
            <div className="space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>1. Manual walk-in</span>
                <span>{manual.totalTimeSeconds.toFixed(1)} s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-full w-full rounded-full bg-slate-400" />
              </div>

              <div className="flex justify-between font-medium text-slate-800">
                <span>2. Bakante manual (form)</span>
                <span>
                  {summary.bakanteManualTimeSeconds.toFixed(1)} s (
                  {summary.bakanteManualImprovementPercent?.toFixed(1)}% faster)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        4,
                        (summary.bakanteManualTimeSeconds / Math.max(1, manual.totalTimeSeconds)) *
                          100
                      )
                    )}%`,
                  }}
                  className="h-full rounded-full bg-blue-400"
                />
              </div>

              <div className="flex justify-between font-semibold text-blue-700">
                <span>3. Bakante batch (Excel/CSV)</span>
                <span>{(summary.totalSystemTimeMs / 1000).toFixed(4)} s</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div className="h-full w-1 rounded-full bg-blue-700" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">Conflict rate</div>
            <div className="space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Unvalidated sheet ({manual.conflictsMissedCount}/{totalReq})</span>
                <span>{manualConflictPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  style={{ width: `${Math.min(100, Math.max(4, manualConflictPct))}%` }}
                  className="h-full rounded-full bg-slate-400"
                />
              </div>
              <div className="flex justify-between font-semibold text-blue-700">
                <span>Bakante (0/{totalReq})</span>
                <span>0.0%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700">Error rate</div>
            <div className="space-y-1.5 text-xs tabular-nums">
              <div className="flex justify-between text-slate-600">
                <span>Unvalidated sheet ({manual.errorsAdmittedCount}/{totalReq})</span>
                <span>{manualErrorPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100">
                <div
                  style={{ width: `${Math.min(100, Math.max(4, manualErrorPct))}%` }}
                  className="h-full rounded-full bg-slate-400"
                />
              </div>
              <div className="flex justify-between font-semibold text-blue-700">
                <span>Bakante (0/{totalReq})</span>
                <span>0.0%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Official Section 9.4 Table */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5">
          <h3 className="text-sm font-bold text-slate-900">
            Official Metrics Scorecard (Section 9.4)
          </h3>
          <span className="text-xs text-slate-500">
            Formula: |Baseline − New| ÷ Baseline × 100
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100/80 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-3">Metric</th>
                <th className="px-5 py-3">Baseline (Manual)</th>
                <th className="px-5 py-3">Bakante</th>
                <th className="px-5 py-3">% Improvement</th>
                <th className="px-5 py-3">Test Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.scorecard.map((row) => (
                <tr key={row.metric} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {row.metric}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 tabular-nums">
                    {row.baselineDisplay}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-blue-700 tabular-nums">
                    {row.newSystemDisplay}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-emerald-700 tabular-nums">
                    {row.improvementDisplay}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{row.testMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Audit Log */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-bold text-slate-900">
            Batch Import Audit Log ({summary.totalRequests} rows)
          </h3>
          <div className="flex flex-wrap gap-4 text-xs">
            {(
              [
                ['ALL', `All (${summary.totalRequests})`],
                ['BOOKED', `Booked (${summary.bookedCount})`],
                ['CONFLICT', `Conflicts (${summary.conflictBlockedCount})`],
                ['VALIDATION_ERROR', `Errors (${summary.errorCaughtCount})`],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAuditFilter(value)}
                className={`pb-0.5 font-semibold border-b-2 transition-colors cursor-pointer ${
                  auditFilter === value
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-100/80 text-xs font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-2.5">ID</th>
                <th className="px-4 py-2.5">Room · Date · Time</th>
                <th className="px-4 py-2.5">Event</th>
                <th className="px-4 py-2.5">Outcome</th>
                <th className="px-4 py-2.5">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => (
                <tr key={item.requestId} className="hover:bg-slate-50/70">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-700">
                    {item.requestId}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 tabular-nums">
                    <span className="font-semibold text-slate-900">{item.facilityId}</span>{' '}
                    · {item.date} · {item.timeRange}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {item.eventTitle}
                  </td>
                  <td className="px-4 py-2.5 font-semibold">
                    {item.actualOutcome === 'BOOKED' && (
                      <span className="text-emerald-700">Booked</span>
                    )}
                    {item.actualOutcome === 'CONFLICT' && (
                      <span className="text-amber-700">Conflict</span>
                    )}
                    {item.actualOutcome === 'VALIDATION_ERROR' && (
                      <span className="text-red-700">Error</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {item.summary}
                    {item.suggestedRoomId && (
                      <span className="ml-1.5 font-semibold text-blue-700">
                        (Suggested: {item.suggestedRoomId})
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
