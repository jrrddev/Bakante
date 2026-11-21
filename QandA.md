# Bakante — Judges' Q&A Preparation Guide (Track 5)

Prepared from [`hackathon2026_guidelines.docx`](./hackathon2026_guidelines.docx) and the actual **Bakante** codebase so every team member can answer judges' questions clearly and confidently within the 3-minute Q&A round.

---

## 1. Improvement Algorithm & Logic Quality (25% Weight)

### Q1: *"What is the core logic that produces this improvement, and why does it work better than the manual process?"* *(Required by Section 4)*
**Answer:**
Bakante replaces manual, row-by-row spreadsheet scanning ($O(n)$) with a **3-Gate Deterministic Pipeline**:
1. **Gate 1 — $O(1)$ Input Gatekeeper (`validateBooking.ts`):** Blocks blank fields, room typos (e.g., `"AVR 01"`), invalid hours (outside `3:00 AM–11:00 PM`), inverted times, and over-capacity requests before touching the database $\rightarrow$ **0% Error Rate**.
2. **Gate 2 — $O(\log n)$ Sorted Binary Search (`checkConflict.ts`):** Bookings for each room and date are indexed in ascending order by `startMin`. Binary Search jumps straight to the requested time window in $\log_2(n)$ steps and checks the exact half-open overlap rule: `startA < endB && startB < endA` $\rightarrow$ **0% Double-Bookings**.
3. **Gate 3 — 100-Pt Best-Fit Suggester (`suggestAlternatives.ts`):** When a room is busy, instead of leaving the user stuck, Bakante finds open time gaps on the same room and ranks conflict-free alternative rooms out of **100 points** (`45` capacity fit + `35` equipment match + `20` same building).

---

### Q2: *"Why do you allow back-to-back bookings like 9:00–11:00 AM and 11:00 AM–1:00 PM without flagging a conflict?"*
**Answer:**
We represent every booking as a **half-open interval** `[startMin, endMin)` in minutes from midnight (`min = HH × 60 + MM`), and check:
`startA < endB AND startB < endA`.
For `09:00–11:00` `[540, 660)` and `11:00–13:00` `[660, 780)`:
- `540 < 780` is `true`, **but** `660 < 660` is `false` $\rightarrow$ `true AND false = false` (**Allowed**).
If ISATU ever needs a 15-minute cleaning/setup gap between events, `checkConflictBinarySearch` already supports a `bufferMinutes` parameter.

---

### Q3: *"Why use Binary Search instead of a simple `for` loop or SQL `WHERE` check?"*
**Answer:**
- A manual spreadsheet check or unindexed scan is $O(n)$—as campus bookings grow to hundreds or thousands of entries across semesters, human error and scan time grow linearly.
- By indexing `(facility_id, date, start_min)` and using Binary Search, Bakante inspects at most $\log_2(n)$ steps (e.g., 1,000 bookings takes ~10 checks instead of 1,000), and our unit tests in `shared/tests/logic.test.ts` prove 100% parity with a full brute-force scan.

---

### Q4: *"How does the Best-Fit Suggester avoid putting a 50-person class in the 500-seat Multi-Purpose Gym?"*
**Answer:**
In `suggestAlternatives.ts`, **45 out of 100 points** come from **Capacity Fit**: `45 × (attendees / room.capacity)`.
For 50 attendees:
- **`AVR 2`** (80 seats, Academic Bldg, Projector) scores `28 + 35 + 20 = 83%`.
- **`Multi-Purpose Gym`** (500 seats, Main Campus, Projector) scores only `5 + 35 + 0 = 40%`.
So Bakante automatically recommends `AVR 2` as **Best match**, keeping large venues open for campus-wide events.

---

## 2. Measured Improvement & Baseline (25% Weight)

