# ADR-002 — LLM Provider Strategy

**Status:** Accepted
**Date:** 2026-05-18
**Author:** MrX (Project Lead)

---

## Context

The Kokoro engine requires a large language model to perform two distinct tasks:

1. **Cultural annotation** — detect register (formal / neutral / informal), extract intent, generate inline annotations and suggestion chips for VN ↔ JP message pairs
2. **Coaching content** — generate the rationale text shown in the coaching panel, explaining the cultural reasoning behind an annotation

These tasks require a model that:
- Understands Vietnamese and Japanese at a high level of nuance, including honorific systems and register distinctions
- Can be guided by a structured cultural context prompt (the cultural pair database)
- Operates within the latency budget: annotation pipeline P50 target is 1.0 second; the LLM call is allocated ~600ms of that
- Is available as a commercial API (no self-hosted inference at pilot scale)
- Does not use customer data for training by default

The question: **which LLM provider(s) do we use, and how do we handle failover?**

---

## Decision

Adopt a **multi-model strategy with a primary provider and automatic failover**, orchestrated through a single LLM gateway layer.

### Primary provider: Claude (Anthropic)
Use Claude as the default model for all annotation and coaching tasks.

**Rationale:**
- Strong performance on nuanced, cross-lingual tasks requiring cultural sensitivity
- System prompt and tool use patterns align well with the structured annotation pipeline
- API terms explicitly prohibit using customer data for model training by default — consistent with FR-PRI-013
- Low-latency API with streaming support, compatible with the ~600ms allocation

### Failover providers: GPT (OpenAI) → Gemini (Google)
If the Claude API returns an error or exceeds the latency threshold, the LLM gateway automatically retries with GPT, then Gemini.

**Failover trigger conditions:**
- API timeout exceeding 800ms
- HTTP 5xx error from primary provider
- Rate limit exceeded (429) with no available retry window

**Failover behaviour:**
- The same anonymised, redacted prompt is sent to the failover provider
- The annotation is generated and returned; the response is labelled internally with the provider used (for telemetry only — not shown to the user)
- If all providers fail, the message is delivered unmodified and the failure is logged

### Cultural fine-tuning: LoRA adapters on primary model
For the cultural pair DB and case library, use LoRA (Low-Rank Adaptation) fine-tuning on top of the primary model to improve accuracy on VN ↔ JP register matching.

Fine-tuning uses only:
- The curated cultural pair database (built by the cultural advisor, no participant data)
- Anonymised case library entries (participant-consented, per FR-PRI-013)

Fine-tuning does **not** use raw message content from pilot participants.

### LLM Gateway
All provider calls route through a single internal gateway component that handles:
- Provider selection and failover logic
- Cost tracking per request
- Prompt versioning (so model updates don't silently change annotation behaviour)
- Telemetry (provider used, latency, success/failure — no message content)

---

## Alternatives Considered

### Option A — Single provider, no failover (rejected)
Use only Claude; if it fails, annotation is suppressed.

**Why rejected:** A single point of failure in the annotation pipeline creates a poor pilot experience. If the primary provider has an outage during active pilot use, all participants lose annotations simultaneously. Failover adds resilience with minimal added complexity given the LLM gateway abstraction.

### Option B — Self-hosted open-source model (rejected)
Run an open-source model (e.g., LLaMA, Mistral) on Vnext infrastructure.

**Why rejected:** At pilot scale (40–80 users), the infrastructure cost and operational overhead of running GPU inference on-premise is not justified. Model quality for nuanced VN ↔ JP cultural annotation from open-source models is unproven. This may be revisited post-pilot if commercialisation requires cost reduction.

### Option C — Single commercial provider, no fine-tuning (rejected)
Use Claude with only prompt engineering; no fine-tuning.

**Why rejected:** Prompt engineering alone is likely insufficient for accurate register detection and intent extraction in VN ↔ JP pairs, especially for domain-specific phrasing in software delivery contexts. The cultural pair database and case library represent significant knowledge that should be embedded in the model, not re-injected at inference time on every call.

---

## Consequences

**Positive:**
- Failover ensures the pilot is resilient to provider outages
- Single LLM gateway abstracts provider details from the rest of the pipeline — switching or adding providers requires no changes to the orchestrator
- LoRA fine-tuning on cultural pair data improves annotation quality without using participant message content
- Cost tracking at the gateway level gives the project lead visibility into per-request inference costs

**Negative / risks:**
- Failover providers (GPT, Gemini) may produce annotations with different quality or tone than the primary model — requires monitoring and quality review
- LoRA fine-tuning requires the cultural advisor to curate and validate the cultural pair database before M3 build; this is a dependency on advisor availability
- Multi-provider usage increases API cost management complexity

**Open questions:**
1. Monthly inference budget for the pilot to be estimated once usage patterns are clearer in M3.
2. API keys to be stored in AWS Secrets Manager — not in code.
