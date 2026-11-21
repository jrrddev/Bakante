import { useEffect, useState } from 'react';
import type { BookingEvaluation, BookingRequest, Facility } from '@bakante/shared';
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
  const isOverCapacity = selectedFacility ? form.attendees > selectedFacility.capacity : false;

  const statusBorderClass =
    preview?.status === 'AVAILABLE' || preview?.status === 'BOOKED'
      ? 'border-l-emerald-600'
      : preview?.status === 'CONFLICT'
        ? 'border-l-amber-600'
        : 'border-l-red-600';

  const statusLabelClass =
    preview?.status === 'AVAILABLE' || preview?.status === 'BOOKED'
      ? 'text-emerald-700'
      : preview?.status === 'CONFLICT'
        ? 'text-amber-700'
        : 'text-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/35 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white border border-neutral-200 shadow-lg max-h-[92vh] overflow-y-auto animate-fade-up">
        {/* Clean White Header */}
        <div className="flex items-start justify-between border-b border-neutral-200 px-6 py-4">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              New facility booking
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Availability and capacity are checked automatically as you edit.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-1.5 py-0.5 text-lg leading-none text-neutral-400 hover:text-neutral-900 cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Quiet Inline Presets */}
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 bg-neutral-50/70 px-6 py-2 text-xs text-neutral-500">
          <span>Test cases:</span>
          <button
            type="button"
            onClick={() => applyDemoPreset('conflict')}
            className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
          >
            Conflict
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset('over-capacity')}
            className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
          >
            Over-capacity
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset('back-to-back')}
            className="underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 cursor-pointer"
          >
            Back-to-back
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Facility
              </label>
              <select
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.capacity} seats)
                  </option>
                ))}
              </select>
              {selectedFacility && (
                <p className="mt-1 text-[11px] text-neutral-500">
                  {selectedFacility.building} · {selectedFacility.amenities.join(', ')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Start time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                End time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm tabular-nums"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-neutral-700">Attendees</label>
                {selectedFacility && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      isOverCapacity ? 'font-medium text-red-600' : 'text-neutral-500'
                    }`}
                  >
                    {form.attendees} / {selectedFacility.capacity}
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
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm tabular-nums ${
                  isOverCapacity ? 'border-red-500' : 'border-neutral-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Requester name
              </label>
              <input
                type="text"
                placeholder="Prof. Elena Santos"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Office / department
              </label>
              <input
                type="text"
                placeholder="College of Computer Studies"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">
              Event title
            </label>
            <input
              type="text"
              placeholder="Software Engineering Capstone Defense"
              value={form.eventTitle}
              onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Required equipment
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AMENITIES.map((item) => {
                const active = (form.requiredAmenities ?? []).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleAmenity(item)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Hairline-Bordered Status Panel */}
          {preview && (
            <div
              className={`rounded-md border border-neutral-200 border-l-2 ${statusBorderClass} bg-neutral-50/70 p-4 text-sm space-y-2`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${statusLabelClass}`}>
                  {preview.status === 'AVAILABLE' || preview.status === 'BOOKED'
                    ? 'Available'
                    : preview.status === 'CONFLICT'
                      ? 'Conflict detected'
                      : 'Invalid input'}
                </span>
                {preview.status !== 'VALIDATION_ERROR' && (
                  <span className="text-[11px] text-neutral-500 tabular-nums">
                    {preview.binarySearchSteps} binary search steps (vs.{' '}
                    {preview.linearScanSteps} linear)
                  </span>
                )}
              </div>

              <p className="text-sm text-neutral-800">{preview.message}</p>

              {preview.validationErrors.length > 1 && (
                <ul className="list-disc pl-5 text-xs text-neutral-600 space-y-0.5">
                  {preview.validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}

              {/* Best-Fit Alternative Rooms & Open Slots */}
              {preview.status === 'CONFLICT' && (
                <div className="pt-3 mt-2 border-t border-neutral-200 space-y-3">
                  {preview.alternativeRooms.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-neutral-700 mb-2">
                        Available alternatives at {form.startTime}–{form.endTime}
                      </div>
                      <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 bg-white">
                        {preview.alternativeRooms.map((alt) => (
                          <button
                            key={alt.facility.id}
                            type="button"
                            onClick={() =>
                              setForm({ ...form, facilityId: alt.facility.id })
                            }
                            className="w-full px-3 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-neutral-50 transition-colors cursor-pointer"
                          >
                            <div>
                              <div className="text-xs font-medium text-neutral-900">
                                {alt.facility.name}
                              </div>
                              <div className="text-[11px] text-neutral-500 tabular-nums">
                                {alt.facility.capacity} seats · {alt.facility.building} · Fit{' '}
                                {alt.capacityScore} + Gear {alt.amenityScore} + Bldg{' '}
                                {alt.buildingScore}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-semibold text-neutral-900 tabular-nums">
                                {alt.totalScore} / 100
                              </div>
                              <div className="text-[11px] text-neutral-500 underline underline-offset-2">
                                Select
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {preview.freeSlotsSameRoom.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-neutral-700 mb-1.5">
                        Open slots in {selectedFacility?.name}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
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
                            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 tabular-nums cursor-pointer"
                          >
                            {slot.startTime}–{slot.endTime}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-neutral-300 bg-white px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || preview?.status !== 'AVAILABLE'}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Saving...' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
