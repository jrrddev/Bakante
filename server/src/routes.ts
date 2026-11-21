import { Router } from 'express';
import type { BookingRequest, ManualBaselineResults } from '@bakante/shared';
import {
  loadDataset,
  loadManualResults,
  runBatchBenchmark,
  runDatasetReplayBenchmark,
  saveManualResults,
  type BatchRowInput,
} from './benchmark.ts';
import type { BakanteDatabase } from './db.ts';

export function createApiRouter(db: BakanteDatabase): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'bakante-api' });
  });

  // List all 8 ISATU facilities
  router.get('/facilities', (_req, res) => {
    res.json(db.getFacilities());
  });

  // List bookings (optionally filtered by date or facilityId)
  router.get('/bookings', (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const facilityId =
      typeof req.query.facilityId === 'string' ? req.query.facilityId : undefined;
    res.json(db.getBookings({ date, facilityId }));
  });

  // Live preview check (does NOT save to database)
  router.post('/bookings/check', (req, res) => {
    const payload = req.body as BookingRequest;
    const result = db.checkBookingAvailability(payload);
    res.json(result);
  });

  // Atomic booking creation (201 = booked, 409 = conflict, 400 = validation error)
  router.post('/bookings', (req, res) => {
    const payload = req.body as BookingRequest;
    const result = db.createBookingAtomic(payload);

    if (result.status === 'BOOKED') {
      res.status(201).json(result);
      return;
    }
    if (result.status === 'CONFLICT') {
      res.status(409).json(result);
      return;
    }
    res.status(400).json(result);
  });

  // Cancel/delete a booking
  router.delete('/bookings/:id', (req, res) => {
    const deleted = db.deleteBooking(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    res.json({ deleted: true });
  });

  // Reset calendar to clean 10-booking demo dataset
  router.post('/demo/reset', (_req, res) => {
    const seededCount = db.resetToDemoSchedule();
    res.json({ ok: true, seededCount });
  });

  // Get baseline dataset + recorded manual stopwatch results
  router.get('/baseline', (_req, res) => {
    res.json({
      dataset: loadDataset(),
      manualResults: loadManualResults(),
    });
  });

  // Save updated manual stopwatch timings from QA Analyst
  router.put('/baseline/manual', (req, res) => {
    const body = req.body as Partial<ManualBaselineResults>;
    const current = loadManualResults();
    const updated: ManualBaselineResults = {
      isPlaceholder: Boolean(body.isPlaceholder ?? false),
      recordedBy: String(body.recordedBy ?? current.recordedBy),
      recordedAt: String(body.recordedAt ?? new Date().toISOString().slice(0, 10)),
      totalRequests: Number(body.totalRequests ?? current.totalRequests),
      totalTimeSeconds: Number(body.totalTimeSeconds ?? current.totalTimeSeconds),
      conflictsMissedCount: Number(
        body.conflictsMissedCount ?? current.conflictsMissedCount
      ),
      errorsAdmittedCount: Number(
        body.errorsAdmittedCount ?? current.errorsAdmittedCount
      ),
      notes: String(body.notes ?? current.notes),
    };
    res.json(saveManualResults(updated));
  });

  // Run the live 20-request dataset replay and return the Section 9.4 Scorecard
  router.post('/benchmark/replay', (_req, res) => {
    const summary = runDatasetReplayBenchmark();
    res.json(summary);
  });

  // Import a batch spreadsheet (Excel/CSV rows parsed by client) and score it live
  router.post('/benchmark/import', (req, res) => {
    const body = req.body as {
      fileName?: string;
      rows?: BatchRowInput[];
      commitToLiveSchedule?: boolean;
    };
    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) {
      res.status(400).json({ error: 'Uploaded spreadsheet contains no booking rows.' });
      return;
    }

    const summary = runBatchBenchmark(rows, {
      sourceLabel: `Spreadsheet Import: ${body.fileName || 'uploaded.xlsx'}`,
      liveDb: db,
      commitToLiveSchedule: Boolean(body.commitToLiveSchedule),
    });
    res.json(summary);
  });

  return router;
}
