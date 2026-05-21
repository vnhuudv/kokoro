# ADR-001 — Privacy Architecture

**Status:** Accepted
**Date:** 2026-05-18
**Author:** MrX (Project Lead)

---

## Context

The Kokoro engine processes workplace messages — a category of data that is sensitive by nature. Participants are Vietnamese engineers and Japanese client team members whose message content crosses cultural and language boundaries. The pilot is voluntary, and participant trust is the foundation the research depends on.

Three constraints shape the privacy decision:

1. **Research ethics** — Shizenkan University requires that action research meets informed-consent and data-minimisation standards. The privacy architecture must satisfy the academic ethics review.
2. **Organisational trust** — Vnext participants must believe their messages are not being read, stored, or used beyond the stated purpose. Any architecture that feels like surveillance will kill participation.
3. **Technical feasibility** — The pilot runs on existing Vnext infrastructure. The architecture must be deployable without bespoke hardware or a dedicated on-premise data centre.

The core question: **where does sensitive message processing happen, and what — if anything — leaves the user's device?**

---

## Decision

Adopt a **privacy-by-layers** architecture with on-device PII redaction as the first and non-negotiable step before any payload is transmitted.

The architecture operates as follows:

### Layer 1 — Device (on-device, before any transmission)
- The Slack plugin intercepts the message locally
- A lightweight PII redactor runs on-device, stripping names, email addresses, and identifiers before any data leaves the device
- The redacted payload is encrypted using TLS before transmission
- If redaction fails, the message is delivered unmodified and no annotation is generated

### Layer 2 — Workspace boundary (Vnext-tenant infrastructure)
- All processing occurs within Vnext's tenant boundary on AWS Tokyo region
- Per-tenant encryption keys are managed via AWS KMS; no key is shared across tenants
- The anonymised payload is passed to the AI Core pipeline
- Raw message content is never written to any persistent store

### Layer 3 — AI/Model boundary
- The LLM receives only the anonymised, redacted payload
- No customer message data is used to fine-tune external models
- Fine-tuning of the cultural annotation model uses only the anonymised case library, with explicit participant consent

### Layer 4 — Audit and retention
- Every pipeline call produces an audit log entry: timestamp, action, tenant ID (not user ID), data classification, retention expiry
- Audit logs are encrypted at rest, retention-bounded to 12 months post-pilot, and exportable by the privacy lead
- Case library entries are anonymised and cannot be reverse-mapped to individuals

---

## Alternatives Considered

### Option A — Full on-device processing (rejected)
Run the entire AI pipeline on-device, sending nothing to a server.

**Why rejected:** Not feasible at pilot scale. LLM inference on-device requires hardware the Vnext team does not have. Latency would exceed acceptable bounds. Fine-tuning and the feedback learner require a shared case library that cannot live solely on individual devices.

### Option B — Cloud-first, post-hoc anonymisation (rejected)
Send raw message content to the server, anonymise before storing.

**Why rejected:** Violates the principle of minimising data at the point of collection. Even if anonymisation is performed immediately on arrival, raw content transits the network and briefly exists on server infrastructure — unacceptable given research ethics requirements and the opt-in trust model.

### Option C — On-device PII redaction before transmission (chosen)
Redact on-device; send only anonymised payload; all processing within tenant boundary.

**Why chosen:** Satisfies research ethics (no identifiable data leaves the device), satisfies organisational trust (participants can be told "your message content never leaves your device unredacted"), feasible on Vnext's existing AWS infrastructure.

---

## Consequences

**Positive:**
- Research ethics review is straightforward — data minimisation at source is the strongest available position
- Participant trust is earned at the architecture level, not just through policy statements
- Tenant isolation means a security incident in one organisation cannot expose another

**Negative / risks:**
- On-device PII redaction adds ~30ms latency and requires the plugin to include a redaction model
- The redaction model must be maintained and updated as new PII patterns emerge (e.g., new name formats)
- If the on-device redaction step fails silently, identifiable data could transit the network — requires a hard-fail default (message delivered unmodified, no annotation, failure logged)

**Open questions:**
1. AWS Tokyo region assumed to satisfy data residency requirements for Vnext.
2. Key rotation schedule for AWS KMS tenant keys to be defined during M3 build.
