# Engine — Privacy Architecture & Data Handling

**Phase:** M1–2 (Foundation) — privacy review required before build
**Status:** Active

---

## Purpose

Define the rules governing how user data is collected, processed, stored, and deleted. Privacy is a first-class design constraint, not a compliance checkbox. The engine must earn and maintain participant trust — both because the pilot depends on voluntary participation and because the thesis must satisfy research ethics standards at Shizenkan University.

---

## Actors

| Actor | Role |
|---|---|
| Pilot user | Data subject; holds all rights over their data |
| Privacy lead (Vnext) | Responsible for data handling compliance, opt-out processing |
| Research lead | Access to anonymised aggregate data only |
| Shizenkan advisor | Research ethics oversight |
| Cultural advisor | Access to anonymised case library for annotation review only |

---

## Core Principles

1. **Minimise** — collect only what is necessary to perform the cultural annotation task
2. **Localise** — run sensitive processing steps on-device wherever possible
3. **Anonymise** — strip all identifiers before any data leaves the device or is passed to an LLM
4. **Bound** — use per-tenant encryption keys; no cross-customer data reuse
5. **Audit** — log every data access event with timestamp, actor, and retention expiry
6. **User-first** — all participation is opt-in, revocable at any time, with no penalty

---

## Functional Requirements

### Consent & Opt-In

**FR-PRI-001:** The system must not activate for any user who has not completed a signed consent form (physical or digital). Consent is per-user, not per-workspace.

**FR-PRI-002:** The system must operate only on channels that have been explicitly opted into by all participants present in that channel. It must not activate on channels with non-consenting members.

**FR-PRI-003:** The system must provide a single-action opt-out. On opt-out, the system must:
- Deactivate processing for that user within 24 hours
- Remove the user from all future data collection
- Confirm opt-out to the user in writing

### Data Minimisation

**FR-PRI-004:** Message content must be processed only for the purpose of cultural annotation. It must not be stored in identifiable form on any server.

**FR-PRI-005:** PII (names, email addresses, identifiers) must be redacted on-device before any payload is transmitted to the API layer or LLM.

**FR-PRI-006:** The system must not access private direct messages (DMs) under any circumstances, even for users who have opted in.

### Encryption & Tenant Isolation

**FR-PRI-007:** Each tenant (organisation) must have a unique encryption key. Keys must be rotated on a defined schedule. No key may be reused across tenants.

**FR-PRI-008:** No raw message text may leave the user's device unencrypted (TLS minimum; end-to-end encryption for content in transit).

**FR-PRI-009:** All data at rest in the audit log, case library, and user profiles must be encrypted.

### Data Retention & Deletion

**FR-PRI-010:** All stored data must carry a defined retention expiry. Audit logs must be deleted after a defined period (default: 12 months post-pilot). The pilot end date triggers a retention review.

**FR-PRI-011:** Any pilot user may request deletion of their data at any time, including after the pilot ends. Deletion must be completed within 5 working days of the request.

**FR-PRI-012:** A user may request to view all data held about them within 5 working days of the request.

### Model Training

**FR-PRI-013:** Customer message data must not be used to train any external LLM. Fine-tuning of the cultural annotation model is permitted only on anonymised case library data and only with explicit informed consent from participants.

### Audit & Transparency

**FR-PRI-014:** Every pipeline call that processes a user message must produce an audit log entry containing: timestamp, action, data classification, tenant ID (not user ID), and retention expiry. The log must be exportable by the privacy lead.

**FR-PRI-015:** The system must provide a public-facing privacy summary (plain language, not legal text) accessible to all pilot participants before they consent.

---

## Acceptance Criteria

- A new user who has not signed consent cannot be processed by the pipeline; their messages pass through unmodified
- A user triggers opt-out; within 24 hours their channel shows no annotations; within 5 days their case library contributions are removed from aggregate counts
- A participant requests their data; the privacy lead delivers a complete export within 5 working days containing only anonymised records
- An audit log is exportable by the privacy lead and contains no raw message text or user names
- A Vnext workspace is deployed with a unique tenant encryption key that differs from any other tenant

---

## Constraints

- Privacy architecture must be reviewed and approved by the Vnext data-handling team and the Shizenkan advisor before M3 build begins
- Any change to data handling after consent forms are signed requires participant re-consent
- The privacy lead at Vnext holds authority over all data deletion decisions

---

## Edge Cases

- A user opts out mid-conversation thread: the thread is no longer processed from that point; previously annotated messages remain visible to the recipient but no new annotations are generated
- Tenant encryption key rotation occurs while a request is in-flight: complete the request with the current key; write the new key for subsequent requests
- A participant requests deletion after the pilot has ended and the thesis has been submitted: delete the data; note in thesis that the dataset is subject to post-submission deletion requests

---

## Out of Scope

- Full GDPR / APPI legal compliance certification (pilot-phase best-effort; full certification is post-pilot)
- End-to-end encryption of Slack messages (Slack's own encryption applies; Kokoro adds a layer on top for its own data stores)

---

## Phase Map

| Requirement | Phase |
|---|---|
| Privacy architecture designed, reviewed by Vnext data team and Shizenkan advisor | M1–2 |
| On-device PII redaction and per-tenant encryption implemented | M3–4 |
| Full audit log operational, opt-out flow tested | M5–6 |
| Retention review triggered at pilot close; deletion requests processed | M7–8 |
