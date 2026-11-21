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
    res.json({ ok: true, service: 'bakante-api', storage: db.isTurso ? 'turso' : 'memory' });
  });

  // List all 9 ISATU facilities
  router.get('/facilities', async (_req, res, next) => {
    try {
      res.json(await db.getFacilities());
    } catch (err) {
      next(err);
    }
  });

  // List bookings (optionally filtered by date or facilityId)
  router.get('/bookings', async (req, res, next) => {
    try {
      const date = typeof req.query.date === 'string' ? req.query.date : undefined;
      const facilityId =
        typeof req.query.facilityId === 'string' ? req.query.facilityId : undefined;
      res.json(await db.getBookings({ date, facilityId }));
    } catch (err) {
      next(err);
    }
  });

  // Live preview check (does NOT save to database)
  router.post('/bookings/check', async (req, res, next) => {
    try {
      const payload = req.body as BookingRequest;
      const result = await db.checkBookingAvailability(payload);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // Atomic booking creation (201 = booked, 409 = conflict, 400 = validation error)
  router.post('/bookings', async (req, res, next) => {
    try {
      const payload = req.body as BookingRequest;
      const result = await db.createBookingAtomic(payload);

      if (result.status === 'BOOKED') {
        res.status(201).json(result);
        return;
      }
      if (result.status === 'CONFLICT') {
        res.status(409).json(result);
        return;
      }
      res.status(400).json(result);
    } catch (err) {
      next(err);
    }
  });

  // Cancel/delete a booking
  router.delete('/bookings/:id', async (req, res, next) => {
    try {
      const deleted = await db.deleteBooking(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      res.json({ deleted: true });
    } catch (err) {
      next(err);
    }
  });

  // Reset calendar by replaying all rows from baseline/dataset.json
  router.post('/demo/reset', async (_req, res, next) => {
    try {
      const summary = await db.resetToDemoSchedule();
      res.json({ ok: true, ...summary });
    } catch (err) {
      next(err);
    }
  });

  // Get baseline dataset + recorded manual baseline results
  router.get('/baseline', (_req, res) => {
    res.json({
      dataset: loadDataset(),
      manualResults: loadManualResults(),
    });
  });

  // Save updated manual baseline timings
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
  router.post('/benchmark/import', async (req, res, next) => {
    try {
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
      });

      if (body.commitToLiveSchedule) {
        for (const row of rows) {
          await db.createBookingAtomic(row);
        }
      }

      res.json(summary);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
