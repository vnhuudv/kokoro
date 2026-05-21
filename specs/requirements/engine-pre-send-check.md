# Engine — Pre-Send Intent Check

**Phase:** M3–4 (Build) — MVP deliverable
**Status:** Planned

---

## Purpose

Before a user sends a message, catch tone mismatches and cultural blind spots that could cause misunderstanding at the point of receipt. The check applies to outgoing messages — email drafts and chat replies — and surfaces issues as warnings the user can act on or ignore. It never rewrites or sends anything automatically.

---

## Actors

| Actor | Role |
|---|---|
| Message sender | Drafts a message and receives pre-send warnings before sending |
| Recipient (counterpart culture) | Indirect beneficiary — receives a better-calibrated message |

---

## Functional Requirements

**FR-PSC-001:** The system must analyse a drafted message before it is sent and compare its tone and register against the expected cultural norms for the recipient.

**FR-PSC-002:** The system must flag a tone mismatch when the sender's draft uses a register that differs significantly from what the recipient's culture expects in the given context.

**FR-PSC-003:** The system must detect and flag the following risk categories:

| Risk category | Description |
|---|---|
| Missing cultural acknowledgement | A context where the recipient's culture expects an apology, expression of gratitude, or deference that is absent from the draft |
| Face risk | Direct disagreement, blunt refusal, or criticism that may cause loss of face for the recipient |
| Implicit assumption | An assumption in the draft that the recipient's culture would expect to be made explicit |
| Time / commitment ambiguity | Phrasing that is vague about timelines or commitments in a way that differs by cultural norm |
| Register mismatch | Draft is significantly more formal or informal than the established register of the conversation |

**FR-PSC-004:** Each flag must display a short explanation of the detected risk and the cultural reasoning behind it.

**FR-PSC-005:** For each flag, the system may offer a suggested revision. The suggestion must be presented as an option, never inserted automatically.

**FR-PSC-006:** The user must always be able to send the original draft unchanged, regardless of the number or severity of flags.

**FR-PSC-007:** The pre-send check must be interruptible at any point — the user can dismiss the check panel and send immediately.

**FR-PSC-008:** The check must complete and display results before the send action is executed. If the check takes longer than 2 seconds, it must display a loading state and allow the user to skip and send.

**FR-PSC-009:** The system must support the check in Slack (reply composer) and email clients (Gmail, Outlook) at MVP. Chat platforms (Teams) are planned but not required for pilot.

**FR-PSC-010:** The pre-send check must not activate for messages sent to participants who have not opted in.

---

## Acceptance Criteria

- A Vietnamese engineer drafts a blunt refusal to a Japanese client; before sending, the system surfaces a "Face risk" flag with an explanation
- A message with no cultural risks passes the check silently — no flags, no interruption
- The user clicks "Send anyway" after a flag and the message is delivered unchanged
- The pre-send check panel can be dismissed in one action
- If the LLM is unavailable, the message sends without check and a silent log entry is written

---

## Constraints

- The check must not block or delay sending if the user chooses to proceed
- No draft content is stored on the server in identifiable form; content is anonymised before analysis
- Suggestions must be culturally grounded, not generic grammar corrections

---

## Edge Cases

- Draft is a reply to a thread with mixed cultural context: analyse the immediate reply only, provide thread context as supplemental input to the LLM
- Draft is very short (one word, emoji only): suppress check unless register is clearly detectable as mismatched
- Multiple risk categories detected simultaneously: display all flags, ranked by severity
- User has previously dismissed a specific risk category: reduce its prominence but do not suppress entirely

---

## Out of Scope

- Checking messages to recipients in the same culture
- Grammar or spelling correction
- Auto-rewriting drafts without user action
- Checking private DMs

---

## Phase Map

| Requirement | Phase |
|---|---|
| Risk category taxonomy defined with cultural advisor | M1–2 |
| Pre-send check built for Slack, Gmail | M3–4 |
| Outlook and Teams support | M5–6 (stretch) |
| Risk flag accuracy reviewed in endline interviews | M7–8 |
