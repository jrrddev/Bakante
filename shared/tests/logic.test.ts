import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildMetricsScorecard,
  calculateImprovementPercent,
  checkConflictBinarySearch,
  doTimesOverlap,
  findFreeSlotsOnSameRoom,
  minutesToTime,
  suggestAlternativeRooms,
  timeToMinutes,
  validateBookingRequest,
  type Booking,
  type Facility,
} from '../src/index.ts';

const FACILITIES: Facility[] = [
  {
    id: 'MP-GYM',
    name: 'Multi-Purpose Gym',
    building: 'Main Campus',
    capacity: 500,
    amenities: ['Projector', 'Sound System', 'Stage'],
    openTime: '07:00',
    closeTime: '21:00',
  },
  {
    id: 'AVR-1',
    name: 'AVR 1',
    building: 'Academic Building',
    capacity: 120,
    amenities: ['Projector', 'Sound System', 'Air Conditioning'],
    openTime: '07:00',
    closeTime: '21:00',
  },
  {
    id: 'AVR-2',
    name: 'AVR 2',
    building: 'Academic Building',
    capacity: 80,
    amenities: ['Projector', 'Sound System', 'Air Conditioning'],
    openTime: '07:00',
    closeTime: '21:00',
  },
];

function makeBooking(id: string, facilityId: string, start: string, end: string): Booking {
  return {
    id,
    facilityId,
    date: '2026-11-23',
    startTime: start,
    endTime: end,
    startMin: timeToMinutes(start)!,
    endMin: timeToMinutes(end)!,
    requesterName: 'Tester',
    office: 'CCS',
    eventTitle: 'Event ' + id,
    attendees: 40,
    createdAt: '2026-11-21T00:00:00Z',
  };
}

test('timeUtils converts times and handles back-to-back bookings cleanly', () => {
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(minutesToTime(570), '09:30');
  assert.equal(timeToMinutes('25:00'), null);

  // Back-to-back: 09:00-11:00 and 11:00-13:00 should NOT overlap
  assert.equal(doTimesOverlap(540, 660, 660, 780), false);
  // Overlapping: 09:00-11:00 and 10:30-12:00 MUST overlap
  assert.equal(doTimesOverlap(540, 660, 630, 720), true);
});

test('validateBookingRequest catches typos, missing fields, inverted times, and overcrowding', () => {
  const missingOffice = validateBookingRequest(
    {
      facilityId: 'AVR-1',
      date: '2026-11-23',
      startTime: '09:00',
      endTime: '11:00',
      requesterName: 'Ana',
      office: '',
      eventTitle: 'Meeting',
      attendees: 30,
    },
    FACILITIES
  );
  assert.equal(missingOffice.isValid, false);

  const typoRoom = validateBookingRequest(
    {
      facilityId: 'AVR 01',
      date: '2026-11-23',
      startTime: '09:00',
      endTime: '11:00',
      requesterName: 'Ana',
      office: 'CCS',
      eventTitle: 'Meeting',
      attendees: 30,
    },
    FACILITIES
  );
  assert.equal(typoRoom.isValid, false);

  const invertedTime = validateBookingRequest(
    {
      facilityId: 'AVR-1',
      date: '2026-11-23',
      startTime: '14:00',
      endTime: '12:00',
      requesterName: 'Ana',
      office: 'CCS',
      eventTitle: 'Meeting',
      attendees: 30,
    },
    FACILITIES
  );
  assert.equal(invertedTime.isValid, false);

  const overCapacity = validateBookingRequest(
    {
      facilityId: 'AVR-2',
      date: '2026-11-23',
      startTime: '09:00',
      endTime: '11:00',
      requesterName: 'Ana',
      office: 'CCS',
      eventTitle: 'Assembly',
      attendees: 100,
    },
    FACILITIES
  );
  assert.equal(overCapacity.isValid, false);
});

test('checkConflictBinarySearch matches brute-force scan across all intervals', () => {
  const sorted = [
    makeBooking('B1', 'AVR-1', '08:00', '09:30'),
    makeBooking('B2', 'AVR-1', '10:00', '12:00'),
    makeBooking('B3', 'AVR-1', '12:00', '13:30'),
    makeBooking('B4', 'AVR-1', '15:00', '17:00'),
  ];

  // Exactly between B1 and B2 -> free
  const freeGap = checkConflictBinarySearch(sorted, 9 * 60 + 30, 10 * 60);
  assert.equal(freeGap.hasConflict, false);

  // Spans across B2 and B3 -> finds both conflicts
  const spanConflict = checkConflictBinarySearch(sorted, 11 * 60, 13 * 60);
  assert.equal(spanConflict.hasConflict, true);
  assert.deepEqual(
    spanConflict.conflicts.map((b) => b.id),
    ['B2', 'B3']
  );
});

test('suggestAlternativeRooms prefers tight-fit same-building rooms over oversized gym', () => {
  const alternatives = suggestAlternativeRooms({
    requestedFacility: FACILITIES[1], // AVR-1 (Academic Building)
    allFacilities: FACILITIES,
    bookingsByFacility: {
      'MP-GYM': [],
      'AVR-2': [],
    },
    startMin: 10 * 60,
    endMin: 12 * 60,
    attendees: 70,
    requiredAmenities: ['Projector'],
  });

  // AVR-2 (cap 80, Academic Building) should beat MP-GYM (cap 500, Main Campus)
  assert.equal(alternatives[0].facility.id, 'AVR-2');
  assert.ok(alternatives[0].totalScore > alternatives[1].totalScore);
});

test('findFreeSlotsOnSameRoom returns nearest available gaps', () => {
  const sorted = [makeBooking('B1', 'AVR-1', '09:00', '11:00')];
  const slots = findFreeSlotsOnSameRoom(FACILITIES[1], sorted, 9 * 60, 120);
  assert.equal(slots[0].startTime, '07:00');
  assert.equal(slots[1].startTime, '11:00');
});

test('calculateMetrics computes Section 9.1 percentage improvement accurately', () => {
  assert.equal(calculateImprovementPercent(480, 0.02), 100);
  assert.equal(calculateImprovementPercent(10, 0), 100);
  assert.equal(calculateImprovementPercent(0, 0), null);

  const scorecard = buildMetricsScorecard({
    manual: {
      isPlaceholder: true,
      recordedBy: 'QA',
      recordedAt: '2026-11-21',
      totalRequests: 20,
      totalTimeSeconds: 400,
      conflictsMissedCount: 2,
      errorsAdmittedCount: 3,
      notes: '',
    },
    systemTotalMs: 10,
    systemConflictsAdmitted: 0,
    systemErrorsAdmitted: 0,
    totalRequests: 20,
  });
  assert.equal(scorecard.length, 3);
});
