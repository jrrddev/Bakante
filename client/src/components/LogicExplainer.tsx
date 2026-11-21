import { useState } from 'react';
import { doTimesOverlap, minutesToTime, timeToMinutes } from '@bakante/shared';

const DAY_START = 3 * 60;
const DAY_SPAN = 20 * 60;

function toTimelinePct(min: number): number {
  return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_SPAN) * 100));
}

interface AlgorithmStepDetail {
  id: string;
  number: string;
  complexity: string;
  title: string;
  summary: string;
  guarantee: string;
  logicSteps: string[];
  formula: string;
  exampleTitle: string;
  exampleBody: string;
}

const ALGORITHM_STEPS: AlgorithmStepDetail[] = [
  {
    id: 'gatekeeper',
    number: '01',
    complexity: 'O(1)',
    title: 'Input Gatekeeper',
    summary:
      "Validates required fields, checks the room ID against ISATU's 9-room catalog, enforces campus hours (3:00 AM–11:00 PM), and blocks inverted times or over-capacity events.",
    guarantee: 'Guarantee: 0% Data Errors',
    logicSteps: [
      'Reject blank requester name, office, or event title immediately.',
      'Match facilityId strictly against the 9 official ISATU rooms (blocks typos like "AVR 01").',
      'Convert "HH:MM" times into minutes from midnight so bounds are exact integers.',
      'Verify start < end, within 3:00 AM–11:00 PM, and attendees ≤ room.capacity.',
    ],
    formula: '180 ≤ startMin < endMin ≤ 1380  AND  1 ≤ attendees ≤ room.capacity',
    exampleTitle: 'Example (REQ-09 — Over-capacity)',
    exampleBody:
      'Request asks for ICT-102 (45 seats) with 120 attendees. 120 ≤ 45 is FALSE → blocked before touching the schedule.',
  },
  {
    id: 'binary-search',
    number: '02',
    complexity: 'O(log n)',
    title: 'Atomic Binary Search',
    summary:
      'Bookings per room and date are indexed in ascending order by start time. Binary Search jumps directly to the requested window and checks neighbors for overlap.',
    guarantee: 'Guarantee: 0% Double-Bookings',
    logicSteps: [
      'Fetch that room’s bookings sorted by startMin via index (facility_id, date, start_min).',
      'Binary Search locates the first booking with startMin ≥ requestedStartMin in log₂(n) steps.',
      'Inspect the immediate predecessor and following bookings until candidate.startMin ≥ requestedEndMin.',
      'Apply the half-open interval rule: back-to-back slots pass cleanly; any intersection is blocked.',
    ],
    formula: 'Overlap  ⇔  (startA < endB)  AND  (startB < endA)',
    exampleTitle: 'Example (AVR-1 — Back-to-back vs. Overlap)',
    exampleBody:
      '09:00–11:00 [540,660) vs. 11:00–13:00 [660,780): 660 < 660 is FALSE → Allowed. 10:00–12:00 [600,720): 540 < 720 & 600 < 660 are TRUE → Blocked.',
  },
  {
    id: 'best-fit',
    number: '03',
    complexity: '100-pt score',
    title: 'Best-Fit Suggester',
    summary:
      'When a room is busy, computes open time gaps on the same room and ranks conflict-free alternative rooms by tight capacity fit, equipment match, and same building.',
    guarantee: 'Guarantee: 1-Click Resolution',
    logicSteps: [
      'Sweep the busy room’s sorted bookings from 3:00 AM to 11:00 PM to find open gaps ≥ requested duration.',
      'Filter all other ISATU rooms that are conflict-free in [startMin, endMin) and fit attendees.',
      'Score each candidate out of 100 pts: 45 pts tightest seat fit + 35 pts required equipment + 20 pts same building.',
      'Return highest-ranked rooms so the user can switch in one click instead of wasting large venues.',
    ],
    formula: 'Score = 45(att / cap) + 35(matched / req) + 20(sameBuilding)',
    exampleTitle: 'Example (50 attendees, Projector, Academic Bldg)',
    exampleBody:
      'AVR 2 (80 seats, Projector, Academic Bldg): 45(50/80) + 35(1/1) + 20 = 28 + 35 + 20 = 83% (beats 500-seat Gym at 40%).',
  },
];

