# Pillar II — 命 Inochi: Stewardship of Nature

**Framework pillar:** II of V
**Linked framework spec:** [framework-five-pillars.md](framework-five-pillars.md)
**Phase:** M1–2 (commitment declared); M4 (baseline measured); M8 (first progress report)
**Status:** Active — pilot commitment declared

---

## Principle

> Treat the Earth as ancestor, not asset. Land, water, forest, and climate are borrowed from future generations.

The name *Inochi* (命) means "life" or "vital force" in Japanese — the animating energy shared by all living things. The Shinto understanding of *kami* as present in rivers, forests, and mountains underpins this pillar: the natural world is not a resource to extract but a presence to honour. The Buddhist principle of *interbeing* (緣起) extends this — harm to the river is harm to the self.

For Vnext, as a technology company operating across Vietnam and Japan, this pillar begins with the most material footprint: the energy consumed by the digital infrastructure that enables the work.

---

## Scope (Pilot Phase, M1–M8)

The pilot's Inochi scope is deliberately narrow. The full KPI targets (SBTi validation, biodiversity net-gain, AWS water standard) are **Horizon 2 commitments** that Vnext formally adopts post-pilot. During the pilot, the focus is on:

1. Measuring the carbon footprint of the Kokoro AI pilot infrastructure
2. Committing to offset that footprint during the pilot period
3. Defining the baseline for company-wide Scope 1, 2, and 3 measurement

---

## Active Practice During the Pilot

**Practice: AI Infrastructure Carbon Accountability**

The Kokoro pilot runs on cloud AI infrastructure. Every annotation, coaching response, and LLM call consumes energy. Making this visible — and committing to offset it — is the pilot's active Inochi practice.

### Footprint Estimation

| Component | Provider | Estimated monthly usage | Carbon method |
|---|---|---|---|
| LLM inference (primary) | Anthropic (Claude) | ~2M tokens/month | Provider carbon intensity × token volume |
| LLM inference (fallback) | OpenAI (GPT-4o) | ~200k tokens/month | Provider carbon intensity × token volume |
| API gateway + services | Cloud hosting (Docker) | ~$30/month compute | Cloud provider carbon tool |
| Developer devices | Mixed | 4 laptops, 8hr/day | Device TDP × hours × grid intensity |

**Reference carbon intensities:**
- Anthropic: reported net-zero operations; US East data centres, 100% renewable energy commitment
- OpenAI: Microsoft Azure infrastructure, Azure's carbon tools available
- Vietnam grid (2024): ~0.62 kg CO₂e / kWh (EVN national average)
- Japan grid (2024): ~0.44 kg CO₂e / kWh (post-Fukushima mix)

### Estimated Pilot Footprint (8 months)

| Source | Est. kg CO₂e | Notes |
|---|---|---|
| LLM API calls | ~8 kg | Based on token volume × reported intensity |
| Cloud hosting | ~12 kg | ~$240 total compute × Azure/GCP estimate |
| Developer devices (VN) | ~85 kg | 4 laptops × 160W × 8h × 245 days × 0.62 kg/kWh |
| Developer devices (JP, travel) | ~6 kg | 1 laptop × 160W × 8h × 60 days × 0.44 kg/kWh |
| Japan–Vietnam air travel | ~900 kg | 1 return flight HAN–TYO ≈ 900 kg CO₂e per person |
| **Total (no travel)** | **~111 kg CO₂e** | Infrastructure + devices only |
| **Total (with 1 research trip)** | **~1,011 kg CO₂e** | If one researcher travels |

*All figures are estimates. Actual measurement should use cloud provider carbon tools and actual token logs from the annotation-pipeline service.*

### Offset Commitment

Vnext commits to purchasing a verified carbon offset (Gold Standard or Verra VCS) covering the full pilot infrastructure footprint by M8.

Recommended offset options (Vietnam-relevant):
- **Lam Dong REDD+ project** (Vietnamese forest protection, Gold Standard)
- **Mekong Delta biogas** (community-scale, co-benefit for local families)
- **Solar cooking, Vietnam** (replaces wood fuel, direct local benefit)

Approximate cost to offset 1 tonne CO₂e via Gold Standard: USD 8–20. Full pilot offset cost: **under USD 25** (infrastructure only) or **USD 25–50** (including one research trip).

---

## KPI Baselines

| KPI | Pilot baseline | Horizon 2 target (2030) | Owner |
|---|---|---|---|
| Pilot AI infrastructure CO₂e | ~111 kg (TBC with real data) | Measured and offset annually | Project lead |
| Scope 1 emissions (Vnext VN office) | Not yet measured | Defined and reported | Vnext operations |
| Scope 2 emissions (office electricity) | Not yet measured | 100% renewable by 2028 | Vnext operations |
| Renewable energy share (office) | Unknown | ≥80% by 2030 | Vnext operations |
| Emissions trajectory alignment | Not assessed | 1.5°C-aligned, SBTi-validated | Vnext leadership |

**Note:** KPI owners for company-wide targets must be confirmed by Vnext leadership. The project lead owns only the pilot infrastructure footprint measurement.

---

## Functional Requirements (Pilot Phase)

**FR-INO-001:** The project lead must produce a carbon footprint estimate for the Kokoro pilot infrastructure using actual token logs and cloud billing data by M8.

**FR-INO-002:** Vnext must confirm in writing that at least one Inochi KPI has a named owner and a defined measurement method by M4.

**FR-INO-003:** The pilot must purchase a verified offset covering the AI infrastructure footprint before the endline review (M8).

**FR-INO-004:** The Inochi commitment statement must appear in the board pitch deck and the public playbook.

---

## Connection to the Sustainability Paper

The Inochi pillar grounds the academic argument in *Laudato Si'* (integral ecology) and Shinto reverence for nature. The paper argues that an organisation that learns the sacred geography of the places it operates — rivers, forests, agricultural land in Vietnam; sacred mountains and forests in Japan — will naturally act as a trustee rather than an extractor.

For Vnext specifically: Vietnam's Mekong Delta and northern highlands, and Japan's satoyama landscape, are both culturally and ecologically significant. An organisation with genuine *kokoro* for these places does not need a regulation to tell it to protect them.

**Paper reference:** See [framework-sustainability-paper.md](framework-sustainability-paper.md) § "The Inochi argument" (to be drafted).

---

## What This Pillar Does NOT Require (Pilot Phase)

- SBTi certification (requires company-wide emissions data — Horizon 2)
- Biodiversity net-gain audit (requires physical site assessment — Horizon 3)
- Water stewardship certification (AWS standard — Horizon 2)
- FPIC process (no indigenous-adjacent operations in current pilot scope)
- Formal GRI or IFRS S2 reporting (Horizon 2)

---

## Acceptance Criteria (M8 endline)

- [ ] Carbon footprint estimate for the pilot infrastructure exists and is based on real data
- [ ] At least one verified offset has been purchased covering the pilot footprint
- [ ] A named owner exists for each company-wide Inochi KPI
- [ ] Inochi commitment statement appears in the board pitch deck
- [ ] The Inochi section of the public playbook is drafted

---

## Phase Map

| Deliverable | Phase |
|---|---|
| Inochi commitment declared; scope defined | M1–2 ✓ |
| Token logs and cloud billing data collected | M4 |
| Carbon footprint estimate produced | M6 |
| Offset purchased | M7 |
| Inochi section of playbook drafted | M7–8 |
| Inochi commitment in board pitch deck | M8 |
