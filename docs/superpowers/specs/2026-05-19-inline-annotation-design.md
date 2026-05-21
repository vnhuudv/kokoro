# Inline Annotation Design

**Date:** 2026-05-19
**Project:** Kokoro — AI Cultural Translation Engine
**Feature:** Engine — Inline Annotation (end-to-end)
**Status:** Approved

---

## Summary

End-to-end implementation of the inline annotation feature: from a Slack `message` event arriving at slack-app, through the annotation-pipeline, to an ephemeral Block Kit annotation posted back to cross-cultural opted-in recipients. This is the core Kokoro value loop — the moment a participant receives a message and Kokoro quietly surfaces what's underneath it.

---

## Architecture Decision

**Thin slack-app pattern.** slack-app owns: receive → profile check → call pipeline → render Block Kit → post ephemeral. annotation-pipeline owns all 6 processing stages and the full business logic. No routing through api-gateway (designed for external clients, not internal service-to-service calls). No direct llm-gateway calls from slack-app (would bypass anonymisation and register detection).

---

## Trigger Model

**User-profile-based.** Each opted-in participant has a declared cultural profile (`vi` or `ja`) stored in the database and surfaced via api-gateway. On each incoming message, slack-app checks:

1. Is the sender opted-in?
2. Are there any opted-in recipients in the channel whose culture differs from the sender's?

If both conditions are met, the annotation pipeline is called. Otherwise, the message passes silently with no processing.

This is VN↔JP pairs only at MVP.

---

## Profile Lookup

slack-app maintains two **in-memory caches**, both with a **5-minute TTL**:

**User profile cache** (`Map<slackUserId, UserProfile>`):
- **Cache hit**: profile returned immediately (~0ms)
- **Cache miss**: call `api-gateway GET /users/profiles?slackIds=[...]`, populate cache, return result
- **api-gateway unreachable on miss**: treat sender as not opted-in → skip annotation, log `profile_lookup_failure`
- **Opt-out**: cache entry expires naturally within 5 minutes; no active invalidation at MVP scale

**Channel members cache** (`Map<channelId, slackUserId[]>`):
- A Slack `message` event only contains `userId` (sender) and `channelId`. To know who else is in the channel, slack-app calls `conversations.members` (Slack Web API) on cache miss.
- **Cache hit**: member list returned from cache
- **Cache miss**: call `conversations.members`, cache result, return list
- Member IDs are then fed into the user profile cache lookup to resolve cultural profiles and opt-in status.

---

## Recipient Targeting

`chat.postEphemeral` is called once per opted-in cross-cultural recipient in the channel. In a channel where Bob (VN) sends a message and Alice (JP) + Carol (JP) are both opted-in, both Alice and Carol receive separate ephemeral annotations. Dave (VN, same culture as Bob) receives nothing.

One Block Kit payload is built once from the `AnnotationResult` and reused for all N recipients.

---

## End-to-End Flow

```
Slack ──① message event {text, userId, channelId, ts}──► slack-app

slack-app:
  ② Profile lookup (in-memory cache → api-gateway on miss)
  ③ Filter: sender opted-in? cross-cultural recipients exist? → skip if no
  ④ POST /annotate {messageId, channelId, senderId, senderCulture, text}
     timeout: 1.4s  (recipientIds retained locally by slack-app)

annotation-pipeline:
  ⑤ capture (~10ms) → anonymise (~30ms) → parse (~20ms)
     → analyse (~250ms) → llm-gateway /complete (~600ms) → annotate (~90ms)
     P50 ~1.0s · P95 <1.4s

annotation-pipeline ──⑥ AnnotationResult──► slack-app

slack-app:
  ⑦ Render Block Kit (fluency-state-aware template)
  ⑧ chat.postEphemeral × N cross-cultural opted-in recipients

Error path (timeout or any error):
  Silent drop — no ephemeral posted — failure logged — original message unaffected
```

---

## Data Contracts

### `POST /annotate` Request

```json
{
  "messageId": "1620000000.000100",
  "channelId": "C012AB3CD",
  "senderId": "U012AB3CD",
  "senderCulture": "vi",
  "text": "Please review and let me know by end of week."
}
```

slack-app retains the `recipientIds` list locally and uses it after receiving the `AnnotationResult` to drive the `chat.postEphemeral` calls. The pipeline does not need recipient IDs — it annotates the message text, not the recipients.

### `AnnotationResult` Response

```json
{
  "messageId": "1620000000.000100",
  "register": "neutral",
  "intentLabel": "Firm deadline request",
  "riskCategory": "time_commitment_ambiguity",
  "microText": "\"End of week\" is often read as a soft suggestion in Japanese context. The sender likely means Friday COB.",
  "suggestions": [
    { "label": "Reply formally", "register": "formal", "text": "承知いたしました。金曜日までに確認いたします。" },
    { "label": "Reply neutrally", "register": "neutral", "text": "わかりました。金曜日までに確認します。" }
  ],
  "coachingRationale": "Vietnamese directness around timelines can read as ambiguous to Japanese colleagues who expect explicit dates and confirmations. The phrase pattern signals urgency but the recipient needs a concrete anchor."
}
```

`coachingRationale` is generated in the same LLM call as the annotation, not lazily. This avoids a second LLM call when the user opens the coaching panel later.

---

## Block Kit Layout — Three Adaptive States

The renderer selects a template based on the recipient's `fluencyScore` (sourced from their `UserProfile`). The thresholds below (0–30, 31–69, 70+) are provisional — they will be confirmed when the fluency scoring model is designed. The renderer should read the threshold values from configuration, not hardcode them.

### State 1 — Full (fluency score 0–30 / first ~2 weeks)