export function LogicExplainer() {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [startA, setStartA] = useState('09:00');
  const [endA, setEndA] = useState('11:00');
  const [startB, setStartB] = useState('11:00');
  const [endB, setEndB] = useState('13:00');

  function toggleCard(id: string) {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  const minA1 = timeToMinutes(startA) ?? 540;
  const minA2 = timeToMinutes(endA) ?? 660;
  const minB1 = timeToMinutes(startB) ?? 660;
  const minB2 = timeToMinutes(endB) ?? 780;
  const overlaps = doTimesOverlap(minA1, minA2, minB1, minB2);

  const overlapStart = Math.max(minA1, minB1);
  const overlapEnd = Math.min(minA2, minB2);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Algorithm Architecture
        </h2>
      </div>

      {/* Expandable 3-Column Algorithm Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {ALGORITHM_STEPS.map((step) => {
          const isOpen = Boolean(expandedIds[step.id]);
          return (
            <div
              key={step.id}
              className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden"
            >
              <button
                type="button"
                onClick={() => toggleCard(step.id)}
                aria-expanded={isOpen}
                className="w-full p-6 text-left space-y-2.5 hover:bg-slate-50/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-mono font-semibold text-blue-700">
                  <span>{step.number}</span>
                  <div className="flex items-center gap-2">
                    <span>{step.complexity}</span>
                    <span
                      className={`inline-block text-slate-500 text-sm transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    >
                      ▾
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="text-xs leading-relaxed text-slate-600">{step.summary}</p>
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700">{step.guarantee}</span>
                  <span className="font-medium text-blue-700">
                    {isOpen ? 'Hide details' : 'View formula & example'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-200 bg-slate-50/80 px-6 py-4 space-y-3.5 text-xs animate-fade-up">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Formula
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-[11px] font-semibold text-blue-800 break-words">
                      {step.formula}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Step-by-Step Logic
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700 leading-relaxed">
                      {step.logicSteps.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="rounded-md border border-slate-200 border-l-[3px] border-l-blue-700 bg-white p-3">
                    <div className="font-semibold text-slate-900">{step.exampleTitle}</div>
                    <p className="mt-1 text-slate-600 leading-relaxed">{step.exampleBody}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* High-Contrast Overlap Rule Tester */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Overlap rule tester:{' '}
              <code className="font-mono text-xs bg-slate-100 text-blue-800 px-1.5 py-0.5 rounded">
                startA &lt; endB &amp;&amp; startB &lt; endA
              </code>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Back-to-back slots pass cleanly; intersecting intervals are blocked.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setStartA('09:00');
                setEndA('11:00');
                setStartB('11:00');
                setEndB('13:00');
              }}
              className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-900 cursor-pointer"
            >
              Back-to-back
            </button>
            <button
              type="button"
              onClick={() => {
                setStartA('09:00');
                setEndA('11:00');
                setStartB('10:00');
                setEndB('12:00');
              }}
              className="font-medium text-red-700 underline decoration-red-300 underline-offset-4 hover:text-red-900 cursor-pointer"
            >
              Partial overlap
            </button>
            <button
              type="button"
              onClick={() => {
                setStartA('08:00');
                setEndA('12:00');
                setStartB('09:30');
                setEndB('10:30');
              }}
              className="font-medium text-red-700 underline decoration-red-300 underline-offset-4 hover:text-red-900 cursor-pointer"
            >
              Nested overlap
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-semibold text-blue-700">Booking A (Existing)</div>
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <input
                type="time"
                value={startA}
                onChange={(e) => setStartA(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-900"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                value={endA}
                onChange={(e) => setEndA(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-900"
              />
              <span className="text-xs font-mono text-slate-500">
                [{minA1}, {minA2})
              </span>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-700">
              Booking B (New Request)
            </div>
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <input
                type="time"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-900"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-900"
              />
              <span className="text-xs font-mono text-slate-500">
                [{minB1}, {minB2})
              </span>
            </div>
          </div>
        </div>

        {/* High-Contrast Timeline Bar (Cobalt A vs Slate B vs Crimson Overlap) */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-500 tabular-nums">
            <span>3 AM</span>
            <span>8 AM</span>
            <span>1 PM</span>
            <span>6 PM</span>
            <span>11 PM</span>
          </div>
          <div className="relative h-14 rounded-md border border-slate-300 bg-slate-50 overflow-hidden">
            <div
              style={{
                left: `${toTimelinePct(minA1)}%`,
                width: `${Math.max(1, toTimelinePct(minA2) - toTimelinePct(minA1))}%`,
              }}
              className="absolute top-1.5 h-5 rounded-sm bg-blue-700 text-[11px] font-semibold text-white px-2 flex items-center truncate tabular-nums"
            >
              A · {startA}–{endA}
            </div>
            <div
              style={{
                left: `${toTimelinePct(minB1)}%`,
                width: `${Math.max(1, toTimelinePct(minB2) - toTimelinePct(minB1))}%`,
              }}
              className="absolute bottom-1.5 h-5 rounded-sm bg-slate-600 text-[11px] font-semibold text-white px-2 flex items-center truncate tabular-nums"
            >
              B · {startB}–{endB}
            </div>
            {overlaps && overlapEnd > overlapStart && (
              <div
                style={{
                  left: `${toTimelinePct(overlapStart)}%`,
                  width: `${Math.max(1, toTimelinePct(overlapEnd) - toTimelinePct(overlapStart))}%`,
                }}
                className="absolute inset-y-0 bg-red-500/25 border-x-2 border-red-600 pointer-events-none"
              />
            )}
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-l-[3px] ${
            overlaps
              ? 'bg-red-50/70 border-red-200 border-l-red-600'
              : 'bg-emerald-50/70 border-emerald-200 border-l-emerald-600'
          } px-4 py-3 text-xs`}
        >
          <span className={`font-bold ${overlaps ? 'text-red-700' : 'text-emerald-700'}`}>
            {overlaps ? 'Conflict detected — blocked' : 'No overlap — allowed'}
          </span>
          <span className="font-mono text-slate-700">
            ({minutesToTime(minA1)} &lt; {minutesToTime(minB2)} → {String(minA1 < minB2)}) AND (
            {minutesToTime(minB1)} &lt; {minutesToTime(minA2)} → {String(minB1 < minA2)})
          </span>
        </div>
      </div>
    </div>
  );
}
