# Pilot — Programme Rhythm

**Phase:** M1–8 (Full duration)
**Status:** Active

---

## Purpose

Define the structure of the 8-month pilot from the participant's perspective: what happens each month, what is asked of them, and what the two team rituals look like. The programme rhythm must respect participants' time — most weeks ask nothing extra. Deep engagement is invited, never required.

---

## Actors

| Actor | Role |
|---|---|
| Pilot participant | Attends rituals, completes check-ins, participates in interviews |
| Delivery lead | Runs weekly check-ins, coordinates rituals |
| Research lead | Conducts baseline (M2) and endline (M7) interviews; administers surveys |
| Cultural advisor | Attends reflection circles; validates ritual design |
| Project lead | Attends mid-point and endline sessions; owns board pitch preparation |

---

## Functional Requirements

### Monthly Schedule

**FR-RHY-001:** The programme must follow this 8-month structure:

| Month | Milestone | What is asked of participants |
|---|---|---|
| M1 | Introduction, meet research lead | No time commitment beyond introductory session |
| M2 | Baseline interview (30 min), initial surveys | One 30-minute interview; initial surveys (15 min) |
| M3 | Plugin installed, first team workshop, first weekly check-in | Workshop attendance (60 min); plugin install (10 min) |
| M4 | Plugin integration continuing, first rituals in meetings | 2-minute ritual at start of weekly meeting |
| M5 | Mid-point check-in conversation (30 min) | One 30-minute conversation with research lead |
| M6 | Live use continuing, optional reflection circle | Optional: 45-minute reflection circle |
| M7 | Endline interview (30 min, same format as baseline) | One 30-minute interview |
| M8 | Closing reflection session, results sharing | One 60-minute session — final reflection + results presentation |

**FR-RHY-002:** Total participant time commitment across 8 months must not exceed 6 hours of structured activity. Informal plugin use is not counted.

**FR-RHY-003:** All structured sessions (interviews, workshops, rituals) must be offered in the participant's primary language.

### Weekly Check-In Survey

**FR-RHY-004:** From M3 onward, a weekly check-in survey must be sent to all active participants. The survey must:
- Take no longer than 60 seconds to complete
- Ask no more than 3 questions
- Cover: at least one cross-cultural communication event this week (yes/no), perceived difficulty (1–5 scale), and one open-ended optional comment

**FR-RHY-005:** Survey completion must be optional. Non-completion must not trigger reminders more than once per week.

**FR-RHY-006:** Survey responses must be anonymised before storage. Survey data must feed into the team dashboard metrics.

### Team Rituals

**FR-RHY-007:** Two rituals must be introduced during the pilot. Both are optional additions to existing meeting structure — they do not replace any existing agenda items.

#### Ritual 1 — Check Tâm Before the Task

**FR-RHY-008:** At the start of the weekly team meeting, each attending member says one sentence:
> "The sincere intention I bring to this week's work is [...]"

- Duration: 2 minutes for the full team
- Facilitator: delivery lead for the first 4 weeks; then a rotating team member
- Purpose: make intentions visible so expression is read as expression, not character
- The ritual is not evaluated or scored — there is no right answer

**FR-RHY-009:** The delivery lead must introduce the ritual in M4 with a 10-minute explanation of its purpose. Written guidance must be provided in Vietnamese and Japanese.

#### Ritual 2 — Name the Register, Then React

**FR-RHY-010:** When a conflict or misunderstanding arises across a culture line, the team pauses and asks:
> "What cultural register was that written in?"

- The question distinguishes a substance problem from a register mismatch
- A delivery lead or team lead facilitates the pause
- Duration: 2–5 minutes when triggered; not a standing agenda item
- This ritual is triggered as needed, not on a schedule

**FR-RHY-011:** The delivery lead must brief the team on this ritual in M4, providing examples of register-vs-content confusion drawn from real (anonymised) cases.

### Interviews

**FR-RHY-012:** The baseline interview (M2) and endline interview (M7) must use identical question sets to enable before/after comparison.

**FR-RHY-013:** Interview questions must measure:
- Self-reported cross-cultural fluency
- Frequency of misunderstandings in the preceding period
- Confidence in written cross-cultural communication
- Perception of the counterpart culture's communication style

**FR-RHY-014:** Interview responses must be recorded (with participant consent), transcribed, anonymised, and stored in the research lead's data folder — not in the engine's data stores.

**FR-RHY-015:** The mid-point check-in (M5) is a shorter, informal conversation. It must cover: is the plugin useful, are the rituals sustainable, and any concerns the participant wants to raise.

### Closing Session

**FR-RHY-016:** The M8 closing session must include:
- A results-sharing segment (research lead presents aggregate findings — no individual data)
- A reflection segment (participants share what they are taking forward)
- An acknowledgement of participant contribution to the research

**FR-RHY-017:** Participants must be given the option to receive a copy of the public playbook when published.

---

## Acceptance Criteria

- From M3 onward, a weekly check-in survey of ≤3 questions reaches all active participants within the same business day each week
- Ritual 1 is introduced in M4 and runs in at least 75% of weekly team meetings through M7
- Baseline and endline interviews use identical question sets; research lead can confirm at-a-glance comparison
- A participant who misses the M5 mid-point check-in is offered one reschedule before being recorded as "missed"
- The M8 closing session includes a results presentation covering all five dashboard metrics

---

## Constraints

- No session may be recorded without the participant's explicit verbal consent at the start of that session
- Rituals may not be made mandatory by any manager or team lead; participation remains voluntary
- Interview questions must be reviewed by the Shizenkan advisor before M2 baseline begins

---

## Edge Cases

- A participant joins late (after M3): onboard immediately; baseline interview conducted at join date; endline interview still conducted at M7 with a note on shorter participation window
- A participant's time zone makes weekly check-in timing difficult: adjust survey send time to the participant's business hours
- Team meeting cadence changes (e.g., bi-weekly instead of weekly): adapt ritual frequency accordingly; document the deviation in the research log

---

## Out of Scope

- Mandatory attendance at any session
- Recording or evaluating individual ritual responses
- Extending the programme beyond M8 without a new consent process

---

## Phase Map

| Requirement | Phase |
|---|---|
| Programme schedule finalised, interview questions drafted | M1–2 |
| Baseline interviews conducted, surveys begin | M2–3 |
| Rituals introduced, weekly surveys active | M4 |
| Mid-point check-ins, optional reflection circles | M5–6 |
| Endline interviews, closing session | M7–8 |
