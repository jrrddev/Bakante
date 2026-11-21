import { useCallback, useEffect, useState } from 'react';
import type { Booking, BookingRequest, Facility } from '@bakante/shared';
import { api } from './api.ts';
import { BenchmarkDashboard } from './components/BenchmarkDashboard.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { CalendarGrid } from './components/CalendarGrid.tsx';
import { LogicExplainer } from './components/LogicExplainer.tsx';
import { ScheduleDashboard } from './components/ScheduleDashboard.tsx';

type Tab = 'calendar' | 'benchmark' | 'logic';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState('2026-11-23');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
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
    const [facs, bks] = await Promise.all([
      api.getFacilities(),
      api.getBookings(date),
    ]);
    setFacilities(facs);
    setBookings(bks);
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
    await api.deleteBooking(id);
    await loadSchedule(selectedDate);
    showToast('Booking cancelled and time slot released.');
  }

  async function handleResetDemo() {
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
            {/* Page Title + High-Contrast Summary */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Room Schedule
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Daily facility overview and live conflict-free timeline
                </p>
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
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
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

            <ScheduleDashboard
              facilities={facilities}
              bookings={bookings}
              selectedDate={selectedDate}
            />

            {/* Clean Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 bg-white px-4 py-3 rounded-lg">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center rounded-md border border-slate-300 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(-1)}
                    title="Previous day"
                    aria-label="Previous day"
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border-r border-slate-200 cursor-pointer"
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
                    title="Next day"
                    aria-label="Next day"
                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 border-l border-slate-200 cursor-pointer"
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
