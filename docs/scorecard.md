# Bakante — Official Metrics Scorecard (Section 9.4)

- **Track**: Track 5 — University Operations: Facility & Room Booking
- **Source**: Built-in 20-request dataset (dataset.json)
- **Manual Baseline**: Manual Walk-In & Unvalidated Spreadsheet Baseline
- **Last Benchmark Run**: 2026-11-21T05:25:13.757Z

| Metric | Baseline (Manual) | New System (Bakante) | % Improvement | Test Method |
|---|---|---|---|---|
| Processing Time (20 requests) | 360.0 sec (18.0 s/req walk-in) | Manual form: 120.0 sec (6.0 s/req) · Batch: 0.0026 sec (0.13 ms/req) | **66.67% (manual) · 99.99% (batch)** | Timed 20 requests: Walk-in (360s) vs. Bakante form vs. Excel upload |
| Duplicate / Conflict Rate | 30.0% (6/20 in unvalidated sheet) | 0.0% (0/20 admitted) | **100.0% reduction** | Counted how many overlapping bookings were allowed |
| Error Rate (invalid data) | 20.0% (4/20 in unvalidated sheet) | 0.0% (0/20 admitted) | **100.0% reduction** | Counted how many invalid entries (typos, bad times, over-capacity) were allowed |

## Dataset Replay Summary
- Valid Bookings Confirmed: **10**
- Double-Booking Conflicts Blocked: **6**
- Invalid Data Errors Caught: **4**
- All Expectations Matched: **YES (100%)**
- Total Binary Search Comparisons vs. Linear Scan: **16 steps** vs. **8 steps**
