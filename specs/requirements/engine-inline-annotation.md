# Engine — Inline Cultural Annotation

**Phase:** M3–4 (Build) — MVP deliverable
**Status:** Planned

---

## Purpose

Surface cultural context beneath a message without altering the original text. When a Vietnamese engineer receives a formal Japanese request, or a Japanese client receives a Vietnamese reply, the annotation layer reveals the underlying intent and register — so the reader interprets expression correctly, not literally.

The annotation teaches. It does not replace. Over time, as the user's fluency grows, annotations become less frequent and less detailed.

---

## Actors

| Actor | Role |
|---|---|
| Message recipient | Reads the annotation alongside the original message |
| Message sender | Unaffected; their original text is preserved unchanged |
| Cultural advisor | Reviews annotation accuracy during feedback loop |

---

## Functional Requirements

**FR-ANN-001:** The system must detect the cultural register of an incoming message (formal / neutral / informal) and display it as a label beneath the message.

**FR-ANN-002:** The system must surface the underlying intent of a message when the surface phrasing may obscure it.
> Example: Japanese "ご検討いただけますと幸いです" must be annotated as a firm request, not a soft hope.

**FR-ANN-003:** Annotations must appear inline — directly beneath or alongside the original message — without opening a separate panel or requiring user action.

**FR-ANN-004:** The system must offer one or more culturally adapted reply suggestions as chips the user can tap or click to use as a drafting starting point. Suggestions must never be auto-inserted into the reply field.

**FR-ANN-005:** Each suggestion chip must match the register of the counterpart's message (e.g., a formal incoming message produces formal suggestion chips).

**FR-ANN-006:** A one-line coaching micro-text must accompany each annotation, briefly explaining the cultural reasoning.
> Example: "Japanese formal requests often carry stronger intent than their polite phrasing implies."

**FR-ANN-007:** The annotation must fade (reduce in detail and frequency) as the system detects that the user's fluency is improving, based on their interaction history and fluency profile.

**FR-ANN-008:** The user must be able to dismiss any annotation permanently for a given phrase pattern without affecting annotations for other patterns.

**FR-ANN-009:** Annotations must be rendered only for users who have opted in. Messages to or from non-consenting participants must not be annotated or intercepted.

**FR-ANN-010:** The annotation must not modify, delay, or alter the delivery of the original message to the recipient.

---

## Acceptance Criteria

- A Japanese formal request received in Slack displays an annotation within 1.5 seconds identifying register as "Formal" and intent as "[description]"
- Suggestion chips appear below the annotation; tapping a chip populates the reply draft field without sending
- Annotation micro-text is present and intelligible to a non-native reader
- A user who dismisses an annotation for a phrase pattern does not see that annotation again for the same pattern
- A user with 60+ days of pilot history receives fewer annotations than a user on day one
- No annotation appears for a user who has not opted in

---

## Constraints

- Annotation must not interfere with the native Slack message thread UX
- Suggestions are starting points only — the user retains full control of the final message
- Annotation content must be generated from the cultural pair database and LLM output; hardcoded strings are not acceptable for production

---

## Edge Cases

- Message contains mixed Vietnamese and Japanese text: annotate each segment separately
- Message is very short (e.g., "はい" / "OK"): annotate only if register or intent is ambiguous; suppress otherwise
- LLM call times out: deliver message unmodified, suppress annotation, log failure
- User's fluency profile is absent (first session): default to full annotation detail

---

## Out of Scope

- Annotating outgoing messages (covered in `engine-pre-send-check.md`)
- Full translation of message content
- Annotation of private DMs
- Language pairs other than VN ↔ JP

---

## Phase Map

| Requirement | Phase |
|---|---|
| Register detection + intent extraction designed | M1–2 |
| Annotation renderer built, Slack plugin integrated | M3–4 |
| Fluency-based fading active | M5–6 |
| Annotation accuracy validated via endline interviews | M7–8 |
