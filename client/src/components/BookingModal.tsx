import { useEffect, useState } from 'react';
import type { BookingEvaluation, BookingRequest, Facility } from '@bakante/shared';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import { api } from '../api.ts';

interface BookingModalProps {
  isOpen: boolean;
  facilities: Facility[];
  initialRequest: BookingRequest;
  onClose: () => void;
  onBooked: (message: string) => void;
}

const ALL_AMENITIES = [
  'Projector',
  'Sound System',
  'Air Conditioning',
  'Lab PCs',
  'Video Conferencing',
  'Stage',
  'Whiteboard',
];

export function BookingModal({
  isOpen,
  facilities,
  initialRequest,
  onClose,
  onBooked,
}: BookingModalProps) {
  const [form, setForm] = useState<BookingRequest>(initialRequest);
  const [preview, setPreview] = useState<BookingEvaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(initialRequest);
  }, [initialRequest]);

  // Live dry-run check whenever form fields change
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    api.checkBooking(form).then((result) => {
      if (!cancelled) {
        setPreview(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, form]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await api.createBooking(form);
      setPreview(result);
      if (result.status === 'BOOKED') {
        onBooked(result.message);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleAmenity(item: string) {
    const current = form.requiredAmenities ?? [];
    const next = current.includes(item)
      ? current.filter((a) => a !== item)
      : [...current, item];
    setForm({ ...form, requiredAmenities: next });
  }

  function applyDemoPreset(preset: 'conflict' | 'back-to-back' | 'over-capacity') {
    if (preset === 'conflict') {
      setForm({
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
    } else if (preset === 'back-to-back') {
      setForm({
        facilityId: 'AVR-1',
        date: '2026-11-23',
        startTime: '13:00',
        endTime: '15:00',
        requesterName: 'Prof. Carla Reyes',
        office: 'College of Engineering',
        eventTitle: 'Afternoon Robotics Briefing',
        attendees: 65,
        requiredAmenities: ['Projector'],
      });
    } else {
      setForm({
        facilityId: 'ICT-102',
        date: '2026-11-23',
        startTime: '13:00',
        endTime: '15:00',
        requesterName: 'Prof. Leo Navarro',
        office: 'Department of Information Systems',
        eventTitle: 'IS General Assembly',
        attendees: 120,
        requiredAmenities: ['Projector'],
      });
    }
  }

  const selectedFacility = facilities.find((f) => f.id === form.facilityId);
  const capacityRatio = selectedFacility
    ? Math.min(100, Math.round((form.attendees / selectedFacility.capacity) * 100))
    : 0;
  const isOverCapacity = selectedFacility ? form.attendees > selectedFacility.capacity : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 backdrop-blur-[1px] p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-pop-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between bg-[#0f295c] px-6 py-4 text-white">
          <div>
            <h3 className="text-lg font-bold">New Facility Booking</h3>
            <p className="text-xs text-blue-200">
              Upfront validation + O(log n) Binary Search check runs automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-blue-200 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1-Click Pitch Demo Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-6 py-2.5">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Wand2 className="h-3.5 w-3.5 text-amber-500" /> Quick Pitch Presets:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyDemoPreset('conflict')}
              className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
            >
              Trigger Conflict (10:00–12:00)
            </button>
            <button
              type="button"
              onClick={() => applyDemoPreset('over-capacity')}
              className="rounded-full border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 cursor-pointer"
            >
              Trigger Over-Capacity
            </button>
            <button
              type="button"
              onClick={() => applyDemoPreset('back-to-back')}
              className="rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
            >
              Valid Back-to-Back (13:00–15:00)
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Room & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISATU Facility
              </label>
              <select
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (Cap: {f.capacity})
                  </option>
                ))}
              </select>
              {selectedFacility && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {selectedFacility.building} · {selectedFacility.amenities.join(', ')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Time Range & Attendees with Live Capacity Gauge */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Attendees</label>
                {selectedFacility && (
                  <span
                    className={`text-[10px] font-bold ${
                      isOverCapacity ? 'text-rose-600' : 'text-slate-500'
                    }`}
                  >
                    {form.attendees}/{selectedFacility.capacity} seats
                  </span>
                )}
              </div>
              <input
                type="number"
                min={1}
                value={form.attendees}
                onChange={(e) =>
                  setForm({ ...form, attendees: Number(e.target.value) || 0 })
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${
                  isOverCapacity
                    ? 'border-rose-400 bg-rose-50/40 focus:border-rose-600'
                    : 'border-slate-300 focus:border-blue-600'
                }`}
              />
              {selectedFacility && (
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${capacityRatio}%` }}
                    className={`h-full transition-all ${
                      isOverCapacity ? 'bg-rose-500' : 'bg-blue-600'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Requester Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requester Name
              </label>
              <input
                type="text"
                placeholder="e.g. Prof. Elena Santos"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Office / Department
              </label>
              <input
                type="text"
                placeholder="e.g. College of Computer Studies"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event Title
            </label>
            <input
              type="text"
              placeholder="e.g. Software Engineering Capstone Defense"
              value={form.eventTitle}
              onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Required Amenities */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Required Equipment (used to score Best-Fit alternative rooms)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AMENITIES.map((item) => {
                const active = (form.requiredAmenities ?? []).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Algorithm Feedback Panel */}
          {preview && (
            <div
              className={`rounded-xl border p-4 text-sm ${
                preview.status === 'AVAILABLE' || preview.status === 'BOOKED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : preview.status === 'CONFLICT'
                    ? 'border-amber-300 bg-amber-50 text-amber-950'
                    : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {preview.status === 'AVAILABLE' || preview.status === 'BOOKED' ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : preview.status === 'CONFLICT' ? (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-2">
                  <div className="font-semibold">{preview.message}</div>
                  {preview.status !== 'VALIDATION_ERROR' && (
                    <div className="text-xs opacity-80">
                      Binary Search inspected <strong>{preview.binarySearchSteps}</strong>{' '}
                      steps (vs. {preview.linearScanSteps} in a manual scan).
                    </div>
                  )}

                  {preview.validationErrors.length > 1 && (
                    <ul className="list-disc pl-5 text-xs space-y-0.5">
                      {preview.validationErrors.map((err) => (
                        <li key={err}>{err}</li>
                      ))}
                    </ul>
                  )}

                  {/* 1-Click Smart Alternatives */}
                  {preview.status === 'CONFLICT' && (
                    <div className="pt-2.5 space-y-3 border-t border-amber-200/80">
                      {preview.alternativeRooms.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-2">
                            <Sparkles className="h-3.5 w-3.5 text-amber-600" /> Best-Fit Free Rooms at{' '}
                            {form.startTime}–{form.endTime}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {preview.alternativeRooms.map((alt) => (
                              <button
                                key={alt.facility.id}
                                type="button"
                                onClick={() =>
                                  setForm({ ...form, facilityId: alt.facility.id })
                                }
                                className="text-left rounded-xl border border-amber-300 bg-white p-3 hover:border-blue-600 hover:shadow-sm transition-all cursor-pointer group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                                    {alt.facility.name}
                                  </span>
                                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                    {alt.totalScore}/100
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Cap {alt.facility.capacity} · {alt.facility.building}
                                </div>
                                {/* Mini 100-pt Score Breakdown Bar */}
                                <div className="mt-2 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                  <div
                                    style={{ width: `${alt.capacityScore}%` }}
                                    className="bg-blue-600"
                                    title={`Capacity Fit: ${alt.capacityScore}/45`}
                                  />
                                  <div
                                    style={{ width: `${alt.amenityScore}%` }}
                                    className="bg-emerald-500"
                                    title={`Equipment Match: ${alt.amenityScore}/35`}
                                  />
                                  <div
                                    style={{ width: `${alt.buildingScore}%` }}
                                    className="bg-amber-500"
                                    title={`Same Building: ${alt.buildingScore}/20`}
                                  />
                                </div>
                                <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                                  <span>
                                    Fit {alt.capacityScore} · Gear {alt.amenityScore} · Bldg{' '}
                                    {alt.buildingScore}
                                  </span>
                                  <span className="inline-flex items-center gap-0.5 font-semibold text-blue-700">
                                    Switch <ArrowRight className="h-2.5 w-2.5" />
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.freeSlotsSameRoom.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1.5">
                            <Clock className="h-3.5 w-3.5 text-amber-600" /> Nearest Open Slots in{' '}
                            {selectedFacility?.name}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {preview.freeSlotsSameRoom.map((slot) => (
                              <button
                                key={slot.startTime}
                                type="button"
                                onClick={() =>
                                  setForm({
                                    ...form,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                  })
                                }
                                className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:border-blue-600 hover:bg-blue-50 cursor-pointer"
                              >
                                {slot.startTime} – {slot.endTime}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || preview?.status !== 'AVAILABLE'}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              {isSubmitting ? 'Saving...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
