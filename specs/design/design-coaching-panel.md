# Design Spec — Cultural Coaching Panel

**Linked requirement:** [engine-coaching-panel.md](../requirements/engine-coaching-panel.md)
**Phase:** M3–4
**Status:** Draft

---

## Overview

The coaching panel is the deepest layer of the engine's teaching experience. It opens on demand when a user wants to understand — not just react to — an annotation or pre-send flag. Unlike the inline annotation (fast, ephemeral, in-context), the coaching panel is a focused, screen-level experience that can be read at the user's pace.

The panel teaches, then teaches less. Its depth reduces as the user's fluency grows.

---

## Surface

The coaching panel opens as a **Slack modal** (using `views.open`) triggered by:
- The "Learn more" button on an inline annotation block
- A "Why?" or "Explain this" link on a pre-send flag

It is a full-panel modal — it overlays the Slack UI and captures focus until dismissed.

---

## Panel Layout

```
┌──────────────────────────────────────────────────────────┐
│  Cultural Context                              [  ✕  ]   │
│  ─────────────────────────────────────────────────────  │
│                                                          │
│  REGISTER                                                │
│  Formal — Japanese honorific system (敬語, keigo)        │
│  This message uses the highest tier of Japanese          │
│  business politeness. It signals seniority or deep       │
│  respect for the recipient's time.                       │
│                                                          │
│  INTENT                                                  │
│  Firm request                                            │
│  "ご検討いただけますと幸いです" is grammatically a wish,  │
│  but functionally a firm request. In Japanese business   │
│  culture, this phrasing carries strong expectation of    │
│  action.                                                 │
│                                                          │
│  CULTURAL RISK                                           │
│  If read literally as a soft hope, you may under-        │
│  prioritise this request and damage trust with the       │
│  client.                                                 │
│                                                          │
│  WHY THIS MATTERS                                        │
│  Japanese business communication often uses indirection  │
│  to preserve face for both parties. The strength of a    │
│  request is signalled by its formality level, not its    │
│  directness. Learning to read register is the skill      │
│  that travels after this tool fades.                     │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  [ Mark as understood ]          [ Close ]               │
└──────────────────────────────────────────────────────────┘
```

### Sections

| Section | Description | Shown when |
|---|---|---|
| **Register** | The detected register with its cultural label and a plain-language explanation of what it means in context | Always |
| **Intent** | The underlying intent behind the surface phrasing, explained in plain language | Always |
| **Cultural risk** | The specific risk this phrase or tone creates for the counterpart relationship | When a risk is detected |
| **Why this matters** | The deeper cultural or religious-wisdom rationale — the "why" behind the annotation. This is the teaching layer | Always; condensed for high-fluency users |
| **Suggested phrasing** | Optional: a culturally adapted alternative with a note on how it changes the dynamic | When the LLM produces a confident suggestion |

---

## Adaptive Depth

| User fluency level | Panel content |
|---|---|
| New (weeks 1–4) | All sections shown in full; "Why this matters" is expanded by default |
| Developing (weeks 5–12) | Register + Intent shown in full; "Why this matters" collapsed by default with "Expand" link |
| Fluent (system-detected) | Register + Intent only; all other sections behind "Show more" |
| Pattern marked "understood" | Panel shows a condensed acknowledgement: "You've marked this pattern as understood. Here's a quick reminder." |

---

## "Mark as Understood" Action

When the user taps "Mark as understood":
- The system records that this user has understood this annotation pattern
- Future annotations for the same pattern are suppressed or condensed (per the adaptive behaviour in `design-inline-annotation.md`)
- A brief confirmation is shown: "Got it. We'll show less detail for this pattern going forward."
- The panel closes

This action is reversible — users can reset patterns in their personal fluency settings.

---

## Visual Tone

- Clean, spacious layout — this is a reading experience, not a quick glance
- Section headings in uppercase with small tracking (e.g., "REGISTER", "INTENT") — scan-friendly
- Cultural or religious terms (e.g., 敬語, kokoro) are displayed in their original script alongside the translation
- No warning colours — this is a learning context, not an error state
- "Mark as understood" uses a secondary button style; "Close" is the primary action

---

## States

**Standard state**
All applicable sections shown as described above.

**No cultural risk detected**
Panel shows a positive confirmation: "This message reads as culturally appropriate for the context." Register section still shown to reinforce learning.

**LLM unavailable (fallback)**
Panel shows a static fallback for the most common patterns (pre-written by the cultural advisor). A small note at the bottom: "Detailed explanation temporarily unavailable." Log failure internally.

**Loading**
If panel content takes >500ms to generate, show a skeleton loader for each section. Do not show an empty panel.

---

## Interaction Flow

```
User taps "Learn more" on annotation
              │
              ▼
Modal opens with skeleton loader
              │
        Content loads
              │
    User reads panel
              │
   ┌──────────┴──────────────┐
   │                         │
"Mark as understood"       "Close"
   │                         │
System records pattern    Modal closes
Panel closes              No state change
Confirmation shown
```

---

## Accessibility

- Modal traps focus while open (standard Slack modal behaviour)
- "Close" button (✕) is always in the top-right; Escape key also closes
- All section headings are semantic (`h2` level within the modal context)
- "Mark as understood" and "Close" are distinguishable by label, not colour alone

---

## Localisation

- All panel content is generated in the viewing user's language
- Cultural and religious terms are shown in original script with romanisation and translation
- Section labels ("REGISTER", "INTENT", etc.) are translated per user language

---

## Assets Required

Place in `assets/design/`:
- `coaching-panel-full.png` — full panel with all sections expanded
- `coaching-panel-condensed.png` — developing-fluency state (collapsed "Why this matters")
- `coaching-panel-minimal.png` — high-fluency state (register + intent only)
- `coaching-panel-understood.png` — state after user marks pattern as understood
