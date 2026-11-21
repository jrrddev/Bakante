import { useState } from 'react';
import type { Booking, Facility } from '@bakante/shared';

interface CalendarGridProps {
  facilities: Facility[];
  bookings: Booking[];
  selectedDate: string;
  isLoading?: boolean;
  onSelectSlot: (facilityId: string, startTime: string, endTime: string) => void;
  onDeleteBooking: (id: string) => Promise<void>;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);
const DAY_START_MIN = 7 * 60;
const DAY_TOTAL_MIN = 14 * 60;

// Staggered skeleton bar positions so the loading grid looks like a real timetable
const SKELETON_SLOTS: Array<{ left: string; width: string }> = [
  { left: '7.14%', width: '14.28%' },
  { left: '21.42%', width: '14.28%' },
  { left: '42.85%', width: '21.42%' },
  { left: '14.28%', width: '21.42%' },
  { left: '50.00%', width: '14.28%' },
  { left: '7.14%', width: '28.57%' },
  { left: '35.71%', width: '14.28%' },
  { left: '28.57%', width: '21.42%' },
  { left: '14.28%', width: '14.28%' },
];

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function CalendarGrid({
  facilities,
  bookings,
  isLoading = false,
  onSelectSlot,
  onDeleteBooking,
}: CalendarGridProps) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const activeFacility = activeBooking
    ? facilities.find((f) => f.id === activeBooking.facilityId)
    : undefined;

  async function handleConfirmDelete() {
    if (!activeBooking) return;
    setIsDeleting(true);
    try {
      await onDeleteBooking(activeBooking.id);
      setActiveBooking(null);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border border-slate-300/90 bg-white overflow-hidden shadow-xs">
        {!isLoading && facilities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No facilities match your filter.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Clear the search box or select All buildings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto timeline-scroll">
            <div className="min-w-[1020px]">
              {/* Header Row */}
              <div className="grid grid-cols-[260px_1fr] border-b border-slate-300 bg-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <div className="sticky left-0 z-10 bg-slate-100 px-4 py-2.5 border-r border-slate-300">
                  Facility
                </div>
                <div className="grid grid-cols-14">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-slate-200 py-2.5 text-center last:border-r-0 tabular-nums"
                    >
                      {formatHourLabel(hour)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Initial Full-Grid Skeleton (before facilities arrive) */}
              {isLoading && facilities.length === 0
                ? SKELETON_SLOTS.map((slot, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[260px_1fr] border-b border-slate-200 last:border-b-0"
                    >
                      <div className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3 flex flex-col justify-center gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-3.5 w-36 rounded bg-slate-200 animate-pulse" />
                          <div className="h-3 w-8 rounded bg-slate-200 animate-pulse" />
                        </div>
                        <div className="h-2.5 w-44 rounded bg-slate-100 animate-pulse" />
                      </div>
                      <div className="relative h-16">
                        <div className="grid grid-cols-14 h-full">
                          {HOURS.map((hour) => (
                            <div
                              key={hour}
                              className="border-r border-slate-200/80 last:border-r-0 h-full"
                            />
                          ))}
                        </div>
                        <div
                          style={{ left: slot.left, width: slot.width }}
                          className="absolute top-2 bottom-2 rounded-r bg-slate-200/80 border-l-[3px] border-l-slate-300 px-2.5 py-2 flex flex-col justify-center gap-1.5 animate-pulse"
                        >
                          <div className="h-2.5 w-3/4 rounded bg-slate-300/80" />
                          <div className="h-2 w-1/2 rounded bg-slate-300/60" />
                        </div>
                      </div>
                    </div>
                  ))
                : /* Facility Rows (shows skeleton bars on the right when switching dates) */
                  facilities.map((facility, idx) => {
                    const roomBookings = bookings.filter(
                      (b) => b.facilityId === facility.id
                    );
                    const bookedMinutes = roomBookings.reduce(
                      (sum, b) => sum + (b.endMin - b.startMin),
                      0
                    );
                    const isFree = bookedMinutes === 0;
                    const bookedLabel = isFree
                      ? 'Open'
                      : `${(bookedMinutes / 60).toFixed(bookedMinutes % 60 === 0 ? 0 : 1)}h`;
                    const skeletonSlot = SKELETON_SLOTS[idx % SKELETON_SLOTS.length];

                    return (
                      <div
                        key={facility.id}
                        className="grid grid-cols-[260px_1fr] border-b border-slate-200 last:border-b-0"
                      >
                        {/* Sticky Left Room Column */}
                        <div className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3 flex flex-col justify-center">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-900 truncate">
                              {facility.name}
                            </span>
                            {isLoading ? (
                              <span className="h-3 w-8 rounded bg-slate-200 animate-pulse shrink-0" />
                            ) : (
                              <span
                                className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                                  isFree ? 'text-emerald-700' : 'text-blue-700'
                                }`}
                              >
                                {bookedLabel}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 text-xs text-slate-500 tabular-nums truncate">
                            {facility.id} · {facility.capacity} seats ·{' '}
                            {facility.building.replace(' Building', '')}
                          </div>
                        </div>

                        {/* Hourly Grid & Booking Blocks (or Date-Switch Skeleton Bars) */}
                        <div className="relative h-16">
                          <div className="grid grid-cols-14 h-full">
                            {HOURS.map((hour) => {
                              const startStr = formatHourLabel(hour);
                              const endStr = formatHourLabel(Math.min(hour + 2, 21));
                              return (
                                <button
                                  key={hour}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    onSelectSlot(facility.id, startStr, endStr)
                                  }
                                  title={`Book ${facility.name} at ${startStr}`}
                                  className="group border-r border-slate-200/80 last:border-r-0 h-full flex items-center justify-center hover:bg-blue-50/90 transition-colors cursor-pointer disabled:cursor-default"
                                >
                                  <span className="text-sm font-semibold text-blue-700 opacity-0 group-hover:opacity-100">
                                    +
                                  </span>
                                </button>
                              );
                            })}
                          </div>

                          {isLoading ? (
                            idx % 2 === 0 && (
                              <div
                                style={{
                                  left: skeletonSlot.left,
                                  width: skeletonSlot.width,
                                }}
                                className="absolute top-2 bottom-2 rounded-r bg-slate-200/80 border-l-[3px] border-l-slate-300 px-2.5 py-2 flex flex-col justify-center gap-1.5 animate-pulse pointer-events-none"
                              >
                                <div className="h-2.5 w-3/4 rounded bg-slate-300/80" />
                                <div className="h-2 w-1/2 rounded bg-slate-300/60" />
                              </div>
                            )
                          ) : (
                            roomBookings.map((booking) => {
                              const leftPct =
                                ((booking.startMin - DAY_START_MIN) / DAY_TOTAL_MIN) *
                                100;
                              const widthPct =
                                ((booking.endMin - booking.startMin) / DAY_TOTAL_MIN) *
                                100;

                              return (
                                <button
                                  key={booking.id}
                                  type="button"
                                  onClick={() => setActiveBooking(booking)}
                                  style={{
                                    left: `${Math.max(0, leftPct)}%`,
                                    width: `${Math.max(2, widthPct)}%`,
                                  }}
                                  className="absolute top-1.5 bottom-1.5 rounded-r bg-blue-100 hover:bg-blue-200/80 border border-blue-300 border-l-[3px] border-l-blue-700 px-2.5 py-1 text-left flex flex-col justify-center overflow-hidden transition-colors cursor-pointer"
                                  title={`${booking.eventTitle} (${booking.startTime}–${booking.endTime})`}
                                >
                                  <div className="text-xs font-semibold text-slate-900 leading-tight truncate">
                                    {booking.eventTitle}
                                  </div>
                                  <div className="mt-0.5 text-[11px] font-medium text-blue-900/80 tabular-nums truncate">
                                    {booking.startTime}–{booking.endTime} ·{' '}
                                    {booking.office}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
        )}
      </div>

      {/* Clean Booking Detail Dialog */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-xl animate-fade-up">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeBooking.eventTitle}
                </h3>
                <p className="mt-0.5 text-xs font-mono text-slate-500">
                  {activeBooking.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="px-1.5 py-0.5 text-lg leading-none text-slate-400 hover:text-slate-900 cursor-pointer"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <dl className="px-5 py-4 divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Facility</dt>
                <dd className="font-semibold text-slate-900 text-right">
                  {activeFacility?.name ?? activeBooking.facilityId}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Date &amp; time</dt>
                <dd className="font-semibold text-blue-700 tabular-nums text-right">
                  {activeBooking.date} · {activeBooking.startTime}–{activeBooking.endTime}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Requester</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {activeBooking.requesterName} ({activeBooking.office})
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Attendees</dt>
                <dd className="font-medium text-slate-900 tabular-nums text-right">
                  {activeBooking.attendees}
                  {activeFacility ? ` / ${activeFacility.capacity} seats` : ' seats'}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3.5 bg-slate-50">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="text-xs font-semibold text-red-700 hover:text-red-800 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Cancelling...' : 'Cancel booking'}
              </button>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
