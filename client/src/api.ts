import type {
  BenchmarkSummary,
  Booking,
  BookingEvaluation,
  BookingRequest,
  DatasetItem,
  Facility,
  ManualBaselineResults,
} from '@bakante/shared';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return response.json() as Promise<T>;
}

export const api = {
  getFacilities: () => requestJson<Facility[]>('/api/facilities'),

  getBookings: (date: string) =>
    requestJson<Booking[]>(`/api/bookings?date=${encodeURIComponent(date)}`),

  checkBooking: (payload: BookingRequest) =>
    requestJson<BookingEvaluation>('/api/bookings/check', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createBooking: (payload: BookingRequest) =>
    requestJson<BookingEvaluation>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteBooking: (id: string) =>
    requestJson<{ deleted: boolean }>(`/api/bookings/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

  resetDemo: () =>
    requestJson<{
      ok: boolean;
      seededCount: number;
      blockedConflicts: number;
      caughtErrors: number;
      totalDatasetItems: number;
    }>('/api/demo/reset', {
      method: 'POST',
    }),

  getBaseline: () =>
    requestJson<{ dataset: DatasetItem[]; manualResults: ManualBaselineResults }>(
      '/api/baseline'
    ),

  saveManualBaseline: (payload: Partial<ManualBaselineResults>) =>
    requestJson<ManualBaselineResults>('/api/baseline/manual', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  runBenchmarkReplay: () =>
    requestJson<BenchmarkSummary>('/api/benchmark/replay', {
      method: 'POST',
    }),

  importSpreadsheetBatch: (payload: {
    fileName: string;
    rows: Array<BookingRequest & { requestId?: string; expectedOutcome?: string }>;
    commitToLiveSchedule?: boolean;
  }) =>
    requestJson<BenchmarkSummary>('/api/benchmark/import', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
