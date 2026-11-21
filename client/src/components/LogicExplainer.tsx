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
        <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Algorithm Architecture
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Three sequential checks enforce 0% data errors, 0% double-bookings, and 1-click conflict recovery.
        </p>
      </div>

      {/* 3-Column Hairline Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>01</span>
            <span>O(1)</span>
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">Input Gatekeeper</h3>
          <p className="text-xs leading-relaxed text-neutral-600">
            Validates required fields, checks the room ID against ISATU&apos;s 9-room catalog, enforces campus hours (07:00–21:00), and blocks inverted times or over-capacity events.
          </p>
          <div className="pt-1 text-xs font-medium text-neutral-900">
            Guarantee: 0% Data Errors
          </div>
        </div>

        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>02</span>
            <span>O(log n)</span>
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Atomic Binary Search
          </h3>
          <p className="text-xs leading-relaxed text-neutral-600">
            Inside a SQLite <code>BEGIN IMMEDIATE</code> write lock, sorted intervals are searched via Binary Search using <code>startA &lt; endB &amp;&amp; startB &lt; endA</code>.
          </p>
          <div className="pt-1 text-xs font-medium text-neutral-900">
            Guarantee: 0% Double-Bookings
          </div>
        </div>

        <div className="p-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>03</span>
            <span>100-pt score</span>
          </div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Best-Fit Suggester
          </h3>
          <p className="text-xs leading-relaxed text-neutral-600">
            On conflict, returns open gaps on the same room and ranks free alternative rooms by capacity fit (45 pts), equipment match (35 pts), and same building (20 pts).
          </p>
          <div className="pt-1 text-xs font-medium text-neutral-900">
            Guarantee: 1-Click Resolution
          </div>
        </div>
      </div>

      {/* Minimal Interactive Overlap Rule Tester */}
      <div className="rounded-lg border border-neutral-200 bg-white p-6 space-y-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Overlap rule tester:{' '}
              <code className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded">
                startA &lt; endB &amp;&amp; startB &lt; endA
              </code>
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Back-to-back slots pass cleanly; intersecting intervals are blocked.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
            <button
              type="button"
              onClick={() => {
                setStartA('09:00');
                setEndA('11:00');
                setStartB('11:00');
                setEndB('13:00');
              }}
              className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
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
              className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
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
              className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
            >
              Nested overlap
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-md border border-neutral-200 p-4 space-y-2">
            <div className="text-xs font-medium text-neutral-500">Booking A</div>
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <input
                type="time"
                value={startA}
                onChange={(e) => setStartA(e.target.value)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="time"
                value={endA}
                onChange={(e) => setEndA(e.target.value)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm"
              />
              <span className="text-xs font-mono text-neutral-400">
                [{minA1}, {minA2})
              </span>
            </div>
          </div>

          <div className="rounded-md border border-neutral-200 p-4 space-y-2">
            <div className="text-xs font-medium text-neutral-500">Booking B</div>
            <div className="flex items-center gap-2 text-sm tabular-nums">
              <input
                type="time"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm"
              />
              <span className="text-neutral-400">–</span>
              <input
                type="time"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-sm"
              />
              <span className="text-xs font-mono text-neutral-400">
                [{minB1}, {minB2})
              </span>
            </div>
          </div>
        </div>

        {/* Clean Monochrome Timeline Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-neutral-400 tabular-nums">
            <span>07:00</span>
            <span>10:30</span>
            <span>14:00</span>
            <span>17:30</span>
            <span>21:00</span>
          </div>
          <div className="relative h-14 rounded-md border border-neutral-200 bg-neutral-50 overflow-hidden">
            <div
              style={{
                left: `${toTimelinePct(minA1)}%`,
                width: `${Math.max(1, toTimelinePct(minA2) - toTimelinePct(minA1))}%`,
              }}
              className="absolute top-1.5 h-5 rounded-sm bg-neutral-900 text-[11px] font-medium text-white px-2 flex items-center truncate tabular-nums"
            >
              A · {startA}–{endA}
            </div>
            <div
              style={{
                left: `${toTimelinePct(minB1)}%`,
                width: `${Math.max(1, toTimelinePct(minB2) - toTimelinePct(minB1))}%`,
              }}
              className="absolute bottom-1.5 h-5 rounded-sm bg-neutral-500 text-[11px] font-medium text-white px-2 flex items-center truncate tabular-nums"
            >
              B · {startB}–{endB}
            </div>
            {overlaps && overlapEnd > overlapStart && (
              <div
                style={{
                  left: `${toTimelinePct(overlapStart)}%`,
                  width: `${Math.max(1, toTimelinePct(overlapEnd) - toTimelinePct(overlapStart))}%`,
                }}
                className="absolute inset-y-0 bg-red-500/20 border-x border-red-600 pointer-events-none"
              />
            )}
          </div>
        </div>

        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 border-l-2 ${
            overlaps ? 'border-l-red-600' : 'border-l-emerald-600'
          } bg-neutral-50/70 px-4 py-3 text-xs`}
        >
          <span className={`font-semibold ${overlaps ? 'text-red-700' : 'text-emerald-700'}`}>
            {overlaps ? 'Conflict detected — blocked' : 'No overlap — allowed'}
          </span>
          <span className="font-mono text-neutral-600">
            ({minutesToTime(minA1)} &lt; {minutesToTime(minB2)} → {String(minA1 < minB2)}) AND (
            {minutesToTime(minB1)} &lt; {minutesToTime(minA2)} → {String(minB1 < minA2)})
          </span>
        </div>
      </div>
    </div>
  );
}
