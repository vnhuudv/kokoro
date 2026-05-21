# Google Chat Integration — Design Spec

**Project:** Tâm × 心 (Kokoro) — AI Cultural Translation Engine
**Date:** 2026-05-20
**Author:** huudv@vnext.vn
**Status:** Approved

---

## Purpose

Extend the Kokoro Slack integration to Google Chat so that Vnext Japan pilot participants who communicate via Google Workspace receive the same real-time cultural annotation experience. The Google Chat app is a second client for the existing annotation pipeline — no backend changes are required.

---

## Actors

| Actor | Role |
|---|---|
| Vietnamese engineer | Sends and receives messages in Google Chat spaces |
| Japanese client | Counterpart in cross-cultural communication |
| Kokoro annotation pipeline | Unchanged backend — same REST endpoints |
| Google Chat platform | Delivers webhook events; renders Card v2 responses |

---

## Scope

Full feature parity with the Slack integration:

| Feature | Slack | Google Chat |
|---|---|---|
| Inline annotation | Ephemeral Block Kit message | Private Card v2 (`privateMessageViewer`) |
| Pre-send check | `/kokoro` slash command | `/kokoro` slash command |
| Suggestion buttons | Block Kit actions | Card v2 button widgets |
| Coaching panel | Slack modal (views.open) | Google Chat Dialog (renderActions.pushCard) |
| Feedback recording | POST /feedback/suggestion-used | POST /feedback/suggestion-used |

---

## Architecture

### New Service: `google-chat-app`

A TypeScript/Express HTTP service deployed alongside the existing Docker Compose stack. Receives Google Chat webhook events, calls the annotation pipeline, and returns Card v2 responses.

```
code/src/services/google-chat-app/
├── Dockerfile
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts              # Express server — POST /webhook
    ├── handlers/
    │   ├── message.ts        # Space message → annotation pipeline → private card
    │   ├── slash.ts          # /kokoro draft → annotation pipeline → presend card
    │   └── action.ts         # Button clicks → suggestions + coaching dialog
    ├── cards/
    │   ├── annotation.ts     # Build annotation Card v2
    │   ├── presend.ts        # Build pre-send Card v2
    │   └── coaching.ts       # Build coaching Dialog (renderActions.pushCard)
    └── middleware/
        └── verify.ts         # Verify Google bearer token (google-auth-library)
```

### Relationship to existing services

```
Google Chat platform
        │  POST /webhook
        ▼
google-chat-app:8004
        │  POST /annotate/
        │  POST /feedback/suggestion-used
        │  POST /coaching/panel
        ▼
annotation-pipeline:8001   (unchanged)
        │
        ▼
llm-gateway:8002 + postgres  (unchanged)
```

---

## Event Flows

### Flow 1 — Inline Annotation

1. User sends a message in a Google Chat space where the Kokoro bot is installed.
2. Google POSTs a `MESSAGE` event to `POST /webhook`.
3. `verify.ts` validates the `Authorization: Bearer <token>` header against Google's public certificates.
4. `message.ts` calls `POST /annotate/` with the message text, tenant ID, and language config.
5. If the annotation result is neutral (`intent_label = 'Neutral message'` and no `risk_category`): return HTTP 200 with empty body — no annotation posted.
6. If flagged: call the Chat REST API (`spaces.messages.create`) with `privateMessageViewer` set to the sender — only the sender sees the annotation card.

### Flow 2 — Pre-Send Check (`/kokoro`)

1. User types `/kokoro <draft message>` in any space or DM.
2. Google POSTs a `MESSAGE` event (with `message.slashCommand` populated) to `POST /webhook`.
3. `slash.ts` calls `POST /annotate/` with the draft text.
4. Returns a Card v2 synchronously in the HTTP response body:
   - **No risk:** green check card — "Your message looks good to send."
   - **Flagged:** warning card with `risk_category`, `micro_text`, suggestion buttons, and "Learn more" button.

### Flow 3 — Suggestion Buttons

1. User clicks a suggestion button on an annotation or pre-send card.
2. Google POSTs a `CARD_CLICKED` event to `POST /webhook`.
3. `action.ts` fires `POST /feedback/suggestion-used` (non-blocking).
4. Returns an updated card synchronously showing the suggested phrasing in a blockquote-style text section.

### Flow 4 — Coaching Dialog