### Q5: *"How did you measure your Baseline vs. New System results? Are those real numbers?"*
**Answer:**
Yes. All 3 metrics use the exact **20-request ISATU dataset** (`baseline/dataset.csv` & `baseline/dataset.xlsx`: `10` valid bookings including back-to-back boundaries, `6` conflict traps, and `4` data-error traps) and the official **Section 9.1 formula** (`|Baseline − New| ÷ Baseline × 100`):
1. **Processing Time:** Manual walk-in & spreadsheet entry (`360.0 sec` / `18.0 s/req`) vs. **Bakante Manual 1-by-1 Form** (`120.0 sec` / `6.0 s/req` $\rightarrow$ **`66.67% faster`**) vs. **Bakante Batch Excel/CSV Import** (`~0.005 sec` / `~0.24 ms/req` $\rightarrow$ **`99.99% faster`**).
2. **Duplicate / Conflict Rate:** `6 / 20` (`30.0%`) in an unvalidated sheet vs. `0 / 20` (`0.0%`) in Bakante $\rightarrow$ **`100.0% reduction`**.
3. **Error Rate:** `4 / 20` (`20.0%`) in an unvalidated sheet vs. `0 / 20` (`0.0%`) in Bakante $\rightarrow$ **`100.0% reduction`**.

---

### Q6: *"Why does Processing Time say `99.99% faster` instead of `100.00%`?"*
**Answer:**
Because `~5 ms` (`0.005 sec`) is still strictly greater than `0` seconds. In `calculateMetrics.ts`, we intentionally cap strictly positive non-zero runtimes at `99.99%` so we never falsely report `100.00%` time elimination, while `0` conflicts and `0` errors are genuinely `100.0%` reductions.

---

### Q7: *"What happens if we upload a brand-new Excel file right now during judging?"*
**Answer:**
On the **Scorecard** tab, clicking **Import Excel / CSV** parses any `.xlsx` / `.csv` file in the browser using SheetJS, runs it through an isolated `:memory:` sandbox using the exact same validation & Binary Search engine, and dynamically updates the 3-row Scorecard and Audit Log without corrupting the live schedule.

---

## 3. Problem-Solution Fit & ISATU Adoption (15% Weight)

### Q8: *"Why isn't there an Admin / User login and approval workflow?"* *(Section 4 & Track 5)*
**Answer:**
Per **Section 4** of the guidelines (*"The working system is only evidence that the improvement approach works. It does not need to be complete or polished"*), we focused 100% on the core conflict-prevention and Best-Fit logic. Automated instant confirmation also keeps processing time low. For full ISATU rollout, university SSO and a GSO/Admin approval or override role can plug directly in front of `createBookingAtomic()`.

---

### Q9: *"How feasible is it for ISATU offices (GSO, Registrar, Colleges) to adopt Bakante?"*
**Answer:**
Very feasible:
- **Zero-friction migration:** Offices can import existing Excel schedules via **Import Excel / CSV** without retyping records.
- **Low infrastructure cost:** Runs on lightweight serverless hosting (Vercel) + **Turso Cloud LibSQL** (HTTP SQLite), requiring no expensive database server.
- **Real ISATU rooms:** Already configured for `ICT 301`, `ICT 201`, `ICT 102`, `ICT 103`, `AVR 1`, `AVR 2`, `Multi-Purpose Gym`, `TEB 210`, and `TEB 208` (`3:00 AM–11:00 PM`).

---

## 4. Technical Execution & Computing Principles (15% Weight)

### Q10: *"What data structures and database design principles did you use?"*
**Answer:**
- **Sorted Half-Open Intervals:** Time strings (`"HH:MM"`) are normalized to integer minutes from midnight so interval comparisons are exact $O(1)$ integer arithmetic.
- **Composite B-Tree Index:** `idx_bookings_facility_date_start (facility_id, date, start_min)` keeps bookings sorted per room+date for $O(\log n)$ Binary Search.
- **Database Integrity Constraints:** `FOREIGN KEY (facility_id)` prevents orphan rooms and `CHECK (end_min > start_min)` enforces valid time ranges at the SQL level.
- **Shared Pure-TypeScript Core (`@bakante/shared`):** Both the React UI preview and the Express API execute the exact same pure functions, eliminating client/server rule drift.

---

## 5. System as Proof of Concept (10% Weight)

### Q11: *"How can we verify your system doesn't break on edge cases?"*
**Answer:**
We have **9 automated unit and integration tests** (`npm test`) covering:
- Back-to-back boundary slots (`09:00–11:00` and `11:00–13:00`)
- Duplicate, nested, partial-start, partial-end, and multi-booking span conflicts
- Missing office fields, room-name typos, inverted times, and over-capacity requests
- Full 20-request replay (`10/10` booked, `6/6` conflicts blocked, `4/4` errors caught) and Excel batch scoring.
