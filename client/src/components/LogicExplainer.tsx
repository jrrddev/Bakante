import { useState } from 'react';
import { doTimesOverlap, minutesToTime, timeToMinutes } from '@bakante/shared';
import { ArrowRight, CheckCircle2, Lock, Search, Sparkles, XCircle } from 'lucide-react';

const DAY_START = 7 * 60; // 07:00
const DAY_SPAN = 14 * 60; // 07:00 - 21:00

function toTimelinePct(min: number): number {
  return Math.max(0, Math.min(100, ((min - DAY_START) / DAY_SPAN) * 100));
}

/**
 * Interactive explainer tab showing judges and team members exactly how
 * Bakante's 3-step algorithm prevents conflicts and errors.
 */
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          How Bakante&apos;s Core Logic Works (Pitch &amp; Study Guide)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Every booking passes through 3 clean, deterministic steps — replacing slow manual spreadsheet checks with instant conflict prevention.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <Lock className="h-4 w-4" /> Step 1: Input Gatekeeper — O(1)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Before touching the database, <code>validateBookingRequest()</code> blocks blank offices, room typos (<code>AVR 01</code>), inverted times (<code>14:00–12:00</code>), outside hours, and over-capacity requests.
            </p>
            <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-900 border border-amber-200">
              Outcome: 0% Data Errors
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
              <Search className="h-4 w-4" /> Step 2: Binary Search — O(log n)
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Inside a SQLite <code>BEGIN IMMEDIATE</code> lock, bookings for that room+date load sorted by start minute. Binary Search jumps straight to the time window and checks <code>startA &lt; endB && startB &lt; endA</code>.
            </p>
            <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-blue-900 border border-blue-200">
              Outcome: 0% Double-Bookings
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <Sparkles className="h-4 w-4" /> Step 3: 100-Pt Smart Suggester
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              When busy, Bakante finds open gaps on the same room AND ranks conflict-free rooms out of 100 points: <strong>45 pts</strong> capacity fit + <strong>35 pts</strong> equipment match + <strong>20 pts</strong> same building.
            </p>
            <div className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 border border-emerald-200">
              Outcome: 1-Click Resolution
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Overlap Formula Tester + Visual Timeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Interactive Overlap Rule Tester:{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                startA &lt; endB &amp;&amp; startB &lt; endA
              </code>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Test why back-to-back bookings pass cleanly while overlaps are caught immediately.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStartA('09:00');
                setEndA('11:00');
                setStartB('11:00');
                setEndB('13:00');
              }}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              Back-to-Back (Allowed)
            </button>
            <button
              type="button"
              onClick={() => {
                setStartA('09:00');
                setEndA('11:00');
                setStartB('10:00');
                setEndB('12:00');
              }}
              className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              Partial Overlap
            </button>
            <button
              type="button"
              onClick={() => {
                setStartA('08:00');
                setEndA('12:00');
                setStartB('09:30');
                setEndB('10:30');
              }}
              className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              Nested Overlap
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-2">
            <div className="text-xs font-bold text-blue-800">Booking A (Existing)</div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startA}
                onChange={(e) => setStartA(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              />
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <input
                type="time"
                value={endA}
                onChange={(e) => setEndA(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              />
              <span className="text-xs font-mono text-slate-500">
                [{minA1}, {minA2})
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-2">
            <div className="text-xs font-bold text-amber-800">Booking B (New Request)</div>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              />
              <ArrowRight className="h-4 w-4 text-slate-400" />
              <input
                type="time"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm"
              />
              <span className="text-xs font-mono text-slate-500">
                [{minB1}, {minB2})
              </span>
            </div>
          </div>
        </div>

        {/* Visual Day Bar (07:00 - 21:00) */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>07:00</span>
            <span>10:30</span>
            <span>14:00</span>
            <span>17:30</span>
            <span>21:00</span>
          </div>
          <div className="relative h-14 rounded-lg bg-white border border-slate-200 overflow-hidden">
            {/* Booking A bar */}
            <div
              style={{
                left: `${toTimelinePct(minA1)}%`,
                width: `${Math.max(1, toTimelinePct(minA2) - toTimelinePct(minA1))}%`,
              }}
              className="absolute top-1.5 h-5 rounded bg-blue-600 text-[10px] font-semibold text-white px-2 flex items-center truncate"
            >
              A: {startA}–{endA}
            </div>
            {/* Booking B bar */}
            <div
              style={{
                left: `${toTimelinePct(minB1)}%`,
                width: `${Math.max(1, toTimelinePct(minB2) - toTimelinePct(minB1))}%`,
              }}
              className="absolute bottom-1.5 h-5 rounded bg-amber-500 text-[10px] font-semibold text-white px-2 flex items-center truncate"
            >
              B: {startB}–{endB}
            </div>
            {/* Highlighted Overlap Zone */}
            {overlaps && overlapEnd > overlapStart && (
              <div
                style={{
                  left: `${toTimelinePct(overlapStart)}%`,
                  width: `${Math.max(1, toTimelinePct(overlapEnd) - toTimelinePct(overlapStart))}%`,
                }}
                className="absolute inset-y-0 bg-rose-500/30 border-x-2 border-rose-600 pointer-events-none"
                title="Conflict Overlap Zone"
              />
            )}
          </div>
        </div>

        <div
          className={`flex items-center justify-between rounded-xl border p-4 text-sm ${
            overlaps
              ? 'border-rose-200 bg-rose-50 text-rose-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {overlaps ? (
              <XCircle className="h-5 w-5 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            <div>
              <strong>{overlaps ? 'CONFLICT DETECTED' : 'NO CONFLICT (ALLOWED)'}</strong>
              <div className="text-xs mt-0.5 font-mono">
                ({minutesToTime(minA1)} &lt; {minutesToTime(minB2)} →{' '}
                {String(minA1 < minB2)}) AND ({minutesToTime(minB1)} &lt;{' '}
                {minutesToTime(minA2)} → {String(minB1 < minA2)})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