1. User clicks "Learn more" on any annotation or pre-send card.
2. Google POSTs a `CARD_CLICKED` event with `dialogEventType: 'REQUEST_DIALOG'`.
3. `action.ts` calls `POST /coaching/panel` with the coaching context encoded in the button's action parameters.
4. Returns a Dialog (`renderActions: { pushCard: { ... } }`) synchronously with sections:
   - REGISTER — label + explanation
   - INTENT — communicative intent
   - CULTURAL RISK — specific risk (if present)
   - WHY THIS MATTERS — rationale grounded in cultural concepts
   - SUGGESTED PHRASING — adapted alternative (if present)

> Note: Google Chat dialogs are synchronous — no two-step trigger_id pattern needed (simpler than Slack modals).

---

## Request Verification

Google Chat signs all webhook requests with a bearer token in the `Authorization` header. The token is a Google-signed JWT where the audience is the receiving service's URL.

Verification steps in `verify.ts`:
1. Extract bearer token from `Authorization` header.
2. Use `google-auth-library` (`OAuth2Client.verifyIdToken`) to validate the JWT.
3. Check that the token audience matches `GOOGLE_CHAT_WEBHOOK_AUDIENCE` (set to the public webhook URL).
4. Reject with HTTP 401 if verification fails.

---

## Card v2 Structure

### Annotation Card
```
┌─────────────────────────────────────────┐
│ Kokoro · ⚠ Register mismatch            │  ← header section
│ _This phrasing may signal blame..._     │  ← micro_text
│ [Formal equivalent] [Neutral follow-up] │  ← suggestion buttons
│ [Learn more]                            │  ← coaching button
└─────────────────────────────────────────┘
```

### Pre-Send Card (flagged)
```
┌─────────────────────────────────────────┐
│ Kokoro · ⚠ Before you send              │  ← header
│ _Cultural flag: directive register..._  │  ← micro_text
│ [Suggestion A] [Suggestion B]           │  ← suggestions
│ [Send original] [Learn more]            │  ← dismiss + coaching
└─────────────────────────────────────────┘
```

### Coaching Dialog
```
┌─────────────────────────────────────────┐
│ Kokoro — Cultural Coaching              │  ← dialog title
│ REGISTER                                │
│ Highly formal keigo with directive tone │
│ ─────────────────────────────────────── │
│ INTENT                                  │
│ Urgency and accountability              │
│ ─────────────────────────────────────── │
│ WHY THIS MATTERS                        │
│ Grounded in Ma (間) and nemawashi...    │
│ ─────────────────────────────────────── │
│ SUGGESTED PHRASING                      │
│ > より丁寧な表現...                       │
└─────────────────────────────────────────┘
```

---

## Environment Variables

```env
# google-chat-app
GOOGLE_CHAT_PROJECT_NUMBER=        # GCP project number — for bearer token verification
GOOGLE_SERVICE_ACCOUNT_KEY=        # JSON key (base64) — for Chat REST API (private messages)
GOOGLE_CHAT_WEBHOOK_AUDIENCE=      # Public webhook URL (e.g. https://abc.ngrok.io/webhook)
KOKORO_TENANT_ID=default-tenant
KOKORO_SOURCE_LANG=ja
KOKORO_TARGET_LANG=vi
```

---

## docker-compose Addition

```yaml
google-chat-app:
  build:
    context: .
    dockerfile: src/services/google-chat-app/Dockerfile
  ports:
    - "8004:8004"
  env_file: .env
  depends_on:
    - annotation-pipeline
  volumes:
    - ./src/services/google-chat-app/src:/app/src
```

---

## Local Development

1. Start all services: `docker compose up -d`
2. Expose the Google Chat service: `ngrok http 8004`
3. Register the ngrok URL as the webhook in Google Cloud Console → Google Chat API → Configuration → App URL.
4. Set `GOOGLE_CHAT_WEBHOOK_AUDIENCE` in `.env` to the ngrok URL.
5. Install the Kokoro app in a Google Chat space and test.

> Note: The ngrok URL changes on each restart. For stable local dev, use a fixed ngrok subdomain (paid) or deploy to a staging environment.

---

## Out of Scope

- Mobile push notifications
- Google Chat thread replies (annotations are top-level private messages)
- Multi-language support beyond `ja` ↔ `vi`
- Analytics integration with the dashboard (same `case_library` as Slack — dashboard already covers both)

---

## Phase Map

| Phase | Deliverable |
|---|---|
| M5 | `google-chat-app` service skeleton, webhook verification, inline annotation |
| M5 | Pre-send check (`/kokoro` slash command) |
| M5 | Suggestion buttons + feedback recording |
| M6 | Coaching dialog |
| M6 | Pilot rollout to Google Chat users |
