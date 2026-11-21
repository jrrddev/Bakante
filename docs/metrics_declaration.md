# Metrics Declaration Form — Track 5 (Bakante)

- **Team Project**: Bakante (ISATU Real-Time Facility & Room Booking System)
- **Track**: Track 5 — University Operations: Facility & Room Booking
- **Test Dataset**: 20 curated ISATU facility booking requests (`baseline/dataset.csv` & `baseline/dataset.xlsx`: 10 valid bookings including back-to-back boundary slots, 6 overlap/conflict traps, and 4 data-error traps)

## Declared Parameters (3 Rows)

| # | Parameter (Sec. 9.2) | What It Measures | Manual Walk-In / Spreadsheet Baseline | New System (Bakante) Method |
|---|---|---|---|---|
| 1 | **Processing Time** | Total time (seconds) to check room availability, verify conflicts, and process all 20 requests | **360.0 sec** (`18.0 s/req` manual walk-in & spreadsheet logging) | **Bakante Manual (1-by-1 form)**: `120.0 sec` (`6.0 s/req`, **66.67% faster**) · **Bakante Batch (Excel/CSV)**: `~0.005 sec` (`~0.24 ms/req`, **99.99% faster**) |
| 2 | **Duplicate / Conflict Rate** | % of overlapping/double-booked requests admitted into the schedule | **30.0%** (`6 / 20` overlap traps admitted in an unvalidated manual sheet) | **0.0%** (`0 / 20` admitted — all 6 conflicts blocked by Binary Search + `BEGIN IMMEDIATE` lock) |
| 3 | **Error Rate** | % of invalid requests (missing fields, room-name typos, inverted times, over-capacity) admitted | **20.0%** (`4 / 20` invalid entries admitted in an unvalidated manual sheet) | **0.0%** (`0 / 20` admitted — all 4 caught by `O(1)` Input Gatekeeper) |

## Official Improvement Formula (Section 9.1)

$$\text{\% Improvement} = \frac{|\text{Baseline} - \text{New}|}{\text{Baseline}} \times 100$$
