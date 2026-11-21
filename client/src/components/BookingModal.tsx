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
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialRequest);
    setSubmitAttempted(false);
    setSubmitError(null);
  }, [initialRequest, isOpen]);

  // Run availability check whenever schedule-relevant fields change
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // Provide temporary placeholder text during live availability preview so
    // the user isn't shown "Requester name is required" before typing.
    const previewPayload: BookingRequest = {
      ...form,
      requesterName: form.requesterName.trim() || 'Preview',
      office: form.office.trim() || 'Preview',
      eventTitle: form.eventTitle.trim() || 'Preview',
    };

    api
      .checkBooking(previewPayload)
      .then((result) => {
        if (!cancelled) {
          setPreview(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    form.facilityId,
    form.date,
    form.startTime,
    form.endTime,
    form.attendees,
    form.requiredAmenities,
  ]);

  if (!isOpen) return null;

  const missingRequester = form.requesterName.trim() === '';
  const missingOffice = form.office.trim() === '';
  const missingTitle = form.eventTitle.trim() === '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);

    if (missingRequester || missingOffice || missingTitle) {
      setSubmitError('Please fill in the requester name, office, and event title.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.createBooking(form);
      setPreview(result);
      if (result.status === 'BOOKED') {
        onBooked(result.message);
        onClose();
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError('Unable to reach the server. Please check your connection and try again.');
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
    setSubmitAttempted(false);
    setSubmitError(null);
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

  const statusBoxClass =
    preview?.status === 'AVAILABLE' || preview?.status === 'BOOKED'
      ? 'bg-emerald-50/70 border-emerald-200 border-l-emerald-600'
      : preview?.status === 'CONFLICT'
        ? 'bg-amber-50/70 border-amber-200 border-l-amber-600'
        : 'bg-red-50/70 border-red-200 border-l-red-600';

  const statusLabelClass =
    preview?.status === 'AVAILABLE' || preview?.status === 'BOOKED'
      ? 'text-emerald-700'
      : preview?.status === 'CONFLICT'
        ? 'text-amber-800'
        : 'text-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/45 p-0 sm:p-4">
      <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-lg bg-white border border-slate-200 shadow-xl max-h-[92dvh] overflow-y-auto animate-fade-up">
        {/* Clean White Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-4 sm:px-6 py-3.5 sm:py-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">New facility booking</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Room availability and capacity are checked automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-1.5 py-0.5 text-lg leading-none text-slate-400 hover:text-slate-900 cursor-pointer"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Quiet Inline Presets */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 border-b border-slate-200 bg-slate-50 px-4 sm:px-6 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-500">Quick examples:</span>
          <button
            type="button"
            onClick={() => applyDemoPreset('conflict')}
            className="font-medium text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950 cursor-pointer"
          >
            Busy room (Conflict)
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset('over-capacity')}
            className="font-medium text-red-700 underline decoration-red-300 underline-offset-4 hover:text-red-900 cursor-pointer"
          >
            Too many attendees
          </button>
          <button
            type="button"
            onClick={() => applyDemoPreset('back-to-back')}
            className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-900 cursor-pointer"
          >
            Available slot
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Facility
              </label>
              <select
                value={form.facilityId}
                onChange={(e) => setForm({ ...form, facilityId: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.capacity} seats)
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
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start time
              </label>
              <input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 sm:px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End time
              </label>
              <input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 sm:px-3 py-2 text-sm text-slate-900 tabular-nums"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Attendees</label>
                {selectedFacility && (
                  <span
                    className={`text-[11px] font-semibold tabular-nums ${
                      isOverCapacity ? 'text-red-700' : 'text-slate-500'
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
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 tabular-nums ${
                  isOverCapacity ? 'border-red-500' : 'border-slate-300'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Requester name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Prof. Elena Santos"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 ${
                  submitAttempted && missingRequester
                    ? 'border-red-500'
                    : 'border-slate-300'
                }`}
              />
              {submitAttempted && missingRequester && (
                <p className="mt-1 text-[11px] text-red-600">
                  Please enter the requester&apos;s name.
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Office / department <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="College of Computer Studies"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 ${
                  submitAttempted && missingOffice
                    ? 'border-red-500'
                    : 'border-slate-300'
                }`}
              />
              {submitAttempted && missingOffice && (
                <p className="mt-1 text-[11px] text-red-600">
                  Please enter the office or department.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Event title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              placeholder="Software Engineering Capstone Defense"
              value={form.eventTitle}
              onChange={(e) => setForm({ ...form, eventTitle: e.target.value })}
              className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 ${
                submitAttempted && missingTitle ? 'border-red-500' : 'border-slate-300'
              }`}
            />
            {submitAttempted && missingTitle && (
              <p className="mt-1 text-[11px] text-red-600">
                Please enter an event title.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
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
                        ? 'border-blue-700 bg-blue-700 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Friendly Availability & Room Suggestions Panel */}
          {preview && (
            <div
              className={`rounded-md border border-l-[3px] ${statusBoxClass} p-4 text-sm space-y-2.5`}
            >
              <div
                className={`text-xs font-bold uppercase tracking-wider ${statusLabelClass}`}
              >
                {preview.status === 'AVAILABLE' || preview.status === 'BOOKED'
                  ? 'Slot available'
                  : preview.status === 'CONFLICT'
                    ? 'Room already booked at this time'
                    : 'Please check your booking details'}
              </div>

              <p className="text-sm font-medium text-slate-900">{preview.message}</p>

              {preview.validationErrors.length > 1 && (
                <ul className="list-disc pl-5 text-xs text-red-800 space-y-0.5">
                  {preview.validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}

              {/* Improved Room & Time Suggestions */}
              {preview.status === 'CONFLICT' && (
                <div className="pt-3 mt-2 border-t border-amber-200/80 space-y-3.5">
                  {preview.alternativeRooms.length > 0 ? (
                    <div>
                      <div className="text-xs font-semibold text-slate-800 mb-2">
                        Recommended available rooms for {form.startTime}–{form.endTime}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {preview.alternativeRooms.map((alt, idx) => (
                          <button
                            key={alt.facility.id}
                            type="button"
                            onClick={() =>
                              setForm({ ...form, facilityId: alt.facility.id })
                            }
                            className="group rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-blue-600 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                                    {alt.facility.name}
                                  </span>
                                  {idx === 0 && (
                                    <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                                      Best match
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                                  {alt.facility.capacity} seats · {alt.facility.building}
                                </div>
                              </div>
                              <span className="text-xs font-bold text-blue-700 tabular-nums shrink-0">
                                {alt.totalScore}%
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <div className="flex flex-wrap gap-1">
                                {(alt.matchedAmenities.length > 0
                                  ? alt.matchedAmenities
                                  : alt.facility.amenities.slice(0, 2)
                                ).map((item) => (
                                  <span
                                    key={item}
                                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                              <span className="text-[11px] font-semibold text-blue-700 group-hover:underline shrink-0">
                                Switch room
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-900">
                      No other rooms can fit {form.attendees} attendees at this time. Try one of the open time slots below.
                    </p>
                  )}

                  {preview.freeSlotsSameRoom.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-800 mb-1.5">
                        Or pick an open time in {selectedFacility?.name}
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
                            className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 tabular-nums cursor-pointer"
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

          {submitError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || preview?.status !== 'AVAILABLE'}
              className="rounded-md bg-blue-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Booking...' : 'Confirm booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
