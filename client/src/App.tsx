import { useCallback, useEffect, useState } from 'react';
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

  const totalScheduledHours = (
    bookings.reduce((sum, b) => sum + (b.endMin - b.startMin), 0) / 60
  ).toFixed(1);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      {/* Minimal White Header */}
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="py-4 flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-neutral-900">
              Bakante
            </h1>
            <span className="text-xs text-neutral-500">
              ISATU Facility &amp; Room Booking · Track 5
            </span>
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
                className={`py-4 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === tabKey
                    ? 'border-neutral-900 text-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
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
            {/* Page Title + Quiet Typographic Summary */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                  Room Schedule
                </h2>
                <p className="mt-1 text-sm text-neutral-500 tabular-nums">
                  {facilities.length} facilities · {bookings.length} bookings on{' '}
                  {selectedDate} · {totalScheduledHours} hrs scheduled · 0 conflicts
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openConflictDemo}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Conflict demo
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => openNewBookingModal()}
                  className="rounded-md bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 cursor-pointer"
                >
                  New booking
                </button>
              </div>
            </div>

            {/* Clean Toolbar: Date, Search & Building Filter */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-neutral-200 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-23')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                    selectedDate === '2026-11-23'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-200/60'
                  }`}
                >
                  Nov 23
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-24')}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                    selectedDate === '2026-11-24'
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-600 hover:bg-neutral-200/60'
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
                  className="w-48 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs placeholder:text-neutral-400"
                />
                <select
                  value={buildingFilter}
                  onChange={(e) => setBuildingFilter(e.target.value)}
                  className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700"
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

      {/* Minimal Monochrome Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 rounded-md bg-neutral-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-fade-up">
          {toast}
        </div>
      )}
    </div>
  );
}