```
┌─ ▌ [NEUTRAL badge]  Firm deadline request                        ✕ ─┐
│    "End of week" is often read as a soft suggestion in Japanese      │
│    context. The sender likely means Friday COB.                      │
│                                                                      │
│    [Reply formally]  [Reply neutrally]                               │
│    Learn more →                                                      │
└──────────────────────────────────────────────────────────────────────┘
  Only visible to you
```

All elements shown: register badge, intent label, micro-text, suggestion chips, "Learn more" link, dismiss control.

### State 2 — Condensed (fluency score 31–69 / weeks 3–8)

```
┌─ ▌ [NEUTRAL badge]  Firm deadline request  ▾ Expand               ✕ ─┐
└────────────────────────────────────────────────────────────────────────┘
  Only visible to you
```

Register badge + intent label only. Micro-text and chips collapsed. "Expand" link reveals full state on demand.

### State 3 — Badge only (fluency score 70+ / high fluency)

```
┌─ ▌ [NEUTRAL badge]  Show more                                     ✕ ─┐
└────────────────────────────────────────────────────────────────────────┘
  Only visible to you
```

Register badge only. Everything else hidden unless "Show more" tapped.

### Visual conventions

- Left border accent: muted purple (`#7B68EE`) — informational, not warning
- Background: `#F8F7FF` — subtle, distinct from regular messages
- No red or warning colours
- "Only visible to you" Slack system text always shown below

### Dismiss behaviour

Tapping ✕ suppresses future annotations for that specific `phrasePattern` for this user. Stored as a dismissed pattern in the user's profile. Does not affect other users.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Pipeline timeout (>1.4s) | Silent drop. No ephemeral. Log: `annotation_timeout` with `messageId`, `channelId`, duration. |
| Pipeline HTTP error (4xx/5xx) | Silent drop. Log: `annotation_error` with status code. |
| All LLM providers unavailable (503) | annotation-pipeline returns 503 → slack-app treats as pipeline error → silent drop + log. |
| api-gateway unreachable on profile miss | Skip annotation. Log: `profile_lookup_failure`. |
| Sender not opted-in | Skip entirely. No log (expected path). |
| No cross-cultural recipients | Skip entirely. No log (expected path). |

Kokoro never blocks message delivery. All errors are ambient — the user sees nothing, the original message is already delivered.

---

## Testing

### Unit tests

**slack-app** (`tests/unit/services/slack-app/`):
- Profile cache: hit returns cached value, miss calls api-gateway and populates cache, entry expires after TTL, api-gateway failure returns null
- Cross-cultural filter: VN sender + JP recipients → both included; VN sender + VN recipient → excluded; not-opted-in recipient → excluded
- Block Kit renderer: full state produces correct JSON for `register`, `intentLabel`, `microText`, `suggestions`; condensed state omits micro-text and chips; badge-only state omits everything except register

**annotation-pipeline** (`tests/unit/services/annotation-pipeline/`):
- Each stage in isolation: anonymiser redacts PII patterns, register detector returns correct label from mocked cultural pair DB, annotator assembles correct `AnnotationResult` from mocked LLM response

**llm-gateway** (`tests/unit/services/llm-gateway/`):
- Failover: Claude timeout → OpenAI called; OpenAI timeout → Gemini called; all fail → 503 returned

### Integration tests

**slack-app → annotation-pipeline** (`tests/integration/`):
- Real FastAPI annotation-pipeline, mocked llm-gateway
- Verify full request/response contract: correct `AnnotationResult` shape returned for a VN→JP message
- Verify profile cache: api-gateway called on miss, not on subsequent hit within TTL

### E2E tests

**Golden path** (`tests/e2e/`):
- Simulate Slack `message` event: sender VN (opted-in), two JP recipients (both opted-in), one VN recipient (opted-in, same culture)
- Assert: two `chat.postEphemeral` calls made with valid Block Kit JSON; VN recipient receives no ephemeral
- Assert: when annotation-pipeline returns 503, zero `chat.postEphemeral` calls made (silent drop)

---

## Out of Scope (MVP)

- Pre-send check (outgoing messages) — separate feature
- Coaching panel implementation — scaffolded only; "Learn more" link present but non-functional
- Non-VN/JP language pairs
- Private DMs
- Annotation on bot messages, edited messages, or deleted messages
- Kafka-based async fallback for slow pipeline responses
- Active cache invalidation on user opt-out (TTL expiry is sufficient at pilot scale)

---

## Files to Create or Modify

| File | Change |
|---|---|
| `src/services/slack-app/src/handlers/message.ts` | Extend existing handler: profile lookup, filter, call pipeline, render, post ephemeral |
| `src/services/slack-app/src/cache/profile-cache.ts` | New: in-memory UserProfile cache with TTL |
| `src/services/slack-app/src/cache/channel-cache.ts` | New: in-memory channel members cache with TTL, calls conversations.members |
| `src/services/slack-app/src/renderers/annotation-block.ts` | New: AnnotationResult → Block Kit JSON, three fluency states |
| `src/services/slack-app/src/clients/annotation-pipeline.ts` | New: HTTP client for annotation-pipeline with 1.4s timeout |
| `src/services/annotation-pipeline/app/routers/annotate.py` | New: POST /annotate endpoint |
| `src/services/annotation-pipeline/app/pipeline/` | Extend stubs: anonymiser, register_detector, intent_extractor, annotator |
| `src/services/python_shared/types.py` | Add `AnnotateRequest`, `AnnotationResult` Pydantic models |
| `tests/unit/services/slack-app/` | Unit tests for cache, filter, renderer, client |
| `tests/unit/services/annotation-pipeline/` | Unit tests for each pipeline stage |
| `tests/integration/annotation-flow.test.ts` | Integration test: slack-app → annotation-pipeline |
| `tests/e2e/annotation-golden-path.test.ts` | E2E golden path test |
