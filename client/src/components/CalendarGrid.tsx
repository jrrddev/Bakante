import { useState } from 'react';
import type { Booking, Facility } from '@bakante/shared';

interface CalendarGridProps {
  facilities: Facility[];
  bookings: Booking[];
  selectedDate: string;
  onSelectSlot: (facilityId: string, startTime: string, endTime: string) => void;
  onDeleteBooking: (id: string) => Promise<void>;
}

const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);
const DAY_START_MIN = 7 * 60;
const DAY_TOTAL_MIN = 14 * 60;

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function CalendarGrid({
  facilities,
  bookings,
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
      <div className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
        {facilities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-neutral-800">
              No facilities match your filter.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Clear the search box or select All buildings.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto timeline-scroll">
            <div className="min-w-[1020px]">
              {/* Header Row */}
              <div className="grid grid-cols-[260px_1fr] border-b border-neutral-200 bg-neutral-50 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                <div className="sticky left-0 z-10 bg-neutral-50 px-4 py-2.5 border-r border-neutral-200">
                  Facility
                </div>
                <div className="grid grid-cols-14">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-neutral-200/70 py-2.5 text-center last:border-r-0 tabular-nums"
                    >
                      {formatHourLabel(hour)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Facility Rows */}
              {facilities.map((facility) => {
                const roomBookings = bookings.filter((b) => b.facilityId === facility.id);
                const bookedMinutes = roomBookings.reduce(
                  (sum, b) => sum + (b.endMin - b.startMin),
                  0
                );
                const bookedLabel =
                  bookedMinutes === 0
                    ? 'Open'
                    : `${(bookedMinutes / 60).toFixed(bookedMinutes % 60 === 0 ? 0 : 1)}h`;

                return (
                  <div
                    key={facility.id}
                    className="grid grid-cols-[260px_1fr] border-b border-neutral-100 last:border-b-0"
                  >
                    {/* Sticky Left Room Column */}
                    <div className="sticky left-0 z-10 bg-white border-r border-neutral-200 px-4 py-3 flex flex-col justify-center">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-neutral-900 truncate">
                          {facility.name}
                        </span>
                        <span className="text-[11px] font-medium text-neutral-400 tabular-nums shrink-0">
                          {bookedLabel}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500 tabular-nums truncate">
                        {facility.id} · {facility.capacity} seats ·{' '}
                        {facility.building.replace(' Building', '')}
                      </div>
                    </div>

                    {/* Hourly Grid & Monochrome Booking Blocks */}
                    <div className="relative h-16">
                      <div className="grid grid-cols-14 h-full">
                        {HOURS.map((hour) => {
                          const startStr = formatHourLabel(hour);
                          const endStr = formatHourLabel(Math.min(hour + 2, 21));
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => onSelectSlot(facility.id, startStr, endStr)}
                              title={`Book ${facility.name} at ${startStr}`}
                              className="group border-r border-neutral-100 last:border-r-0 h-full flex items-center justify-center hover:bg-neutral-100/70 transition-colors cursor-pointer"
                            >
                              <span className="text-sm text-neutral-400 opacity-0 group-hover:opacity-100">
                                +
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {roomBookings.map((booking) => {
                        const leftPct =
                          ((booking.startMin - DAY_START_MIN) / DAY_TOTAL_MIN) * 100;
                        const widthPct =
                          ((booking.endMin - booking.startMin) / DAY_TOTAL_MIN) * 100;

                        return (
                          <button
                            key={booking.id}
                            type="button"
                            onClick={() => setActiveBooking(booking)}
                            style={{
                              left: `${Math.max(0, leftPct)}%`,
                              width: `${Math.max(2, widthPct)}%`,
                            }}
                            className="absolute top-1.5 bottom-1.5 rounded-r bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 border-l-2 border-l-neutral-900 px-2.5 py-1 text-left flex flex-col justify-center overflow-hidden transition-colors cursor-pointer"
                            title={`${booking.eventTitle} (${booking.startTime}–${booking.endTime})`}
                          >
                            <div className="text-xs font-medium text-neutral-900 leading-tight truncate">
                              {booking.eventTitle}
                            </div>
                            <div className="mt-0.5 text-[11px] text-neutral-500 tabular-nums truncate">
                              {booking.startTime}–{booking.endTime} · {booking.office}
                            </div>
                          </button>
                        );
                      })}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/35 p-4">
          <div className="w-full max-w-md rounded-lg bg-white border border-neutral-200 shadow-lg animate-fade-up">
            <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900">
                  {activeBooking.eventTitle}
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500 tabular-nums">
                  {activeBooking.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="px-1.5 py-0.5 text-base leading-none text-neutral-400 hover:text-neutral-900 cursor-pointer"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <dl className="px-5 py-4 divide-y divide-neutral-100 text-sm">
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-neutral-500">Facility</dt>
                <dd className="font-medium text-neutral-900 text-right">
                  {activeFacility?.name ?? activeBooking.facilityId}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-neutral-500">Date &amp; time</dt>
                <dd className="font-medium text-neutral-900 tabular-nums text-right">
                  {activeBooking.date} · {activeBooking.startTime}–{activeBooking.endTime}
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-neutral-500">Requester</dt>
                <dd className="font-medium text-neutral-900 text-right">
                  {activeBooking.requesterName} ({activeBooking.office})
                </dd>
              </div>
              <div className="py-2.5 flex justify-between gap-4">
                <dt className="text-neutral-500">Attendees</dt>
                <dd className="font-medium text-neutral-900 tabular-nums text-right">
                  {activeBooking.attendees}
                  {activeFacility ? ` / ${activeFacility.capacity} seats` : ' seats'}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between border-t border-neutral-200 px-5 py-3.5 bg-neutral-50/60">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? 'Cancelling...' : 'Cancel booking'}
              </button>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="rounded-md bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 cursor-pointer"
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
