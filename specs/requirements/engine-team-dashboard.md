# Engine — Team Insights Dashboard

**Phase:** M5–6 (Pilot Live) — dashboard prototype
**Status:** Planned

---

## Purpose

Give team leads and the research team a live view of how cross-cultural communication is improving across the pilot. The dashboard surfaces aggregate, anonymised metrics — not individual message content — so it functions as both a coaching tool for teams and a measurement instrument for the research thesis.

---

## Actors

| Actor | Role |
|---|---|
| Team lead | Reviews team fluency trends and miscomm rate to identify coaching needs |
| Research lead | Uses dashboard data for mid-point and endline analysis |
| Pilot user | Can view their own fluency metrics; cannot view other individuals' data |
| Project lead | Uses dashboard for board pitch evidence |

---

## Functional Requirements

**FR-DASH-001:** The dashboard must display the following metrics at the team level:

| Metric | Definition |
|---|---|
| Miscommunication rate | Estimated rate of messages flagged for cultural risk, tracked against baseline |
| Formal fluency score | Team average accuracy in matching counterpart's register (formal / neutral / informal) |
| Case library size | Count of anonymised teaching cases contributed by the team |
| User satisfaction | Aggregate NPS-style score from weekly check-in surveys |
| Fluency trend | Visualisation of fluency score change over the pilot duration |

**FR-DASH-002:** All team-level metrics must be computed from anonymised data. No individual user's message content or identity must be derivable from the dashboard.

**FR-DASH-003:** The dashboard must display a "recent teaching cases" panel showing the last N anonymised case examples, with impact metadata (e.g., whether the user accepted the suggestion).

**FR-DASH-004:** The dashboard must support a baseline comparison — each metric displayed alongside its value at the start of the pilot.

**FR-DASH-005:** Each pilot user must be able to view a personal fluency view showing only their own metrics. Personal data must not be visible to other users or team leads without the individual's explicit consent.

**FR-DASH-006:** The dashboard must refresh on a defined cadence (minimum: daily). Real-time updates are not required for MVP.

**FR-DASH-007:** The research lead must be able to export aggregated, anonymised dashboard data in a machine-readable format (CSV or JSON) for thesis analysis.

**FR-DASH-008:** The dashboard must display a public-facing prototype view suitable for inclusion in the board pitch and public playbook. The public view shows only aggregate trends — no team or individual identifiers.

---

## Acceptance Criteria

- Team lead opens the dashboard and sees all five metrics with baseline comparison within 3 seconds of page load
- Clicking on a teaching case shows anonymised context and suggestion outcome — no sender or recipient name is visible
- A pilot user opens the personal view and sees only their own fluency trend
- Research lead exports a CSV of all aggregate metrics; the file contains no personally identifiable information
- Public prototype view renders correctly and is shareable as a standalone URL

---

## Constraints

- Dashboard data is derived from anonymised telemetry only; raw message content is never stored or displayed
- Individual data must be consent-gated — a team lead cannot see individual breakdowns unless that individual has explicitly enabled sharing
- Metrics definitions must be documented and consistent with the thesis measurement framework

---

## Edge Cases

- Pilot team is smaller than the anonymisation threshold (fewer than 5 users): suppress team-level breakdowns; display only aggregate pilot-wide metrics
- A user opts out mid-pilot: their data is removed from all future calculations; historical aggregates are recomputed or noted as approximate
- Dashboard data export is requested before sufficient data is available: return partial data with a coverage note

---

## Out of Scope

- Real-time message monitoring
- Manager-level access to individual employee message history
- Comparison between different pilot organisations (post-pilot feature)

---

## Phase Map

| Requirement | Phase |
|---|---|
| Metrics schema and anonymisation approach defined | M1–2 |
| Telemetry pipeline built alongside engine MVP | M3–4 |
| Dashboard prototype live for pilot team | M5–6 |
| Export used for thesis analysis; public view prepared for board pitch | M7–8 |
