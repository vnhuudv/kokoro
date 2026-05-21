# Design Spec — Inline Cultural Annotation

**Linked requirement:** [engine-inline-annotation.md](../requirements/engine-inline-annotation.md)
**ADR reference:** [ADR-003-slack-integration-approach.md](../decisions/ADR-003-slack-integration-approach.md)
**Phase:** M3–4
**Status:** Draft

---

## Overview

The inline annotation is the first thing a participant sees when a cross-cultural message arrives. It must feel like a quiet, helpful nudge — not an intrusion or a correction. The visual design should be subtle enough to be ignorable and informative enough to be worth reading.

---

## Surfaces

The annotation appears in **two places**:
1. As an **ephemeral message** in the Slack channel — visible only to the recipient, posted immediately after the original message
2. As a **pre-send overlay** in the reply composer — visible to the sender when drafting a reply (see `design-pre-send-check.md`)

---

## Annotation Block Layout (Slack Block Kit)

```
┌─────────────────────────────────────────────────────────┐
│  🧭  Register: Formal  ·  Intent: Firm request           │
│                                                          │
│  "ご検討いただけますと幸いです" is a polite phrase that    │
│  signals a strong request, not an optional hope.         │
│  In Japanese business communication, this level of       │
│  formality often means: please do this.                  │
│                                                          │
│  [ Reply formally ]  [ Reply neutrally ]  [ Learn more ] │
└─────────────────────────────────────────────────────────┘
```

### Elements

| Element | Description |
|---|---|
| Register badge | Short label: "Formal", "Neutral", or "Informal". Displayed prominently at the top left. |
| Intent label | One-line intent extracted from the message (e.g., "Firm request", "Expressing concern", "Seeking confirmation"). |
| Coaching micro-text | 1–3 sentences explaining the cultural context in plain language. Maximum 40 words. |
| Suggestion chips | 2–3 buttons labelled by register (e.g., "Reply formally", "Reply neutrally"). Tapping populates the reply composer. Never sends. |
| "Learn more" button | Opens the coaching panel modal (see `design-coaching-panel.md`). |
| Dismiss control | A small "✕" or "Got it" link that collapses the annotation. Not shown on first annotation per pattern. |

---

## Visual Tone

- The block uses a **left border accent** (Slack Block Kit `section` with a muted colour) to visually distinguish it from regular messages
- No red or warning colours — the annotation is informational, not an error
- Muted grey or blue-tinted background; unobtrusive
- Coaching micro-text is in a smaller font weight than the register/intent line
- Suggestion chips use Slack's native `button` elements — consistent with Slack's own UI patterns

---

## Adaptive Behaviour

| User state | Annotation display |
|---|---|
| First 2 weeks of pilot | Full annotation: register, intent, micro-text, all suggestion chips, "Learn more" |
| Weeks 3–8 | Condensed: register + intent only; coaching micro-text collapsed by default; "Expand" link |
| High fluency (system-detected) | Register badge only; all other elements hidden unless user taps "Show more" |
| Pattern marked "understood" by user | Annotation suppressed for that pattern |

---

## States

**Loading state**
While the pipeline processes the message (up to 1.5s), show a subtle typing indicator beneath the original message. Do not block reading of the original message.

**Error state**
If the annotation cannot be generated (LLM timeout, pipeline failure), show nothing. The original message is delivered unmodified. No error message is shown to the user — failure is silent and logged internally.

**No cultural risk detected**
If the pipeline finds no register mismatch or cultural risk, no annotation is shown. The message passes through silently.

---

## Interaction Flow

```
Message arrives in Slack
        │
        ▼
Pipeline processes (~1.0s P50)
        │
   ┌────┴────┐
   │ Risk?   │
   └────┬────┘
        │ Yes                    No → nothing shown
        ▼
Ephemeral annotation block appears (recipient only)
        │
   User reads annotation
        │
   ┌────┴──────────────────────┐
   │                           │
Tap suggestion chip        Tap "Learn more"
   │                           │
Reply composer populated   Coaching panel opens
(not sent)                 (see design-coaching-panel.md)
        │
   User edits and sends reply
```

---

## Accessibility

- All interactive elements (buttons, dismiss link) must have descriptive labels for screen readers
- Coaching micro-text must be readable at Slack's default font size without zooming
- Colour is not the only indicator of register — the text label ("Formal", "Neutral", "Informal") is always present alongside any colour accent

---

## Assets Required

Place in `assets/design/`:
- `annotation-block-full.png` — full annotation with all elements visible
- `annotation-block-condensed.png` — condensed state (weeks 3–8)
- `annotation-block-minimal.png` — high-fluency state (badge only)
- `annotation-flow.png` — end-to-end interaction flow diagram
