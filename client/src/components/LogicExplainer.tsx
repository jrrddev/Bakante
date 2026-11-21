import { useState } from 'react';
import { doTimesOverlap, minutesToTime, timeToMinutes } from '@bakante/shared';

const DAY_START = 7 * 60;
const DAY_SPAN = 14 * 60;

function toTimelinePct(min: number): number {
  return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_SPAN) * 100));
}

export function LogicExplainer() {
  const [startA, setStartA] = useState('09:00');
  const [endA, setEndA] = useState('11:00');
  const [startB, setStartB] = useState('11:00');
  const [endB, setEndB] = useState('13:00');

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
        <p className="mt-1 text-sm text-slate-600">
          Three sequential checks enforce 0% data errors, 0% double-bookings, and 1-click conflict recovery.
        </p>
      </div>

      {/* 3-Column Hairline Grid with Cobalt Step Tags & Emerald Guarantees */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-xs">
        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-blue-700">
            <span>01</span>
            <span>O(1)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Input Gatekeeper</h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Validates required fields, checks the room ID against ISATU&apos;s 9-room catalog, enforces campus hours (07:00–21:00), and blocks inverted times or over-capacity events.
          </p>
          <div className="pt-1 text-xs font-semibold text-emerald-700">
            Guarantee: 0% Data Errors
          </div>
        </div>

        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-blue-700">
            <span>02</span>
            <span>O(log n)</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Atomic Binary Search</h3>
          <p className="text-xs leading-relaxed text-slate-600">
            Inside a SQLite <code>BEGIN IMMEDIATE</code> write lock, sorted intervals are searched via Binary Search using <code>startA &lt; endB &amp;&amp; startB &lt; endA</code>.
          </p>
          <div className="pt-1 text-xs font-semibold text-emerald-700">
            Guarantee: 0% Double-Bookings
          </div>
        </div>

        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono font-semibold text-blue-700">
            <span>03</span>
            <span>100-pt score</span>
          </div>
          <h3 className="text-sm font-bold text-slate-900">Best-Fit Suggester</h3>
          <p className="text-xs leading-relaxed text-slate-600">
            On conflict, returns open gaps on the same room and ranks free alternative rooms by capacity fit (45 pts), equipment match (35 pts), and same building (20 pts).
          </p>
          <div className="pt-1 text-xs font-semibold text-emerald-700">
            Guarantee: 1-Click Resolution
          </div>
        </div>
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
            <div className="text-xs font-semibold text-slate-700">Booking B (New Request)</div>
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
            <span>07:00</span>
            <span>10:30</span>
            <span>14:00</span>
            <span>17:30</span>
            <span>21:00</span>
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
