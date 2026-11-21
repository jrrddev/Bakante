import { useMemo } from 'react';
import {
  AlertTriangle,
  Building2,
  CalendarCheck2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import {
  doTimesOverlap,
  timeToMinutes,
  type Booking,
  type Facility,
} from '@bakante/shared';

interface ScheduleDashboardProps {
  facilities: Facility[];
  bookings: Booking[];
  selectedDate: string;
}

const DEFAULT_OPEN_MIN = 7 * 60;
const DEFAULT_CLOSE_MIN = 21 * 60;
const HOURS = Array.from({ length: 14 }, (_, i) => 7 + i);

/**
 * Compact 4-card visual KPI strip summarizing facility occupancy,
 * daily booking volume & hourly activity, scheduled hours, and conflict status.
 */
export function ScheduleDashboard({
  facilities,
  bookings,
  selectedDate,
}: ScheduleDashboardProps) {
  const stats = useMemo(() => {
    const facilityIds = new Set(facilities.map((f) => f.id));
    const bookedFacilityIds = new Set(
      bookings.filter((b) => facilityIds.has(b.facilityId)).map((b) => b.facilityId)
    );

    const totalFacilities = facilities.length;
    const bookedFacilitiesCount = bookedFacilityIds.size;
    const openFacilitiesCount = Math.max(0, totalFacilities - bookedFacilitiesCount);
    const bookedFacilitiesPct =
      totalFacilities > 0 ? (bookedFacilitiesCount / totalFacilities) * 100 : 0;

    const totalAttendees = bookings.reduce((sum, b) => sum + b.attendees, 0);

    const hourlyCounts = HOURS.map((hour) => {
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;
      return bookings.filter((b) =>
        doTimesOverlap(b.startMin, b.endMin, slotStart, slotEnd)
      ).length;
    });
    const maxHourlyCount = Math.max(1, ...hourlyCounts);

    const totalScheduledMinutes = bookings.reduce(
      (sum, b) => sum + Math.max(0, b.endMin - b.startMin),
      0
    );
    const totalScheduledHours = (totalScheduledMinutes / 60).toFixed(1);

    const totalCapacityMinutes = facilities.reduce((sum, f) => {
      const open = timeToMinutes(f.openTime) ?? DEFAULT_OPEN_MIN;
      const close = timeToMinutes(f.closeTime) ?? DEFAULT_CLOSE_MIN;
      return sum + Math.max(0, close - open);
    }, 0);
    const totalCapacityHours = Math.round(totalCapacityMinutes / 60);
    const utilizationPct =
      totalCapacityMinutes > 0
        ? Math.min(100, (totalScheduledMinutes / totalCapacityMinutes) * 100)
        : 0;

    let conflictCount = 0;
    const bookingsByFacility = new Map<string, Booking[]>();
    for (const booking of bookings) {
      const list = bookingsByFacility.get(booking.facilityId);
      if (list) {
        list.push(booking);
      } else {
        bookingsByFacility.set(booking.facilityId, [booking]);
      }
    }
    for (const roomBookings of bookingsByFacility.values()) {
      for (let i = 0; i < roomBookings.length; i++) {
        for (let j = i + 1; j < roomBookings.length; j++) {
          if (
            doTimesOverlap(
              roomBookings[i].startMin,
              roomBookings[i].endMin,
              roomBookings[j].startMin,
              roomBookings[j].endMin
            )
          ) {
            conflictCount += 1;
          }
        }
      }
    }

    return {
      totalFacilities,
      bookedFacilitiesCount,
      openFacilitiesCount,
      bookedFacilitiesPct,
      bookingCount: bookings.length,
      totalAttendees,
      hourlyCounts,
      maxHourlyCount,
      totalScheduledHours,
      totalCapacityHours,
      utilizationPct,
      conflictCount,
    };
  }, [facilities, bookings]);

  const hasConflicts = stats.conflictCount > 0;

  return (
    <section
      aria-label="Schedule summary dashboard"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
    >
      {/* Card 1: Facilities Occupancy */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-slate-500">Facilities</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {stats.totalFacilities}
              </span>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {stats.bookedFacilitiesCount} active · {stats.openFacilitiesCount} open
              </span>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-700">
            <Building2 className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100 flex">
            <div
              style={{ width: `${stats.bookedFacilitiesPct}%` }}
              className="h-full bg-blue-700 transition-all duration-300"
              title={`${stats.bookedFacilitiesCount} booked`}
            />
            <div
              style={{ width: `${100 - stats.bookedFacilitiesPct}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`${stats.openFacilitiesCount} open all day`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
              Booked ({stats.bookedFacilitiesCount})
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Open ({stats.openFacilitiesCount})
            </span>
          </div>
        </div>
      </div>

      {/* Card 2: Bookings & Hourly Activity Sparkline */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Bookings</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                {selectedDate}
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-blue-700 tabular-nums">
                {stats.bookingCount}
              </span>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                {stats.totalAttendees.toLocaleString()} attendees
              </span>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-700">
            <CalendarCheck2 className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1">
          <div
            className="flex items-end gap-1 h-6"
            role="img"
            aria-label={`Hourly booking density from 07:00 to 21:00 on ${selectedDate}`}
          >
            {stats.hourlyCounts.map((count, idx) => {
              const hour = HOURS[idx];
              const heightPct =
                count === 0 ? 14 : Math.max(24, (count / stats.maxHourlyCount) * 100);
              return (
                <div
                  key={hour}
                  style={{ height: `${heightPct}%` }}
                  title={`${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00: ${count} booking${count === 1 ? '' : 's'}`}
                  className={`flex-1 rounded-xs transition-all duration-300 ${
                    count === 0 ? 'bg-slate-200' : 'bg-blue-600'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 tabular-nums">
            <span>07:00</span>
            <span>14:00</span>
            <span>21:00</span>
          </div>
        </div>
      </div>

      {/* Card 3: Hours Scheduled & Capacity Utilization */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-slate-500">Hours scheduled</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {stats.totalScheduledHours} hrs
              </span>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                of {stats.totalCapacityHours}h cap
              </span>
            </div>
          </div>
          <div className="rounded-md bg-slate-100 p-2 text-slate-700">
            <Clock className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              style={{
                width: `${stats.utilizationPct === 0 ? 0 : Math.max(4, stats.utilizationPct)}%`,
              }}
              className="h-full rounded-full bg-blue-700 transition-all duration-300"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
            <span>Daily utilization</span>
            <span className="font-semibold text-slate-700">
              {stats.utilizationPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Card 4: Conflict Integrity Status */}
      <div
        className={`rounded-lg border p-4 shadow-xs flex flex-col justify-between gap-3 ${
          hasConflicts
            ? 'border-red-200 bg-red-50/40'
            : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-slate-500">Conflicts</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  hasConflicts ? 'text-red-700' : 'text-emerald-700'
                }`}
              >
                {stats.conflictCount}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  hasConflicts
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {hasConflicts ? 'Overlap found' : 'Verified'}
              </span>
            </div>
          </div>
          <div
            className={`rounded-md p-2 ${
              hasConflicts
                ? 'bg-red-100 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {hasConflicts ? (
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full w-full rounded-full ${
                hasConflicts ? 'bg-red-600' : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="text-[11px] text-slate-500">
            {hasConflicts
              ? 'Overlapping room slots detected'
              : '0% double-bookings across all rooms'}
          </div>
        </div>
      </div>
    </section>
  );
}
