# System Overview — Tâm × 心 (Kokoro)

**Phase:** M1–2 (Foundation) — planning & architecture
**Status:** Active

---

## Purpose

Kokoro is a two-part system: an AI Cultural Translation Engine and a Wisdom Methodology Framework. Together they bridge communication gaps between Vietnamese and Japanese professionals by surfacing cultural intent, not just translating words.

The system must serve two concurrent goals:
1. **Academic** — produce a defensible MBA action-research thesis at Shizenkan University
2. **Business** — deliver a working engine prototype piloted at Vnext Japan, with evidence suitable for commercialisation or open-sourcing

---

## Actors

| Actor | Role |
|---|---|
| Vietnamese engineer | Primary pilot user; sends and receives messages through Slack |
| Japanese client | Primary pilot user; counterpart in cross-cultural communication |
| Delivery lead | Day-to-day pilot support, installation help |
| Research lead | Interviews, surveys, data collection |
| Cultural advisor (JP) | Reviews annotation accuracy, cultural nuance |
| Shizenkan advisor | Research ethics, thesis oversight |
| Project lead (MrX) | Strategic decisions, Vnext VP |
| Privacy lead | Data handling, opt-out processing |

---

## System Components

### 1. Client Layer
- Slack plugin (primary channel for pilot)
- Web application
- Mobile (iOS / Android)
- Browser plugins (Gmail, Outlook)
- Chat integrations (Teams, Zoom)

### 2. API Gateway
- REST + WebSocket interface
- Authentication (OIDC / SSO / OAuth2)
- Rate limiting and cost control

### 3. AI Core
| Sub-component | Responsibility |
|---|---|
| Orchestrator | Controls the six-stage processing pipeline |
| Privacy Filter | On-device PII redaction before any data leaves the device |
| Register Detector | Classifies message as formal / neutral / informal |
| Intent Extractor | Identifies the underlying intent behind the phrasing |
| LLM Gateway | Multi-model routing with failover and cost control |
| Annotation Renderer | Renders inline cultural cues and suggestion chips |
| Feedback Learner | Refines model from native-speaker review loop |

### 4. Data Stores
| Store | Contents |
|---|---|
| Cultural Pair DB | VN ↔ JP register mappings |
| Case Library | Anonymised teaching cases |
| User Profiles | Preferences, fluency state |
| Audit & Logs | Encrypted, retention-bounded |

---

## Six-Stage Processing Pipeline

| Stage | Action | Target latency |
|---|---|---|
| 1. Capture | Intercept message in client app | ~10 ms |
| 2. Anonymise | On-device PII redaction | ~30 ms |
| 3. Parse | Tokenise, split utterances | ~20 ms |
| 4. Analyse | Register, sentiment, cultural cue detection | ~250 ms |
| 5. Translate | LLM call with cultural context | ~600 ms |
| 6. Annotate | Render inline cues + suggestions; persist anonymised case | ~90 ms |
| **Total P50** | | **~1.0 second** |

Async fallback: streaming partial annotations when P50 is exceeded.

---

## Functional Requirements

**FR-SYS-001:** The system must process messages end-to-end in under 1.5 seconds (P95).

**FR-SYS-002:** All six pipeline stages must be independently deployable and replaceable without redeploying the full system.

**FR-SYS-003:** The system must support at minimum the Slack client for the pilot; other clients are planned but not required for MVP.

**FR-SYS-004:** The system must operate entirely within the Vnext workspace — no raw message content may be processed on infrastructure outside the tenant boundary.

**FR-SYS-005:** The system must support language pair VN ↔ JP at MVP. Additional pairs are out of scope until post-pilot.

**FR-SYS-006:** The system must degrade gracefully — if AI processing fails or times out, the original message is delivered unmodified with no annotation.

**FR-SYS-007:** All system actions that touch user data must be logged in the audit store with timestamp, actor, action, and retention expiry.

---

## Acceptance Criteria

- Slack plugin installs and activates within a Vnext workspace without IT escalation
- A message sent by a Vietnamese engineer to a Japanese client is annotated with cultural context within 1.5 seconds
- If the AI pipeline is unavailable, the message is delivered to the recipient without error or delay
- Audit log entries are written for every message processed, accessible to the privacy lead within 5 working days

---

## Constraints

- Pilot scope is locked: Slack only, VN ↔ JP only, annotation + suggestions only — until Month 8
- No auto-rewrite of any message at any point in the pipeline
- Participation is opt-in; the system must not activate on channels where no participant has consented

---

## Out of Scope (MVP)

- Languages other than Vietnamese and Japanese
- Clients other than Slack
- Auto-sending or auto-rewriting messages
- Training external models on customer data
- Access to private direct messages

---

## Phase Map

| Requirement | Phase |
|---|---|
| Architecture finalized, privacy review started | M1–2 |
| MVP built, Slack plugin deployed to pilot | M3–4 |
| Engine live for full pilot team | M5–6 |
| Endline measurement, board pitch preparation | M7–8 |
