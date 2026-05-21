# Kokoro — MBA Demo Script

**Tâm × 心: AI Cultural Translation Engine**
Shizenkan University MBA Final Project · Vnext Japan Pilot

**Total runtime:** ~8 minutes  
**Audience:** MBA panel, Shizenkan advisors, Vnext leadership  
**Setup required:** Slack workspace open, dashboard open in browser, system running

---

## Opening (30 seconds)

> "Every day, Vietnamese engineers and Japanese clients exchange dozens of messages on Slack. The words translate correctly — but the intent often doesn't. A message that sounds direct and efficient in Vietnamese can read as cold or disrespectful in Japanese. Nobody is wrong. The cultural grammar is just different.
>
> Kokoro is a real-time AI cultural translation layer that sits inside Slack. It doesn't change what people say — it helps them understand what they mean to each other."

---

## Scene 1 — Inline Annotation (2 minutes)

**Story:** A Vietnamese engineer, Minh, sends a status update to the Japanese client channel.

**Action:** Type this message in the shared Slack channel:

```
プロジェクトは遅れています。原因はクライアント側の要件変更です。
```
*(Translation: "The project is behind. The cause is requirements changes on the client side.")*

**What happens:** Kokoro posts an ephemeral annotation visible only to Minh.

**What to show and say:**

> "Kokoro annotates the message privately — only Minh sees this. It detected a **Register mismatch**: the phrasing assigns blame to the client, which in Japanese business culture can trigger loss of face. The micro-annotation gives a one-line explanation. Below it, two suggestion chips offer culturally adapted alternatives."

**Point to each UI element:**
- `:warning: Register mismatch` — the cultural flag
- The italicised micro-text — the brief explanation
- Suggestion chips — concrete rewrites
- **"Learn more"** button — leads to the coaching panel (Scene 3)

> "Minh can press a suggestion to copy the safer phrasing, or press 'Learn more' for a full cultural coaching session."

---

## Scene 2 — Pre-Send Check (2 minutes)

**Story:** Before sending a sensitive deadline pressure message, Minh uses `/kokoro` to check it first.

**Action:** Type in any channel:

```
/kokoro 今週中に必ず終わらせてください。これ以上の遅延は認められません。
```
*(Translation: "Please make sure to finish this by end of week. No further delays will be tolerated.")*

**What happens:** Kokoro intercepts the draft before it is sent and returns a private risk assessment.

**What to say:**

> "This is the pre-send check. Minh hasn't sent the message yet — `/kokoro` lets you test a draft first. Kokoro flags this as a **Directive register with authority signal**: in Japanese workplace culture, this phrasing from a vendor toward a client reads as coercive. The panel offers rewritten suggestions that preserve the urgency without the cultural friction."

**Point to the action row:**
- Suggestion chips — safer alternatives
- **"Send original"** — lets Minh proceed anyway, fully informed
- **"Learn more"** — opens coaching modal

> "The goal is not to block the message. It's to make the cultural cost visible before it's paid."

---

## Scene 3 — Coaching Panel (2 minutes)

**Action:** Press **"Learn more"** on either annotation from Scene 1 or Scene 2.

**What happens:** A modal opens with structured cultural coaching content.

**What to say:**

> "The coaching panel goes deeper. It's structured around four layers:"

Walk through each section:

| Section | What to say |
|---|---|
| **REGISTER** | "What social register this message occupies — here, highly formal keigo with directive tone." |
| **INTENT** | "What the sender is actually trying to communicate — urgency and accountability." |
| **CULTURAL RISK** | "The specific risk for the Japanese counterpart — in this case, the phrasing triggers a loss-of-face dynamic that can cause the client to disengage rather than respond." |
| **WHY THIS MATTERS** | "Grounded in the Kokoro framework: the concept of *Ma* (間) — the relational space between people — and *Nemawashi* — the expectation of gradual consensus-building before applying pressure." |
| **SUGGESTED PHRASING** | "A fully rewritten alternative that carries the same urgency with appropriate deference markers." |

> "This is where the five-pillar framework becomes practical. Pillar I — 心 Kokoro — is cultural-religious literacy. The coaching panel is that literacy, delivered in the moment you need it."

---

## Scene 4 — Dashboard (1 minute)

**Action:** Switch to the browser with the dashboard open (`http://localhost:3000`).

**What to say:**

> "Over the 8-month pilot, every annotation, every suggestion accepted, every coaching session opened is recorded. The dashboard gives team leads a view of cultural fluency at the team level."

Point to each panel:

| Panel | What to say |
|---|---|
| **Communication health** | "Cases processed, active users, the proportion of messages with cultural flags." |
| **Suggestion adoption rate** | "How often people take the culturally safer alternative — a proxy for learning." |
| **Fluency trend** | "Team fluency score over time. It goes up when suggestions are used." |
| **Recent cases** | "Anonymised recent cases — not who said what, but what cultural patterns appeared." |

> "This data is also the research corpus for the MBA thesis — real behavioural evidence of cross-cultural adaptation, not just a survey."

---

## Closing (30 seconds)

> "Kokoro doesn't translate language. It translates intent — and it teaches the person sending the message why it matters.
>
> The five-pillar framework says: know the places you touch. Kokoro makes that possible, one message at a time.
>
> The pilot runs for eight months at Vnext Japan. The engine is live. The data collection starts now."

---

## Backup: If the system is unavailable

If Docker is not running or Slack connectivity fails:

1. Show the [design mockups](../../assets/) if available, or describe the UI verbally.
2. Open the dashboard at `http://localhost:3000` — it has seeded data from the migration and will display even if the annotation pipeline is down.
3. Use this fallback line:

> "What I want to show you is the live system — let me walk you through the design instead and we can arrange a live demonstration separately."

---

## Setup Checklist (run before the demo)

```bash
# 1. Start all services
cd code && docker compose up -d

# 2. Verify health
curl http://localhost:8001/health
curl http://localhost:8002/health

# 3. Check Slack bot is connected (look for this in logs)
docker compose logs slack-app --tail=20 | grep "started"

# 4. Open dashboard
open http://localhost:3000

# 5. Have Slack workspace open and ready on the demo channel
```

**Test messages to pre-verify (run 10 min before the presentation):**

```
# Test inline annotation
# Send in Slack: プロジェクトは遅れています。原因はクライアント側の要件変更です。

# Test pre-send check
# Type in Slack: /kokoro 今週中に必ず終わらせてください。

# Test coaching panel
# Press "Learn more" on the annotation above
```

---

## Export real cases for the paper

Run this query to pull real annotated cases for your thesis appendix:

```sql
SELECT
  case_id,
  register,
  intent_label,
  risk_category,
  micro_text,
  suggestion_used,
  created_at
FROM case_library
ORDER BY created_at DESC
LIMIT 20;
```

```bash
# Run via Docker:
docker compose exec postgres psql -U kokoro -d kokoro \
  -c "SELECT case_id, register, intent_label, risk_category, micro_text, suggestion_used, created_at FROM case_library ORDER BY created_at DESC LIMIT 20;"
```

---

*Last updated: 2026-05-20*
