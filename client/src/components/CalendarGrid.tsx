import { useState } from 'react';
import type { Booking, Facility } from '@bakante/shared';
import { Building2, CalendarCheck2, Clock, Plus, Trash2, User, Users, X } from 'lucide-react';

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

/** Distinct color accents per ISATU building for instant visual scanning */
function getBuildingBlockStyle(building: string): string {
  switch (building) {
    case 'Main Campus':
      return 'bg-indigo-600 border-indigo-700 hover:bg-indigo-700';
    case 'Academic Building':
      return 'bg-blue-600 border-blue-700 hover:bg-blue-700';
    case 'ICT Building':
      return 'bg-teal-600 border-teal-700 hover:bg-teal-700';
    case 'TEB Building':
      return 'bg-amber-600 border-amber-700 hover:bg-amber-700';
    default:
      return 'bg-slate-700 border-slate-800 hover:bg-slate-800';
  }
}

export function CalendarGrid({
  facilities,
  bookings,
  selectedDate,
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
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Real-Time Campus Availability — {selectedDate}
            </h2>
            <p className="text-xs text-slate-500">
              Click any empty slot to book, or click a colored block to inspect or cancel.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" /> Main Campus
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> Academic
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> ICT
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-600" /> TEB
            </span>
          </div>
        </div>

        {facilities.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No ISATU facilities match your current filter.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Clear the search box or switch building filter back to &quot;All Buildings&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto timeline-scroll">
            <div className="min-w-[1040px]">
              {/* Header Row */}
              <div className="grid grid-cols-[270px_1fr] border-b border-slate-200 bg-slate-100/80 text-xs font-semibold text-slate-600">
                <div className="sticky left-0 z-10 bg-slate-100/95 backdrop-blur px-4 py-2.5 border-r border-slate-200">
                  ISATU Facility
                </div>
                <div className="grid grid-cols-14">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-r border-slate-200/70 py-2.5 text-center last:border-r-0 font-mono text-[11px]"
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
                const bookedHoursText =
                  bookedMinutes === 0
                    ? 'Free all day'
                    : `${(bookedMinutes / 60).toFixed(bookedMinutes % 60 === 0 ? 0 : 1)}h booked`;

                return (
                  <div
                    key={facility.id}
                    className="grid grid-cols-[270px_1fr] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Sticky Left Facility Details */}
                    <div className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3 flex flex-col justify-center gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-900 truncate">
                          {facility.name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-600 shrink-0">
                          {facility.id}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 shrink-0" /> {facility.building}
                        </span>
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 shrink-0">
                          <Users className="h-3 w-3" /> {facility.capacity}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        <div className="flex flex-wrap gap-1">
                          {facility.amenities.slice(0, 2).map((item) => (
                            <span
                              key={item}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                            bookedMinutes === 0
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {bookedHoursText}
                        </span>
                      </div>
                    </div>

                    {/* Hourly Grid & Booking Blocks */}
                    <div className="relative h-20">
                      <div className="grid grid-cols-14 h-full">
                        {HOURS.map((hour) => {
                          const startStr = formatHourLabel(hour);
                          const endStr = formatHourLabel(Math.min(hour + 2, 21));
                          return (
                            <button
                              key={hour}
                              type="button"
                              onClick={() => onSelectSlot(facility.id, startStr, endStr)}
                              title={`Book ${facility.name} starting at ${startStr}`}
                              className="group border-r border-slate-100 last:border-r-0 h-full flex items-center justify-center hover:bg-blue-50/70 transition-colors cursor-pointer"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white opacity-0 group-hover:opacity-100 shadow-sm transition-all scale-90 group-hover:scale-100">
                                <Plus className="h-3.5 w-3.5" />
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
                            className={`absolute top-2 bottom-2 rounded-lg text-white px-2.5 py-1.5 shadow-sm border text-left flex flex-col justify-between overflow-hidden transition-all cursor-pointer ${getBuildingBlockStyle(
                              facility.building
                            )}`}
                            title={`${booking.eventTitle} (${booking.startTime}–${booking.endTime}) — Click for details`}
                          >
                            <div className="text-[11px] font-bold leading-tight truncate">
                              {booking.eventTitle}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-white/90 truncate">
                              <Clock className="h-2.5 w-2.5 shrink-0" />
                              <span className="font-mono">
                                {booking.startTime}–{booking.endTime}
                              </span>
                              <span>·</span>
                              <span className="truncate">{booking.office}</span>
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

      {/* Clean Booking Details Popover Modal */}
      {activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[1px] p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl animate-pop-in overflow-hidden">
            <div className="flex items-center justify-between bg-[#0f295c] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <CalendarCheck2 className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold leading-tight">
                    {activeBooking.eventTitle}
                  </h3>
                  <p className="text-[11px] text-blue-200 font-mono">
                    {activeBooking.id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveBooking(null)}
                className="rounded-lg p-1 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 border border-slate-200/80">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">Facility</div>
                  <div className="font-semibold text-slate-900">
                    {activeFacility?.name ?? activeBooking.facilityId}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    Date &amp; Time
                  </div>
                  <div className="font-semibold text-slate-900 font-mono text-xs mt-0.5">
                    {activeBooking.date} · {activeBooking.startTime}–{activeBooking.endTime}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    <strong className="text-slate-800">{activeBooking.requesterName}</strong>{' '}
                    ({activeBooking.office})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    <strong className="text-slate-800">{activeBooking.attendees}</strong>{' '}
                    attendees
                    {activeFacility
                      ? ` of ${activeFacility.capacity} max capacity (${Math.round(
                          (activeBooking.attendees / activeFacility.capacity) * 100
                        )}% full)`
                      : ''}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {isDeleting ? 'Cancelling...' : 'Cancel Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBooking(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
