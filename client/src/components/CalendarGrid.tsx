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

const HOURS = Array.from({ length: 20 }, (_, i) => 3 + i);
const DAY_START_MIN = 3 * 60;
const DAY_TOTAL_MIN = 20 * 60;

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

function formatHourValue(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function formatHourHeader(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour} ${period}`;
}

function formatReadableTime(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${mStr} ${period}`;
}

export function CalendarGrid({
  facilities,
  bookings,
  isLoading = false,
  onSelectSlot,
  onDeleteBooking,
}: CalendarGridProps) {
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [hoveredCard, setHoveredCard] = useState<{
    booking: Booking;
    facility: Facility;
    x: number;
    y: number;
    showBelow: boolean;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function handleBookingMouseEnter(
    e: React.MouseEvent<HTMLButtonElement>,
    booking: Booking,
    facility: Facility
  ) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cardWidth = 300;
    const clampedX = Math.min(
      Math.max(rect.left + rect.width / 2, cardWidth / 2 + 12),
      window.innerWidth - cardWidth / 2 - 12
    );
    const showBelow = rect.top < 210;
    setHoveredCard({
      booking,
      facility,
      x: clampedX,
      y: showBelow ? rect.bottom + 8 : rect.top - 8,
      showBelow,
    });
  }

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
        {/* Helpful Micro-Guide & Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <span>
            Click any open time slot to book, or click a blue block to view details.
          </span>
          <div className="flex items-center gap-4 font-semibold">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-blue-100 border-l-2 border-l-blue-700 border border-blue-300" />
              Booked
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-xs bg-white border border-slate-300" />
              Available
            </span>
          </div>
        </div>

        {!isLoading && facilities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-800">
              No rooms match your filter.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Clear the search box or select All buildings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto timeline-scroll">
            <div className="min-w-[1520px]">
              {/* Readable 12-Hour Header Row */}
              <div className="grid grid-cols-[290px_1fr] border-b border-slate-300 bg-slate-100 text-xs font-bold tracking-wide text-slate-700">
                <div className="sticky left-0 z-10 bg-slate-100 px-4 py-3 border-r border-slate-300 uppercase">
                  Room / Facility
                </div>
                <div className="grid grid-cols-[repeat(20,minmax(0,1fr))]">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-slate-200 py-3 text-center last:border-r-0 tabular-nums"
                    >
                      {formatHourHeader(hour)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Initial Full-Grid Skeleton */}
              {isLoading && facilities.length === 0
                ? SKELETON_SLOTS.map((slot, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-[270px_1fr] border-b border-slate-200 last:border-b-0"
                    >
                      <div className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3.5 flex flex-col justify-center gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="h-3.5 w-36 rounded bg-slate-200 animate-pulse" />
                          <div className="h-3 w-12 rounded bg-slate-200 animate-pulse" />
                        </div>
                        <div className="h-2.5 w-44 rounded bg-slate-100 animate-pulse" />
                      </div>
                      <div className="relative h-20">
                        <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] h-full">
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
                : facilities.map((facility, idx) => {
                    const roomBookings = bookings.filter(
                      (b) => b.facilityId === facility.id
                    );
                    const bookedMinutes = roomBookings.reduce(
                      (sum, b) => sum + (b.endMin - b.startMin),
                      0
                    );
                    const isFree = bookedMinutes === 0;
                    const bookedLabel = isFree
                      ? 'Available'
                      : `${(bookedMinutes / 60).toFixed(bookedMinutes % 60 === 0 ? 0 : 1)}h booked`;
                    const skeletonSlot = SKELETON_SLOTS[idx % SKELETON_SLOTS.length];

                    return (
                      <div
                        key={facility.id}
                        className="grid grid-cols-[290px_1fr] border-b border-slate-200 last:border-b-0 hover:bg-slate-50/40 transition-colors"
                      >
                        {/* Sticky Left Room Column */}
                        <div className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3.5 flex flex-col justify-center gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-base font-bold text-slate-900 truncate">
                              {facility.name}
                            </span>
                            {isLoading ? (
                              <span className="h-4 w-14 rounded-full bg-slate-200 animate-pulse shrink-0" />
                            ) : (
                              <span
                                className={`text-xs font-bold tabular-nums shrink-0 ${
                                  isFree ? 'text-emerald-700' : 'text-blue-700'
                                }`}
                              >
                                {bookedLabel}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-medium text-slate-500 tabular-nums truncate">
                            Up to {facility.capacity} seats · {facility.building}
                          </div>
                        </div>

                        {/* Hourly Grid & Readable Booking Blocks */}
                        <div className="relative h-22">
                          <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] h-full">
                            {HOURS.map((hour) => {
                              const startStr = formatHourValue(hour);
                              const endStr = formatHourValue(Math.min(hour + 2, 23));
                              return (
                                <button
                                  key={hour}
                                  type="button"
                                  disabled={isLoading}
                                  onClick={() =>
                                    onSelectSlot(facility.id, startStr, endStr)
                                  }
                                  title={`Book ${facility.name} starting at ${formatHourHeader(hour)}`}
                                  className="group border-r border-slate-200/80 last:border-r-0 h-full flex flex-col items-center justify-center hover:bg-blue-50/90 transition-colors cursor-pointer disabled:cursor-default"
                                >
                                  <span className="text-xs font-semibold text-blue-700 opacity-0 group-hover:opacity-100">
                                    + Book
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
                              const readableRange = `${formatReadableTime(
                                booking.startTime
                              )} – ${formatReadableTime(booking.endTime)}`;

                              return (
                                <button
                                  key={booking.id}
                                  type="button"
                                  onClick={() => {
                                    setHoveredCard(null);
                                    setActiveBooking(booking);
                                  }}
                                  onMouseEnter={(e) =>
                                    handleBookingMouseEnter(e, booking, facility)
                                  }
                                  onMouseLeave={() => setHoveredCard(null)}
                                  style={{
                                    left: `${Math.max(0, leftPct)}%`,
                                    width: `${Math.max(2, widthPct)}%`,
                                  }}
                                  className="absolute top-2 bottom-2 rounded-r bg-blue-100/95 hover:bg-blue-200/90 border border-blue-300 border-l-[3px] border-l-blue-700 px-3 py-1.5 text-left flex flex-col justify-center overflow-hidden transition-colors cursor-pointer shadow-2xs"
                                >
                                  <div className="text-sm font-bold text-slate-900 leading-snug truncate">
                                    {booking.eventTitle}
                                  </div>
                                  <div className="mt-0.5 text-xs font-semibold text-blue-900/90 tabular-nums truncate">
                                    {readableRange} · {booking.office}
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

      {/* Floating Hover Preview Card (positioned via viewport coords so it never clips) */}
      {hoveredCard && !activeBooking && (
        <div
          style={{
            left: `${hoveredCard.x}px`,
            top: `${hoveredCard.y}px`,
            transform: hoveredCard.showBelow
              ? 'translate(-50%, 0)'
              : 'translate(-50%, -100%)',
          }}
          className="fixed z-50 w-[300px] pointer-events-none rounded-lg border border-slate-200 border-l-[3px] border-l-blue-700 bg-white p-4 shadow-xl animate-fade-up"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-bold text-slate-900 leading-snug">
              {hoveredCard.booking.eventTitle}
            </div>
            <span className="text-[11px] font-mono text-slate-400 shrink-0">
              {hoveredCard.booking.id}
            </span>
          </div>

          <div className="mt-1 text-xs font-bold text-blue-700 tabular-nums">
            {formatReadableTime(hoveredCard.booking.startTime)} –{' '}
            {formatReadableTime(hoveredCard.booking.endTime)}
          </div>

          <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Room</span>
              <span className="font-semibold text-slate-800 text-right">
                {hoveredCard.facility.name}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Reserved by</span>
              <span className="font-medium text-slate-800 text-right truncate">
                {hoveredCard.booking.requesterName}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Office</span>
              <span className="font-medium text-slate-800 text-right truncate">
                {hoveredCard.booking.office}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">Attendees</span>
              <span className="font-semibold text-slate-800 tabular-nums">
                {hoveredCard.booking.attendees} of {hoveredCard.facility.capacity} seats
              </span>
            </div>
          </div>

          <div className="mt-2.5 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-400">
            Click to view full details or cancel
          </div>
        </div>
      )}

      {/* Clean Booking Detail Dialog */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-xl animate-fade-up">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeBooking.eventTitle}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Confirmed reservation · {activeBooking.id}
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
                <dt className="text-slate-500">Room</dt>
                <dd className="font-semibold text-slate-900 text-right">
                  {activeFacility?.name ?? activeBooking.facilityId}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Date &amp; time</dt>
                <dd className="font-semibold text-blue-700 tabular-nums text-right">
                  {activeBooking.date} · {formatReadableTime(activeBooking.startTime)} –{' '}
                  {formatReadableTime(activeBooking.endTime)}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Reserved by</dt>
                <dd className="font-medium text-slate-900 text-right">
                  {activeBooking.requesterName} ({activeBooking.office})
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-slate-500">Attendees</dt>
                <dd className="font-medium text-slate-900 tabular-nums text-right">
                  {activeBooking.attendees}
                  {activeFacility ? ` of ${activeFacility.capacity} seats` : ' seats'}
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
