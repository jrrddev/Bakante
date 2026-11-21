import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadDataset,
  runBatchBenchmark,
  runDatasetReplayBenchmark,
} from '../src/benchmark.ts';
import { BakanteDatabase } from '../src/db.ts';

test('BakanteDatabase creates bookings, blocks conflicts (409-equivalent), and returns alternatives', () => {
  const db = new BakanteDatabase(':memory:');

  // 1. Valid booking
  const first = db.createBookingAtomic({
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '09:00',
    endTime: '11:00',
    requesterName: 'Prof. Santos',
    office: 'CAS',
    eventTitle: 'Seminar A',
    attendees: 70,
    requiredAmenities: ['Projector'],
  });
  assert.equal(first.status, 'BOOKED');

  // 2. Back-to-back booking at 11:00-13:00 MUST succeed
  const adjacent = db.createBookingAtomic({
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '11:00',
    endTime: '13:00',
    requesterName: 'Engr. Reyes',
    office: 'COE',
    eventTitle: 'Seminar B',
    attendees: 60,
  });
  assert.equal(adjacent.status, 'BOOKED');

  // 3. Overlapping booking 10:00-12:00 MUST be blocked with alternatives
  const conflict = db.createBookingAtomic({
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '10:00',
    endTime: '12:00',
    requesterName: 'Prof. Cruz',
    office: 'COE',
    eventTitle: 'Overlap Test',
    attendees: 50,
    requiredAmenities: ['Projector'],
  });
  assert.equal(conflict.status, 'CONFLICT');
  assert.equal(conflict.conflicts.length, 2);
  assert.ok(conflict.alternativeRooms.length > 0);
  assert.ok(conflict.freeSlotsSameRoom.length > 0);

  db.close();
});

test('20-request dataset replay matches every expected outcome with 0% conflicts and 0% errors', () => {
  const summary = runDatasetReplayBenchmark();

  assert.equal(summary.totalRequests, 20);
  assert.equal(summary.bookedCount, 10);
  assert.equal(summary.conflictBlockedCount, 6);
  assert.equal(summary.errorCaughtCount, 4);
  assert.equal(summary.allMatchedExpectations, true);
  assert.equal(summary.manualBaseline.totalTimeSeconds, 360);
  assert.equal(summary.bakanteManualTimeSeconds, 120);
  assert.equal(summary.bakanteManualImprovementPercent, 66.67);
  assert.equal(summary.scorecard[0].improvementPercent, 99.99);
  assert.equal(summary.scorecard[1].improvementPercent, 100);
  assert.equal(summary.scorecard[2].improvementPercent, 100);
});

test('batch spreadsheet import scores custom rows proportionally against 18.0 s/req walk-in baseline', () => {
  const dataset = loadDataset();
  const summary = runBatchBenchmark(dataset, {
    sourceLabel: 'Spreadsheet Import: dataset.xlsx',
  });

  assert.equal(summary.sourceLabel, 'Spreadsheet Import: dataset.xlsx');
  assert.equal(summary.manualBaseline.totalTimeSeconds, 360);
  assert.equal(summary.manualBaseline.conflictsMissedCount, 6);
  assert.equal(summary.manualBaseline.errorsAdmittedCount, 4);
  assert.equal(summary.scorecard[1].baselineDisplay, '30.0% (6/20 in unvalidated sheet)');
  assert.equal(summary.scorecard[2].baselineDisplay, '20.0% (4/20 in unvalidated sheet)');
});
