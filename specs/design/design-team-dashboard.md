# Design Spec — Team Insights Dashboard

**Linked requirement:** [engine-team-dashboard.md](../requirements/engine-team-dashboard.md)
**Phase:** M5–6 (prototype); M7–8 (public view for board pitch)
**Status:** Draft

---

## Overview

The team dashboard is a web application — separate from Slack — that gives team leads and the research team a view of how cross-cultural fluency is evolving across the pilot. It is also the measurement instrument for the thesis and the evidence base for the board pitch.

The dashboard has three views:
1. **Team view** — aggregate metrics visible to team leads (anonymised)
2. **Personal view** — individual metrics visible only to the user themselves
3. **Public view** — a stripped-down version for the board pitch and public playbook

---

## Team View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Kokoro Pilot Dashboard          Vnext Japan  ·  M3 → M6        │
├──────────────────┬──────────────────┬──────────────────────────-┤
│                  │                  │                            │
│  Miscomm rate    │  Formal fluency  │  User satisfaction        │
│  ↓ 34%           │  ↑ 72%           │  4.1 / 5                  │
│  vs 51% baseline │  vs 48% baseline │  vs 3.6 baseline          │
│                  │                  │                            │
├──────────────────┴──────────────────┴────────────────────────-──┤
│                                                                  │
│  Fluency Trend                              Case Library         │
│                                             128 anonymised cases │
│   100% ┤                         ___        contributed          │
│    75% ┤              _______---             since M3            │
│    50% ┤   ____------                                            │
│    25% ┤---                                                      │
│     0% ┤──────────────────────────────                          │
│        M3      M4      M5      M6                                │
│                                                                  │
├──────────────────────────────────────────────────────────────── ┤
│                                                                  │
│  Recent Teaching Cases                                           │
│  ─────────────────────────────────────────────────────────────  │
│  Formal request misread as optional hope       Suggestion used   │
│  Indirect refusal taken as agreement           Suggestion used   │
│  Apology omission in escalation email          Dismissed         │
│                                                                  │
└──────────────────────────────────────────────────────────────── ┘
```

### Metric Cards (top row)

| Metric | Display | Baseline comparison |
|---|---|---|
| Miscomm rate | Percentage with trend arrow (↑ ↓) | vs. pilot start baseline |
| Formal fluency | Percentage with trend arrow | vs. pilot start baseline |
| User satisfaction | Score out of 5 | vs. pilot start baseline |

Each card shows the current value and the delta from baseline — not just absolute numbers.

### Fluency Trend Chart

- Line chart, X-axis = months (M3 to current), Y-axis = fluency score (0–100%)
- One line per metric (miscomm rate, formal fluency) in different colours
- Hover/tap on a data point shows the value and the week's annotation volume
- No individual user lines — only team aggregate

### Case Library Counter

- A single count of anonymised teaching cases the team has contributed
- Clicking "View cases" opens a filtered list of recent cases (anonymised, no sender/recipient)

### Recent Teaching Cases Panel

- Shows the last 5–10 anonymised cases in a simple list
- Each row: case type label + outcome (suggestion used / dismissed / edited)
- Clicking a case shows the coaching panel explanation for that case type — no message content

---

## Personal View Layout

Accessible only to the individual user (not team leads). Reached via a "My fluency" link in the Slack app home tab.

```
┌──────────────────────────────────────────────────────────┐
│  My Fluency — Pilot Week 8                               │
│                                                          │
│  Annotations received this month:    12                  │
│  Suggestions used:                   7  (58%)            │
│  Patterns marked understood:         3                   │
│                                                          │
│  Fluency score:   ████████░░  74%  (+26% from start)     │
│                                                          │
│  Patterns I've mastered:                                 │
│  · Formal request register (JP → VN)                     │
│  · Indirect refusal patterns                             │
│  · Apology placement in escalations                      │
│                                                          │
│  [ View my annotation history ]  [ Reset patterns ]      │
└──────────────────────────────────────────────────────────┘
```

The personal view shows only the user's own data. It cannot be seen by team leads or the research lead without the user's explicit consent.

---

## Public View Layout

A stripped-down, brandable version for the board pitch and public playbook. Contains no team or individual identifiers — only aggregate pilot trends.

```
┌──────────────────────────────────────────────────────────┐
│  Kokoro Pilot — Results Overview                         │
│  8-month pilot · Vnext Japan · VN ↔ JP teams            │
│                                                          │
│  Miscomm rate reduced:      34% → 17%  (-50%)           │
│  Formal fluency improved:   48% → 79%  (+65%)           │
│  User satisfaction:         3.6 → 4.1                   │
│  Teaching cases generated:  128                          │
│                                                          │
│  Fluency trend [chart]                                   │
│                                                          │
│  "By month 7, most participants reported that the        │
│   plugin was fading into the background — a sign they    │
│   were learning." — Research lead, endline review        │
└──────────────────────────────────────────────────────────┘
```

The public view is a static URL shareable as a standalone page. It refreshes automatically when underlying metrics update.

---

## Visual Tone

- Clean, data-forward layout — research credibility over visual flair
- Metric cards use a white background with a subtle left-border accent (matching the annotation colour palette)
- Trend chart uses two lines maximum: one for miscomm rate (amber), one for fluency (blue-green)
- No red anywhere — the dashboard shows progress, not failure
- Typography: clear sans-serif; metric numbers in a larger weight

---

## States

**Pre-data (M3, first week)**
All metric cards show "Baseline: collecting..." with a loading indicator. Fluency trend chart shows the baseline point only.

**Insufficient anonymisation threshold**
If team size drops below 5 active users, team-level breakdowns are suppressed. A note explains: "Detailed metrics require at least 5 active participants."

**Export**
The research lead can trigger a CSV export from a "Download data" button (visible only to the research lead role). The export contains aggregate metrics only — no user identifiers.

---

## Access Control

| Role | Team view | Personal view | Public view | Export |
|---|---|---|---|---|
| Pilot participant | No | Own data only | Yes | No |
| Team lead | Aggregate only | No | Yes | No |
| Research lead | Aggregate only | No | Yes | CSV export |
| Project lead | Aggregate only | No | Yes | No |

---

## Assets Required

Place in `assets/design/`:
- `dashboard-team-view.png` — full team view with all metrics and chart
- `dashboard-personal-view.png` — personal fluency view
- `dashboard-public-view.png` — public/board pitch view
- `dashboard-mobile.png` — mobile-responsive layout (personal view priority)
