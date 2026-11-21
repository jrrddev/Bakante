import { useCallback, useEffect, useState } from 'react';
import type { Booking, BookingRequest, Facility } from '@bakante/shared';
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
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
    setTimeout(() => setToast(null), 3500);
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
    showToast(`Demo schedule reset (${res.seededCount} sample bookings loaded).`);
  }

  // Filter facilities for calendar display
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
    <div className="min-h-screen bg-slate-100/70 text-slate-900">
      {/* Polished ISATU Navy Top Navbar */}
      <header className="bg-gradient-to-r from-[#0b1f47] via-[#0f295c] to-[#163a7d] text-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-[#0b1f47] font-black text-lg shadow-sm">
              B
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">Bakante</h1>
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  Track 5
                </span>
              </div>
              <p className="text-xs text-blue-200">
                ISATU Real-Time Facility &amp; Room Booking System
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-xl bg-white/10 p-1 backdrop-blur">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'calendar'
                  ? 'bg-white text-[#0f295c] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Live Calendar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('benchmark')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'benchmark'
                  ? 'bg-white text-[#0f295c] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Baseline &amp; Scorecard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('logic')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'logic'
                  ? 'bg-white text-[#0f295c] shadow-sm'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> How It Works
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-5">
        {activeTab === 'calendar' && (
          <>
            {/* 4-Card Overview Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs flex items-center gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">ISATU Rooms</div>
                  <div className="text-lg font-bold text-slate-900">{facilities.length}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs flex items-center gap-3">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-700">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">
                    Bookings ({selectedDate})
                  </div>
                  <div className="text-lg font-bold text-slate-900">{bookings.length}</div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs flex items-center gap-3">
                <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-500">Scheduled Hours</div>
                  <div className="text-lg font-bold text-slate-900">
                    {totalScheduledHours} hrs
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 shadow-xs flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-emerald-800">
                    Conflict Guard
                  </div>
                  <div className="text-sm font-bold text-emerald-900">
                    Active (0% Overlap)
                  </div>
                </div>
              </div>
            </div>

            {/* Date & Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-semibold text-slate-600">Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-23')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors ${
                    selectedDate === '2026-11-23'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Day 1 (Nov 23)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate('2026-11-24')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors ${
                    selectedDate === '2026-11-24'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Day 2 (Nov 24)
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openConflictDemo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Demo Conflict
                </button>
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset Demo
                </button>
                <button
                  type="button"
                  onClick={() => openNewBookingModal()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer shadow-sm"
                >
                  <Plus className="h-4 w-4" /> New Booking
                </button>
              </div>
            </div>

            {/* Search & Building Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search room or ID (e.g. AVR-01)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap gap-1.5">
                {buildings.map((bldg) => (
                  <button
                    key={bldg}
                    type="button"
                    onClick={() => setBuildingFilter(bldg)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border cursor-pointer transition-colors ${
                      buildingFilter === bldg
                        ? 'border-[#0f295c] bg-[#0f295c] text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {bldg === 'ALL' ? 'All Buildings' : bldg.replace(' Building', '')}
                  </button>
                ))}
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

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white shadow-lg animate-pop-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
