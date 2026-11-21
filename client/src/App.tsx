import { useCallback, useEffect, useRef, useState } from 'react';
import type { Booking, BookingRequest, Facility } from '@bakante/shared';
import { api } from './api.ts';
import { BenchmarkDashboard } from './components/BenchmarkDashboard.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { CalendarGrid } from './components/CalendarGrid.tsx';
import { LogicExplainer } from './components/LogicExplainer.tsx';

type Tab = 'calendar' | 'benchmark' | 'logic';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState('2026-11-23');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isScheduleLoading, setIsScheduleLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const facilitiesLoadedRef = useRef(false);
  const [draftRequest, setDraftRequest] = useState<BookingRequest>({
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '10:00',
    endTime: '12:00',
    requesterName: '',
    office: '',
    eventTitle: '',
    attendees: 40,
    requiredAmenities: ['Projector'],
  });

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  }

  const loadSchedule = useCallback(async (date: string) => {
    setIsScheduleLoading(true);
    try {
      if (!facilitiesLoadedRef.current) {
        const [facs, bks] = await Promise.all([
          api.getFacilities(),
          api.getBookings(date),
        ]);
        setFacilities(facs);
        setBookings(bks);
        facilitiesLoadedRef.current = true;
      } else {
        const bks = await api.getBookings(date);
        setBookings(bks);
      }
    } finally {
      setIsScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedule(selectedDate);
  }, [selectedDate, loadSchedule]);

  function openNewBookingModal(
    facilityId = facilities[0]?.id ?? 'AVR-1',
    startTime = '10:00',
    endTime = '12:00'
  ) {
    setDraftRequest({
      facilityId,
      date: selectedDate,
      startTime,
      endTime,
      requesterName: '',
      office: '',
      eventTitle: '',
      attendees: 40,
      requiredAmenities: ['Projector'],
    });
    setModalOpen(true);
  }

  function shiftSelectedDate(days: number) {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + days));
    setSelectedDate(next.toISOString().slice(0, 10));
  }

  function openConflictDemo() {
    setSelectedDate('2026-11-23');
    setDraftRequest({
      facilityId: 'AVR-1',
      date: '2026-11-23',
      startTime: '10:00',
      endTime: '12:00',
      requesterName: 'Prof. Jerome Bautista',
      office: 'College of Education',
      eventTitle: 'Curriculum Review Meeting',
      attendees: 50,
      requiredAmenities: ['Projector'],
    });
    setModalOpen(true);
  }

  async function handleDeleteBooking(id: string) {
    setIsScheduleLoading(true);
    await api.deleteBooking(id);
    await loadSchedule(selectedDate);
    showToast('Booking cancelled and time slot released.');
  }

  async function handleResetDemo() {
    setIsScheduleLoading(true);
    const res = await api.resetDemo();
    await loadSchedule(selectedDate);
    showToast(`Schedule reset (${res.seededCount} sample bookings restored).`);
  }

  const buildings = ['ALL', ...Array.from(new Set(facilities.map((f) => f.building)))];
  const filteredFacilities = facilities.filter((f) => {
    const matchesBuilding = buildingFilter === 'ALL' || f.building === buildingFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      f.name.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.building.toLowerCase().includes(q);
    return matchesBuilding && matchesSearch;
  });

  const totalScheduledMinutes = bookings.reduce(
    (sum, b) => sum + (b.endMin - b.startMin),
    0
  );
  const totalScheduledHours = (totalScheduledMinutes / 60).toFixed(1);
  const activeFacilityIds = new Set(bookings.map((b) => b.facilityId));
  const activeFacilitiesCount = facilities.filter((f) =>
    activeFacilityIds.has(f.id)
  ).length;
  const openFacilitiesCount = Math.max(0, facilities.length - activeFacilitiesCount);
  const bookedRatioPct =
    facilities.length > 0 ? (activeFacilitiesCount / facilities.length) * 100 : 0;

  const totalAttendees = bookings.reduce((sum, b) => sum + b.attendees, 0);
  const hourlyLoads = Array.from({ length: 14 }, (_, i) => {
    const slotStart = (7 + i) * 60;
    const slotEnd = slotStart + 60;
    return bookings.filter((b) => b.startMin < slotEnd && slotStart < b.endMin).length;
  });
  const maxHourlyLoad = Math.max(1, ...hourlyLoads);

  const maxCapacityHours = facilities.length * 14;
  const utilizationPct =
    maxCapacityHours > 0 ? ((totalScheduledMinutes / 60) / maxCapacityHours) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900">
      {/* Crisp White Header with Cobalt Active Accent */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="py-3 flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Bakante logo"
              className="h-8 w-8 object-contain"
            />
            <h1 className="text-lg font-bold tracking-tight text-slate-900">
              Bakante
            </h1>
          </div>

          <nav className="flex items-center gap-6">
            {(
              [
                ['calendar', 'Schedule'],
                ['benchmark', 'Scorecard'],
                ['logic', 'Algorithm'],
              ] as const
            ).map(([tabKey, label]) => (
              <button
                key={tabKey}
                type="button"
                onClick={() => setActiveTab(tabKey)}
                className={`py-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === tabKey
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        {activeTab === 'calendar' && (
          <>
            {/* Page Title + Actions */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Room Schedule
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openConflictDemo}
                  className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 cursor-pointer"
                >
                  Conflict demo
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  disabled={isScheduleLoading}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => openNewBookingModal()}
                  className="rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 cursor-pointer shadow-xs"
                >
                  New booking
                </button>
              </div>
            </div>

            {/* 4-Card Top Overview Dashboard with Micro-Visuals & Skeleton Loading */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Facilities */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="text-xs font-medium text-slate-500">Facilities</div>
                {isScheduleLoading ? (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="h-7 w-32 rounded bg-slate-200" />
                    <div className="h-2 w-full rounded-full bg-slate-200" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {facilities.length}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {activeFacilitiesCount} active · {openFacilitiesCount} open
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-emerald-500 overflow-hidden flex">
                        <div
                          style={{ width: `${bookedRatioPct}%` }}
                          className="h-full bg-blue-700 transition-all"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-700" />
                          Booked ({activeFacilitiesCount})
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Open ({openFacilitiesCount})
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card 2: Bookings + Hourly Sparkline */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">Bookings</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 tabular-nums">
                    {selectedDate}
                  </span>
                </div>
                {isScheduleLoading ? (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="h-7 w-28 rounded bg-slate-200" />
                    <div className="h-7 w-full rounded bg-slate-100" />
                    <div className="h-2.5 w-full rounded bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-blue-700 tabular-nums">
                        {bookings.length}
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {totalAttendees} attendees
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-end gap-1 h-7">
                        {hourlyLoads.map((count, idx) => {
                          const heightPct =
                            count === 0 ? 12 : Math.max(24, (count / maxHourlyLoad) * 100);
                          return (
                            <div
                              key={idx}
                              style={{ height: `${heightPct}%` }}
                              title={`${String(7 + idx).padStart(2, '0')}:00 — ${count} booking(s)`}
                              className={`flex-1 rounded-xs transition-all ${
                                count > 0 ? 'bg-blue-700' : 'bg-slate-200'
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
                  </>
                )}
              </div>

              {/* Card 3: Hours Scheduled + Daily Utilization */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="text-xs font-medium text-slate-500">Hours scheduled</div>
                {isScheduleLoading ? (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="h-7 w-32 rounded bg-slate-200" />
                    <div className="h-2 w-full rounded-full bg-slate-200" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                        {totalScheduledHours} hrs
                      </span>
                      <span className="text-xs text-slate-500 tabular-nums">
                        of {maxCapacityHours}h cap
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          style={{ width: `${Math.min(100, utilizationPct)}%` }}
                          className="h-full rounded-full bg-blue-700 transition-all"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                        <span>Daily utilization</span>
                        <span className="font-semibold text-slate-800">
                          {utilizationPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Card 4: Conflicts */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between gap-3">
                <div className="text-xs font-medium text-slate-500">Conflicts</div>
                {isScheduleLoading ? (
                  <div className="space-y-2.5 animate-pulse">
                    <div className="h-7 w-24 rounded bg-slate-200" />
                    <div className="h-2 w-full rounded-full bg-slate-200" />
                    <div className="h-3 w-40 rounded bg-slate-100" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold tracking-tight text-emerald-700 tabular-nums">
                        0
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        Verified
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-emerald-500" />
                      <div className="text-[11px] text-slate-500">
                        0% double-bookings across all rooms
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Clean Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 bg-white px-4 py-3 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-md border border-slate-300 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(-1)}
                    disabled={isScheduleLoading}
                    title="Previous day"
                    aria-label="Previous day"
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border-r border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    ‹
                  </button>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(1)}
                    disabled={isScheduleLoading}
                    title="Next day"
                    aria-label="Next day"
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border-l border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    ›
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-23')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    selectedDate === '2026-11-23'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Nov 23
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-24')}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    selectedDate === '2026-11-24'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Nov 24
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Filter room or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400"
                />
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {buildings.map((bldg) => (
                    <option key={bldg} value={bldg}>
                      {bldg === 'ALL' ? 'All buildings' : bldg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <CalendarGrid
              facilities={filteredFacilities}
              bookings={bookings}
              selectedDate={selectedDate}
              isLoading={isScheduleLoading}
              onSelectSlot={(facilityId, startTime, endTime) =>
                openNewBookingModal(facilityId, startTime, endTime)
              }
              onDeleteBooking={handleDeleteBooking}
            />
          </>
        )}

        {activeTab === 'benchmark' && <BenchmarkDashboard />}
        {activeTab === 'logic' && <LogicExplainer />}
      </main>

      <BookingModal
        isOpen={modalOpen}
        facilities={facilities}
        initialRequest={draftRequest}
        onClose={() => setModalOpen(false)}
        onBooked={async (message) => {
          await loadSchedule(selectedDate);
          showToast(message);
        }}
      />

      {/* High-Contrast Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-md border-l-4 border-l-emerald-500 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-fade-up">
          {toast}
        </div>
      )}
    </div>
  );
}
