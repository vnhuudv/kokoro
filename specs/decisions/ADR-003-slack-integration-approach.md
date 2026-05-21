# ADR-003 — Slack Integration Approach

**Status:** Accepted
**Date:** 2026-05-18
**Author:** MrX (Project Lead)

---

## Context

The Kokoro engine's primary channel for the pilot is Slack. The annotation feature must intercept messages as they arrive or are composed, process them through the cultural annotation pipeline, and surface results inline — without disrupting the normal Slack experience for any participant.

Slack offers several integration patterns, each with different capabilities, latency profiles, and installation requirements:

1. **Events API** — server receives webhook callbacks when events occur (messages sent, channels joined, etc.)
2. **Socket Mode** — persistent WebSocket connection from the app to Slack's servers; no public endpoint required
3. **Slash commands + Block Kit** — user-triggered interactions surfaced as rich UI blocks
4. **Workflow Steps (deprecated)** — embedded workflow automation; being phased out by Slack

The question: **which Slack integration pattern best serves inline annotation delivery within the latency and installation constraints of the pilot?**

---

## Decision

Adopt **Socket Mode as the primary connection method**, with **Block Kit for annotation rendering**.

### Connection: Socket Mode
The Kokoro Slack app uses Socket Mode to receive events from Slack over a persistent WebSocket, rather than requiring a public-facing webhook endpoint.

**Why Socket Mode:**
- Does not require Vnext to expose a public endpoint or configure firewall rules — critical for a corporate network environment
- Easier and faster to install for the pilot; participants only need to click an install link (satisfying FR-ONB-010)
- Suitable for pilot-scale traffic (40–80 users); Socket Mode is Slack-recommended for development and internal apps

### Annotation rendering: Block Kit
Annotations are rendered as Block Kit message attachments appended to the original message thread — not as a replacement or edit of the original message.

**Rendering approach:**
- When an incoming message is received from a counterpart culture, the engine processes it and posts a Block Kit annotation as a thread reply or an ephemeral message visible only to the recipient
- The annotation block contains: register label, intent summary, coaching micro-text, and suggestion chips (buttons)
- Suggestion chips are interactive elements — tapping one populates the reply composer via the `views.open` API (it does not send automatically)
- The original message is never modified

**Ephemeral vs. thread reply:**
- Default: ephemeral message (visible only to the recipient, not to the sender or other channel members)
- Rationale: annotation is a private coaching tool for the recipient; the sender should not see that their message triggered a cultural annotation

### Installation
- The app is distributed as a Slack app installed at the workspace level by a Vnext Slack admin
- Individual users opt in by clicking a personal install link that grants the app access to their messages in opted-in channels only
- The app requests only the minimum required OAuth scopes: `channels:history`, `chat:write`, `im:write` (ephemeral messages)

---

## Alternatives Considered

### Option A — Events API with public webhook (rejected)
The app receives events via HTTP POST to a public-facing endpoint.

**Why rejected:** Requires Vnext to expose and maintain a public endpoint, which involves firewall changes, SSL certificate management, and security review. This significantly increases setup time and the risk of the pilot being blocked by Vnext IT. Socket Mode avoids all of this.

### Option B — Message editing (replace original with annotated version) (rejected)
Instead of posting a separate annotation, the engine edits the original message to embed annotation inline.

**Why rejected:** Editing a sender's message — even to add annotation — violates the design principle that the original message is never modified. It also creates a confusing experience where the sender sees their message changed. The sender did not opt in to having their messages altered.

### Option C — Dedicated sidebar app (Home tab only) (rejected)
Surface all annotations in the Slack App Home tab rather than inline in the channel.

**Why rejected:** Requires the user to actively navigate away from the conversation to read annotations. The teaching effect depends on the annotation appearing in the flow of the conversation, at the moment of reading — not in a separate tab the user must remember to check.

### Option D — Bot message in channel (visible to all) (rejected)
Post annotations as a bot message visible to all channel members, not just the recipient.

**Why rejected:** The sender would see that their message triggered a cultural annotation, which could feel judgmental or cause awkwardness. Annotation is a private coaching tool for the recipient. Ephemeral messages keep the coaching layer invisible to the sender.

---

## Consequences

**Positive:**
- Socket Mode eliminates the need for a public endpoint, making the pilot easier to deploy on Vnext's corporate network
- Ephemeral Block Kit messages keep annotation private to the recipient — no social awkwardness for the sender
- Block Kit's interactive components (buttons, suggestion chips) provide a native Slack UX without a custom UI framework
- Minimum OAuth scopes reduce the security surface area and simplify the Vnext IT review

**Negative / risks:**
- Socket Mode has a connection limit per app; if the pilot scales beyond a few hundred concurrent users, migration to Events API will be required (not a concern at 40–80 pilot users)
- Ephemeral messages cannot be retrieved after the Slack session ends — if a user dismisses an annotation, it is gone. The coaching panel (a separate modal) provides persistence if needed
- Block Kit UI is constrained by Slack's design system — custom annotation layouts are limited to what Block Kit supports

**Open questions:**
1. Workspace-level Slack app install assumed feasible on Vnext network.
2. Ephemeral-only annotations assumed acceptable for MVP; persistent history can be added post-pilot if participants request it.
