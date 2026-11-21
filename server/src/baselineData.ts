import fs from 'node:fs';
import path from 'node:path';
import type { DatasetItem, Facility, ManualBaselineResults } from '@bakante/shared';
import { BASELINE_DIR } from './paths.ts';

/**
 * Embedded default data so Vercel serverless deployments work even when
 * the `baseline/` folder is outside the `server/` service root.
 */
export const DEFAULT_FACILITIES: Facility[] = [
  {
    id: 'ICT-301',
    name: 'ICT 301 Lecture Room',
    building: 'ICT Building',
    capacity: 60,
    amenities: ['Projector', 'Air Conditioning', 'Whiteboard'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'ICT-201',
    name: 'ICT 201 Lecture Room',
    building: 'ICT Building',
    capacity: 60,
    amenities: ['Projector', 'Air Conditioning', 'Whiteboard'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'ICT-102',
    name: 'ICT 102 Computer Lab',
    building: 'ICT Building',
    capacity: 45,
    amenities: ['Lab PCs', 'Projector', 'Air Conditioning'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'ICT-103',
    name: 'ICT 103 Computer Lab',
    building: 'ICT Building',
    capacity: 45,
    amenities: ['Lab PCs', 'Projector', 'Air Conditioning'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'AVR-1',
    name: 'AVR 1',
    building: 'Academic Building',
    capacity: 120,
    amenities: ['Projector', 'Sound System', 'Air Conditioning'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'AVR-2',
    name: 'AVR 2',
    building: 'Academic Building',
    capacity: 80,
    amenities: ['Projector', 'Sound System', 'Air Conditioning'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'MP-GYM',
    name: 'Multi-Purpose Gym',
    building: 'Main Campus',
    capacity: 500,
    amenities: ['Sound System', 'Stage', 'Projector'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'TEB-210',
    name: 'TEB 210 Lecture Room',
    building: 'TEB Building',
    capacity: 55,
    amenities: ['Projector', 'Whiteboard', 'Air Conditioning'],
    openTime: '03:00',
    closeTime: '23:00',
  },
  {
    id: 'TEB-208',
    name: 'TEB 208 Lecture Room',
    building: 'TEB Building',
    capacity: 55,
    amenities: ['Projector', 'Whiteboard'],
    openTime: '03:00',
    closeTime: '23:00',
  },
];

export const DEFAULT_DATASET: DatasetItem[] = [
  {
    requestId: 'REQ-01',
    facilityId: 'MP-GYM',
    date: '2026-11-23',
    startTime: '08:00',
    endTime: '10:00',
    requesterName: 'Dr. Elena Santos',
    office: 'Office of Student Affairs',
    eventTitle: 'Freshmen General Orientation',
    attendees: 350,
    requiredAmenities: ['Projector', 'Sound System'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid large Multi-Purpose Gym booking',
  },
  {
    requestId: 'REQ-02',
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '09:00',
    endTime: '11:00',
    requesterName: 'Prof. Mark Villanueva',
    office: 'College of Arts & Sciences',
    eventTitle: 'Research Colloquium Part 1',
    attendees: 90,
    requiredAmenities: ['Projector', 'Sound System'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid morning AVR 1 booking',
  },
  {
    requestId: 'REQ-03',
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '11:00',
    endTime: '13:00',
    requesterName: 'Engr. Carla Reyes',
    office: 'College of Engineering',
    eventTitle: 'CAD Workshop Briefing',
    attendees: 60,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid back-to-back boundary (11:00 starts when REQ-02 ends)',
  },
  {
    requestId: 'REQ-04',
    facilityId: 'AVR-1',
    date: '2026-11-23',
    startTime: '10:00',
    endTime: '12:00',
    requesterName: 'Prof. Jerome Bautista',
    office: 'College of Education',
    eventTitle: 'Curriculum Review Meeting',
    attendees: 50,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: spans across both REQ-02 (09:00-11:00) and REQ-03 (11:00-13:00)',
  },
  {
    requestId: 'REQ-05',
    facilityId: 'ICT-102',
    date: '2026-11-23',
    startTime: '08:00',
    endTime: '11:00',
    requesterName: 'Prof. Nina Cruz',
    office: 'Department of Computer Science',
    eventTitle: 'Algorithms Hands-On Exam',
    attendees: 40,
    requiredAmenities: ['Lab PCs', 'Projector'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid ICT 102 computer lab booking',
  },
  {
    requestId: 'REQ-06',
    facilityId: 'ICT-102',
    date: '2026-11-23',
    startTime: '09:00',
    endTime: '10:00',
    requesterName: 'Mr. Paolo Mendoza',
    office: 'Information Technology Dept',
    eventTitle: 'Database Quiz',
    attendees: 35,
    requiredAmenities: ['Lab PCs'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: nested completely inside REQ-05 (08:00-11:00)',
  },
  {
    requestId: 'REQ-07',
    facilityId: 'ICT-301',
    date: '2026-11-23',
    startTime: '13:00',
    endTime: '15:00',
    requesterName: 'Dir. Ramon Torres',
    office: 'Planning & Development Office',
    eventTitle: 'Q4 Curriculum Alignment',
    attendees: 45,
    requiredAmenities: ['Projector', 'Whiteboard'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid ICT 301 lecture room booking',
  },
  {
    requestId: 'REQ-08',
    facilityId: 'ICT-301',
    date: '2026-11-23',
    startTime: '13:00',
    endTime: '15:00',
    requesterName: 'Ms. Grace Lim',
    office: 'Quality Assurance Office',
    eventTitle: 'ISO Audit Pre-Meeting',
    attendees: 50,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: exact duplicate time slot of REQ-07',
  },
  {
    requestId: 'REQ-09',
    facilityId: 'ICT-102',
    date: '2026-11-23',
    startTime: '13:00',
    endTime: '15:00',
    requesterName: 'Prof. Leo Navarro',
    office: 'Department of Information Systems',
    eventTitle: 'IS General Assembly',
    attendees: 120,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'VALIDATION_ERROR',
    scenarioNote: 'Error trap: 120 attendees exceeds ICT-102 capacity of 45',
  },
  {
    requestId: 'REQ-10',
    facilityId: 'AVR 01',
    date: '2026-11-23',
    startTime: '14:00',
    endTime: '16:00',
    requesterName: 'Ms. Angela Flores',
    office: 'University Student Council',
    eventTitle: 'Leadership Seminar',
    attendees: 70,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'VALIDATION_ERROR',
    scenarioNote: "Error trap: invalid room ID typo ('AVR 01' instead of 'AVR-1')",
  },
  {
    requestId: 'REQ-11',
    facilityId: 'TEB-210',
    date: '2026-11-23',
    startTime: '13:00',
    endTime: '17:00',
    requesterName: 'Dean Teresa Go',
    office: 'College of Education',
    eventTitle: 'Teaching Internship Summit',
    attendees: 50,
    requiredAmenities: ['Projector', 'Whiteboard'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid afternoon TEB 210 lecture room booking',
  },
  {
    requestId: 'REQ-12',
    facilityId: 'TEB-210',
    date: '2026-11-23',
    startTime: '16:00',
    endTime: '18:00',
    requesterName: 'Mr. Kevin Uy',
    office: 'Alumni Relations Office',
    eventTitle: 'Alumni Homecoming Planning',
    attendees: 40,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: partial end overlap with REQ-11 (13:00-17:00)',
  },
  {
    requestId: 'REQ-13',
    facilityId: 'TEB-208',
    date: '2026-11-23',
    startTime: '14:00',
    endTime: '12:00',
    requesterName: 'Engr. Dante Ramos',
    office: 'Teacher Education Dept',
    eventTitle: 'Lesson Plan Review',
    attendees: 45,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'VALIDATION_ERROR',
    scenarioNote: 'Error trap: inverted time range (14:00 end before 12:00)',
  },
  {
    requestId: 'REQ-14',
    facilityId: 'ICT-201',
    date: '2026-11-23',
    startTime: '10:00',
    endTime: '12:00',
    requesterName: 'Engr. Sofia Tan',
    office: 'College of Computing & Informatics',
    eventTitle: 'Systems Architecture Lecture',
    attendees: 45,
    requiredAmenities: ['Projector', 'Whiteboard'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid ICT 201 lecture room booking',
  },
  {
    requestId: 'REQ-15',
    facilityId: 'MP-GYM',
    date: '2026-11-24',
    startTime: '08:00',
    endTime: '12:00',
    requesterName: 'Dr. Victor Robles',
    office: 'Office of the University President',
    eventTitle: 'Foundation Day Convocation',
    attendees: 400,
    requiredAmenities: ['Projector', 'Sound System', 'Stage'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid Day 2 Multi-Purpose Gym booking',
  },
  {
    requestId: 'REQ-16',
    facilityId: 'MP-GYM',
    date: '2026-11-24',
    startTime: '07:00',
    endTime: '09:00',
    requesterName: 'Ms. Clarisse Sy',
    office: 'Cultural & Performing Arts',
    eventTitle: 'Chorale Technical Rehearsal',
    attendees: 120,
    requiredAmenities: ['Sound System', 'Stage'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: partial start overlap with REQ-15 (08:00-12:00)',
  },
  {
    requestId: 'REQ-17',
    facilityId: 'ICT-103',
    date: '2026-11-24',
    startTime: '09:00',
    endTime: '12:00',
    requesterName: 'Prof. Marco Diaz',
    office: '',
    eventTitle: 'Web Security Lab',
    attendees: 35,
    requiredAmenities: ['Lab PCs'],
    expectedOutcome: 'VALIDATION_ERROR',
    scenarioNote: 'Error trap: missing required office/department field',
  },
  {
    requestId: 'REQ-18',
    facilityId: 'ICT-103',
    date: '2026-11-24',
    startTime: '09:00',
    endTime: '12:00',
    requesterName: 'Prof. Marco Diaz',
    office: 'MSCS Program',
    eventTitle: 'Web Security Lab',
    attendees: 35,
    requiredAmenities: ['Lab PCs', 'Projector'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid booking after REQ-17 was rejected for missing office',
  },
  {
    requestId: 'REQ-19',
    facilityId: 'AVR-2',
    date: '2026-11-24',
    startTime: '13:00',
    endTime: '16:00',
    requesterName: 'Dr. Hannah Yu',
    office: 'Research & Extension Office',
    eventTitle: 'Faculty Grant Writing Clinic',
    attendees: 65,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'BOOKED',
    scenarioNote: 'Valid afternoon AVR 2 booking',
  },
  {
    requestId: 'REQ-20',
    facilityId: 'AVR-2',
    date: '2026-11-24',
    startTime: '14:30',
    endTime: '15:30',
    requesterName: 'Ms. Bea Velasco',
    office: 'Guidance & Counseling Office',
    eventTitle: 'Peer Facilitators Orientation',
    attendees: 45,
    requiredAmenities: ['Projector'],
    expectedOutcome: 'CONFLICT',
    scenarioNote: 'Conflict trap: mid-afternoon overlap inside REQ-19 (13:00-16:00)',
  },
];

export const DEFAULT_MANUAL_RESULTS: ManualBaselineResults = {
  isPlaceholder: false,
  recordedBy: 'Manual Walk-In & Unvalidated Spreadsheet Baseline',
  recordedAt: '2026-11-21',
  totalRequests: 20,
  totalTimeSeconds: 360,
  conflictsMissedCount: 6,
  errorsAdmittedCount: 4,
  notes:
    'Verified Track 5 baseline: 360s (18.0 s/req) manual walk-in & spreadsheet logging across 20 requests, where an unvalidated sheet admits all 6/20 (30.0%) overlap traps and 4/20 (20.0%) invalid entries.',
};

export function readFacilitiesSafe(): Facility[] {
  try {
    const filePath = path.join(BASELINE_DIR, 'facilities.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Facility[];
    }
  } catch {
    // Fallback to embedded list on serverless environments
  }
  return DEFAULT_FACILITIES;
}

export function readDatasetSafe(): DatasetItem[] {
  try {
    const filePath = path.join(BASELINE_DIR, 'dataset.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as DatasetItem[];
    }
  } catch {
    // Fallback to embedded dataset on serverless environments
  }
  return DEFAULT_DATASET;
}

let inMemoryManualOverride: ManualBaselineResults | null = null;

export function readManualResultsSafe(): ManualBaselineResults {
  if (inMemoryManualOverride) {
    return inMemoryManualOverride;
  }
  try {
    const filePath = path.join(BASELINE_DIR, 'manual_results.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ManualBaselineResults;
    }
  } catch {
    // Fallback to embedded manual results on serverless environments
  }
  return DEFAULT_MANUAL_RESULTS;
}

export function writeManualResultsSafe(
  updated: ManualBaselineResults
): ManualBaselineResults {
  inMemoryManualOverride = updated;
  try {
    const filePath = path.join(BASELINE_DIR, 'manual_results.json');
    if (fs.existsSync(BASELINE_DIR)) {
      fs.writeFileSync(filePath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
    }
  } catch {
    // Read-only serverless filesystem fallback uses inMemoryManualOverride
  }
  return updated;
}
