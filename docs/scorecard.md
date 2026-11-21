# Bakante — Official Metrics Scorecard (Section 9.4)

- **Track**: Track 5 — University Operations: Facility & Room Booking
- **Source**: Built-in 20-request dataset (dataset.json)
- **Manual Baseline**: Manual Walk-In & Unvalidated Spreadsheet Baseline
- **Last Benchmark Run**: 2026-11-21T03:33:59.106Z

| Metric | Baseline (Manual) | New System (Bakante) | % Improvement | Test Method |
|---|---|---|---|---|
| Processing Time (20 requests) | 360.0 sec (18.0 s/req walk-in) | Manual form: 120.0 sec (6.0 s/req) · Batch: 0.0048 sec (0.24 ms/req) | **66.67% (manual) · 99.99% (batch)** | 3-way timing: Manual walk-in (360s) vs. Bakante manual form vs. Bakante batch Excel/CSV import |
| Duplicate / Conflict Rate | 30.0% (6/20 in unvalidated sheet) | 0.0% (0/20 admitted) | **100.0% reduction** | Overlapping double-booking traps admitted vs. blocked by Binary Search |
| Error Rate (invalid data) | 20.0% (4/20 in unvalidated sheet) | 0.0% (0/20 admitted) | **100.0% reduction** | Missing fields, typos, bad times, or over-capacity entries admitted vs. caught |

## Dataset Replay Summary
- Valid Bookings Confirmed: **10**
- Double-Booking Conflicts Blocked: **6**
- Invalid Data Errors Caught: **4**
- All Expectations Matched: **YES (100%)**
- Total Binary Search Comparisons vs. Linear Scan: **16 steps** vs. **8 steps**
