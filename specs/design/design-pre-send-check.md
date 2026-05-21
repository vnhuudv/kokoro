# Design Spec — Pre-Send Intent Check

**Linked requirement:** [engine-pre-send-check.md](../requirements/engine-pre-send-check.md)
**ADR reference:** [ADR-003-slack-integration-approach.md](../decisions/ADR-003-slack-integration-approach.md)
**Phase:** M3–4
**Status:** Draft

---

## Overview

The pre-send check intercepts a message just before the user sends it. It surfaces cultural risks quietly — as a non-blocking overlay or panel — so the user can choose to adjust their message or send it as written. The experience must feel like a thoughtful colleague tapping your shoulder, not a gatekeeper blocking your way.

---

## Surfaces

The pre-send check appears in **two contexts**:
1. **Slack reply composer** — as an overlay above the send button when the user is about to send
2. **Email clients (Gmail, Outlook)** — as a sidebar panel or inline warning before the send action executes

This spec covers the **Slack** implementation for MVP. Email is the same concept with surface-specific layout adjustments.

---

## Trigger

The check is triggered when the user clicks or taps the Slack send button (or presses Enter/Cmd+Enter).

The check does **not** run while the user is typing — only at the point of send intent. This avoids distracting mid-draft interruptions.

---

## Pre-Send Panel Layout (Slack)

```
┌──────────────────────────────────────────────────────────┐
│  Before you send — 1 thing to consider                   │
│                                                          │
│  ⚠  Face risk                                           │
│  Your message contains a direct refusal ("We can't do   │
│  this"). In Japanese business communication, direct      │
│  refusals can feel abrupt. Consider softening the        │
│  phrasing while keeping your meaning clear.              │
│                                                          │
│  Suggested revision:                                     │
│  "This would be difficult for us at this stage —         │
│   could we explore an alternative approach?"             │
│                                                          │
│  [ Use suggestion ]   [ Send original ]   [ Edit draft ] │
└──────────────────────────────────────────────────────────┘
```

### Elements

| Element | Description |
|---|---|
| Header count | "Before you send — N thing(s) to consider". If N=0, panel does not appear. |
| Risk flag | Icon + risk category label (e.g., "⚠ Face risk", "ℹ Missing acknowledgement"). |
| Flag explanation | 2–4 sentences explaining the risk in plain language and the cultural context behind it. |
| Suggested revision | Optional. A culturally adjusted alternative phrasing. Only shown when the LLM produces a high-confidence suggestion. |
| "Use suggestion" button | Replaces draft content with the suggestion. User can still edit before sending. |
| "Send original" button | Sends the message unchanged. Always available — never disabled. |
| "Edit draft" button | Dismisses the panel and returns focus to the composer so the user can revise manually. |

---

## Multiple Flags

When more than one risk category is detected, flags are stacked vertically in order of severity (highest first). Each flag has its own explanation and optional suggestion.

```
┌──────────────────────────────────────────────────────────┐
│  Before you send — 2 things to consider                  │
│                                                          │
│  ⚠  Face risk                                           │
│  [explanation]                                           │
│  Suggested revision: [...]                               │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  ℹ  Missing acknowledgement                             │
│  [explanation]                                           │
│                                                          │
│  [ Use suggestion for Face risk ]                        │
│  [ Send original ]   [ Edit draft ]                      │
└──────────────────────────────────────────────────────────┘
```

If multiple suggestions exist, "Use suggestion" applies only to the first (highest-severity) flag. The user can apply others by editing the draft manually.

---

## Visual Tone

- The panel appears as a modal overlay above the Slack composer — not a full-screen takeover
- Risk icons use a muted amber (⚠) for face/register risks and a blue info icon (ℹ) for softer flags
- No red — red implies error or blocking; the pre-send check is advisory, not a stop
- "Send original" is always visually prominent — it must never feel hidden or de-emphasised

---

## States

**No risk detected**
Panel does not appear. Message sends normally. No indication to the user that a check was run.

**Check in progress (>200ms)**
A brief "Checking..." indicator appears in the composer footer. The send action is held for a maximum of 2 seconds. After 2 seconds, the message sends without a check — failure is logged silently.

**LLM unavailable**
Message sends without check. Silent failure, logged internally.

---

## Interaction Flow

```
User clicks Send
        │
        ▼
Pipeline runs check (~600ms)
        │
   ┌────┴────┐
   │ Flags?  │
   └────┬────┘
        │ Yes                    No → message sends
        ▼
Pre-send panel appears
        │
   ┌────┴──────────────────────────────┐
   │                │                  │
"Use suggestion"  "Send original"  "Edit draft"
   │                │                  │
Draft updated    Message sends    Panel closes,
User can edit    unchanged        focus returns
then sends                        to composer
```

---

## Accessibility

- Panel is keyboard navigable: Tab moves between buttons; Enter activates focused button
- "Send original" is always the first focusable element after the panel opens — so a user who immediately presses Enter sends their original message (no accidental suggestion insertion)
- All risk labels are text — icons are decorative and not the sole means of conveying meaning

---

## Localisation

- Flag explanations are generated in the sender's language (Vietnamese or Japanese based on their profile)
- Suggested revisions are in the language the draft is written in
- Panel UI labels ("Before you send", "Send original", etc.) are translated per user language setting

---

## Assets Required

Place in `assets/design/`:
- `pre-send-panel-single-flag.png` — panel with one flag and a suggestion
- `pre-send-panel-multi-flag.png` — panel with two flags stacked
- `pre-send-panel-no-risk.png` — message flow when no panel appears (for documentation)
- `pre-send-flow.png` — interaction flow diagram
