# Pilot — Participant Onboarding

**Phase:** M1–2 (Foundation) — onboarding materials required before M3 plugin install
**Status:** Active

---

## Purpose

Define the complete process for bringing a participant into the pilot — from first contact through to their first week of active use. Onboarding must be frictionless, transparent, and dignity-preserving. Participants must understand exactly what they are agreeing to, what they can refuse, and how to leave at any time.

This is not a recruitment funnel. Participants are collaborators shaping something, not subjects being studied.

---

## Actors

| Actor | Role |
|---|---|
| Pilot participant | Vietnamese engineer or Japanese client team member joining the programme |
| Delivery lead | Guides participants through the week-one setup; day-to-day contact |
| Research lead | Schedules and conducts the baseline interview |
| Privacy lead | Processes consent forms; manages opt-out |

---

## Functional Requirements

### Pre-Onboarding

**FR-ONB-001:** The delivery lead must provide each prospective participant with a plain-language briefing document before any consent is requested. The document must cover: what the pilot is, what participation involves, what data is collected, and all participant rights (see FR-ONB-008).

**FR-ONB-002:** The briefing document must be provided in the participant's primary language (Vietnamese or Japanese). English-only documentation does not satisfy this requirement.

**FR-ONB-003:** Participation must be voluntary. No manager, team lead, or project lead may instruct or pressure a team member to join the pilot.

### Consent

**FR-ONB-004:** Each participant must sign a consent form before any data collection or plugin installation occurs. The consent form must be no longer than 2 pages and written in plain language.

**FR-ONB-005:** The consent form must explicitly cover:
- What data is collected and how it is used
- That participation is opt-in and revocable at any time with no penalty
- That message content is anonymised before analysis
- That name and identity will not appear in thesis, paper, or playbook without separate written permission
- The right to access, correct, and delete their own data
- The right to speak to the Shizenkan advisor independently

**FR-ONB-006:** Consent must be obtained in written form (physical or digital signature). Verbal consent is not sufficient.

**FR-ONB-007:** The privacy lead must receive and file a copy of every signed consent form before the participant's Slack plugin is activated.

### Participant Rights (Guaranteed in Writing)

**FR-ONB-008:** The following rights must be explicitly stated in the consent form and enforced by the system:

| Right | Requirement |
|---|---|
| Opt-out at any time | One sentence to the delivery lead; confirmation within 24 hours; removal completed; no record kept; work unaffected |
| Decline interviews | Can decline baseline/endline interview and still use plugin |
| Selective participation | Can use plugin and skip surveys, or skip plugin and participate in rituals |
| Anonymity | Name never appears in thesis, paper, or playbook without separate written permission |
| Data access | Can request to see own data within 5 working days |
| Data deletion | Can request deletion at any time, including after pilot ends |
| Independent contact | Can speak to Shizenkan advisor directly without project lead present |

### Week-One Setup (Target: 40 minutes total)

**FR-ONB-009:** The week-one setup must consist of exactly three steps, completable in sequence by the participant with minimal assistance:

| Step | Action | Target time |
|---|---|---|
| 1 | Sign consent form (provided in participant's language) | 5 minutes |
| 2 | Install Slack plugin (via install link; no IT ticket required) | 5 minutes |
| 3 | Schedule baseline conversation with research lead (within 2 weeks) | 30 minutes |

**FR-ONB-010:** The Slack plugin install must not require IT administrator access. It must be installable by the individual user via a shared install link.

**FR-ONB-011:** The baseline conversation scheduling must offer time slots across at least 3 different days and both morning and afternoon sessions to accommodate Vietnamese and Japanese time zones.

### Baseline Interview

**FR-ONB-012:** The research lead must conduct a 30-minute baseline interview with each participant within 2 weeks of plugin installation.

**FR-ONB-013:** The baseline interview must measure the participant's starting state across:
- Self-reported fluency in cross-cultural communication
- Frequency and nature of misunderstandings experienced in the previous 3 months
- Familiarity with Japanese / Vietnamese cultural norms (depending on participant's background)
- Confidence in written cross-cultural communication

**FR-ONB-014:** Baseline interview responses must be recorded in anonymised form. Participant names are not stored alongside responses.

---

## Acceptance Criteria

- A new participant receives a plain-language briefing in their own language before any consent request
- A signed consent form is on file with the privacy lead before the participant's plugin activates
- A participant completes all three week-one setup steps within 40 minutes of beginning
- The plugin install link works without an IT ticket or admin approval
- A participant who declines to install the plugin can still be scheduled for rituals and surveys
- A participant who opts out receives written confirmation within 24 hours

---

## Constraints

- Onboarding must be completed individually — no group sign-up or blanket team enrolment
- No data collection of any kind before consent is signed
- The install link must not expire within the week-one window (minimum 14-day validity)

---

## Edge Cases

- Participant signs consent but cannot complete plugin install due to device restrictions: delivery lead escalates to IT; participant may begin rituals and surveys while install is pending
- Participant is unavailable for baseline interview within the 2-week window: research lead offers 2 additional scheduling attempts before recording as "baseline declined"
- Participant loses their consent form copy: privacy lead provides a duplicate within 2 working days

---

## Out of Scope

- Group or cohort onboarding flows
- Onboarding for observers or managers not participating in the pilot
- Onboarding for platforms other than Slack

---

## Phase Map

| Requirement | Phase |
|---|---|
| Consent form drafted, reviewed by Shizenkan advisor and privacy lead | M1–2 |
| Plugin install link tested on Vnext infrastructure | M2–3 |
| First cohort onboarded, baseline interviews completed | M3–4 |
| Any onboarding issues retrospected and process updated | M4 |
