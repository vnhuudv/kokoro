# Engine — Cultural Coaching Panel

**Phase:** M3–4 (Build) — MVP deliverable
**Status:** Planned

---

## Purpose

Provide on-demand, deeper cultural explanation when a user wants to understand — not just act on — an annotation or pre-send flag. The coaching panel is the teaching layer of the engine. It explains register, intent, and cultural risk in enough depth for the user to build lasting fluency, then fades as that fluency grows.

---

## Actors

| Actor | Role |
|---|---|
| Pilot user | Opens the panel to understand the reasoning behind an annotation or flag |
| Cultural advisor | Reviews panel content accuracy during the feedback loop |

---

## Functional Requirements

**FR-CCP-001:** The coaching panel must be accessible on demand from any inline annotation and from any pre-send flag. It must not open automatically.

**FR-CCP-002:** The panel must display the following fields for any given annotation or flag:

| Field | Description |
|---|---|
| Register | The detected register of the message or phrase (formal / neutral / informal) with a plain-language explanation of what that means in context |
| Intent | The underlying intent extracted from the surface phrasing, in plain language |
| Cultural risk | The risk that the phrase or tone creates for the counterpart, and why |
| Rationale | A teaching explanation — the "why" behind the annotation, grounded in cultural or religious context where relevant |
| Suggestion | Optional: a culturally adapted alternative phrasing with a note on how it mitigates the risk |

**FR-CCP-003:** The rationale field must reference the relevant cultural concept (e.g., saving face, specificity norms, continuity, deference) rather than giving generic communication advice.

**FR-CCP-004:** The panel must adapt its level of detail to the user's fluency profile. A first-week user receives full explanations. A user with high fluency receives condensed rationale.

**FR-CCP-005:** The user must be able to mark a coaching explanation as "understood" to signal to the system that this pattern no longer needs detailed explanation.

**FR-CCP-006:** The panel must be dismissible in one action and must not block reading or replying to the message.

**FR-CCP-007:** The panel content must be generated dynamically for each annotation — not pre-written static text. Static fallback copy is acceptable only when the LLM is unavailable.

**FR-CCP-008:** The panel must track which explanations a user has viewed, to feed into the fluency profile and the feedback learner.

---

## Acceptance Criteria

- Tapping the annotation on a Japanese formal request opens the coaching panel showing register, intent, cultural risk, and rationale within 1 second
- The rationale for a formal Japanese request references a specific cultural concept (e.g., "In Japanese business culture, polite phrasing often signals the strength of the request, not its optionality")
- A user who has marked a pattern as "understood" sees condensed or no panel content for that pattern in subsequent sessions
- The panel closes in one tap without affecting the message thread
- When the LLM is unavailable, the panel shows a static fallback note and logs the failure

---

## Constraints

- Panel content must be culturally accurate; all content is subject to review by the cultural advisor
- The panel must not interfere with message reading or composing in Slack
- Fluency profile updates from panel interactions must be written asynchronously — panel open time must not be affected by write latency

---

## Edge Cases

- User opens panel for a message with no detected cultural risk: display a confirmation that the message registers as culturally neutral, with a brief explanation of why
- Panel opened on a very short or emoji-only message: display register classification only; suppress intent and risk fields if insufficient signal
- Cultural advisor has flagged a previously shown rationale as inaccurate: replace with corrected content and log the update

---

## Out of Scope

- Proactive coaching (pushing a panel without user action)
- Video or audio coaching content
- Coaching on grammar, spelling, or style unrelated to cultural register

---

## Phase Map

| Requirement | Phase |
|---|---|
| Coaching content schema defined with cultural advisor | M1–2 |
| Panel built, integrated with annotation and pre-send check | M3–4 |
| Fluency-adaptive detail level active | M5–6 |
| Panel content accuracy audited via native-speaker review | M7–8 |
