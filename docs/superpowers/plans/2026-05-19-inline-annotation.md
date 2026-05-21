# Inline Annotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the end-to-end inline annotation flow: Slack message event → cross-cultural profile check → annotation-pipeline (6 stages + LLM call) → Block Kit ephemeral posted to each opted-in cross-cultural recipient.

**Architecture:** Thin slack-app (receive → check → call → render → post). Profile and channel membership cached in-memory with 5-min TTL. annotation-pipeline owns all 6 processing stages and calls llm-gateway for LLM inference. HTTP call from slack-app with 1.4s timeout — silent drop on any error; the original Slack message is always delivered unmodified.

**Tech Stack:** Slack Bolt SDK 3 (Socket Mode), Node.js 20 / TypeScript 5, FastAPI / Python 3.11, httpx (async HTTP in pipeline), respx (httpx mock in tests), pytest-asyncio, jest / ts-jest

---

## Codebase Context

Key files already in place (read before implementing each task):

- `code/src/services/annotation-pipeline/app/routers/annotation.py` — existing `POST /annotate/` endpoint (uses old schema; we update it)
- `code/src/services/annotation-pipeline/app/schemas/annotation.py` — `AnnotationRequest`/`AnnotationResponse` (we replace with types from `python_shared`)
- `code/src/services/annotation-pipeline/app/pipeline/anonymiser.py` — `anonymise(text) → str` (no changes needed)
- `code/src/services/annotation-pipeline/app/pipeline/register_detector.py` — `detect_register(text, source_lang) → Register` (no changes needed)
- `code/src/services/annotation-pipeline/app/pipeline/intent_extractor.py` — stub returning hardcoded strings (we replace with real LLM call)
- `code/src/services/annotation-pipeline/app/pipeline/annotator.py` — `build_annotation(text, source_lang, target_lang) → AnnotationResult` (we update signature)
- `code/src/services/python_shared/types.py` — Pydantic domain types (we add/update fields)
- `code/src/services/slack-app/src/handlers/message.ts` — stub `handleIncomingMessage` (we implement fully)
- `code/src/services/slack-app/src/index.ts` — Bolt app setup (we update to inject caches)
- `code/tests/unit/services/annotation-pipeline/test_pipeline.py` — 2 existing tests; do not break them

Run Python tests with:
```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services python -m pytest tests/unit/services/annotation-pipeline/ -v
```

Run TypeScript tests with:
```bash
cd code && npx jest --testPathPattern="tests/unit/services/slack-app" --no-coverage
```

---

## File Map

### New files
| Path | Responsibility |
|---|---|
| `code/src/services/slack-app/src/cache/profile-cache.ts` | In-memory `CachedProfile` cache with 5-min TTL; fetches from api-gateway on miss |
| `code/src/services/slack-app/src/cache/channel-cache.ts` | In-memory channel members cache with 5-min TTL; calls `conversations.members` on miss |
| `code/src/services/slack-app/src/clients/annotation-pipeline-client.ts` | `POST /annotate` HTTP client with 1.4s timeout; maps snake_case ↔ camelCase |
| `code/src/services/slack-app/src/renderers/annotation-block.ts` | `AnnotationResult` → Block Kit JSON; three fluency-state templates (full / condensed / badge) |
| `tests/unit/services/slack-app/profile-cache.test.ts` | Unit: cache hit/miss/error |
| `tests/unit/services/slack-app/channel-cache.test.ts` | Unit: cache hit/miss |
| `tests/unit/services/slack-app/annotation-pipeline-client.test.ts` | Unit: success, timeout, HTTP error |
| `tests/unit/services/slack-app/annotation-block.test.ts` | Unit: three fluency-state outputs |
| `tests/unit/services/slack-app/message-handler.test.ts` | Unit: full handler logic — ephemeral count, cross-cultural filter, dropped annotation |
| `tests/unit/services/annotation-pipeline/test_intent_extractor.py` | Unit: LLM response mapping, HTTP error |
| `tests/unit/services/annotation-pipeline/test_annotate_router.py` | Unit: POST /annotate contract, pipeline orchestration |
| `tests/e2e/annotation-golden-path.test.ts` | E2E: handler called with mocked pipeline → 2 ephemerals posted, 0 for same-culture |

### Modified files
| Path | Change |
|---|---|
| `code/src/services/python_shared/types.py` | Add `IntentResult`, `AnnotateRequest`; update `AnnotationResult` (add `message_id`, rename `annotation_text` → `micro_text`) |
| `code/src/services/annotation-pipeline/app/pipeline/intent_extractor.py` | Replace stub with real async httpx call to llm-gateway; return `IntentResult` |
| `code/src/services/annotation-pipeline/app/pipeline/annotator.py` | Update `build_annotation` signature to `(message_id, register, intent_result) → AnnotationResult` |
| `code/src/services/annotation-pipeline/app/routers/annotation.py` | Update to use new `AnnotateRequest` / `AnnotationResult` types; add LLM call |
| `code/src/services/annotation-pipeline/requirements.txt` | Add `respx==0.21.1`, `pytest-asyncio==0.23.6` |
| `code/src/services/slack-app/src/handlers/message.ts` | Full handler: profile lookup → filter → call pipeline → render → post ephemeral |
| `code/src/services/slack-app/src/index.ts` | Instantiate `ProfileCache` + `ChannelCache`; pass `client` to handler |
| `code/.env.example` | Add `API_GATEWAY_URL=http://localhost:3001` |

---

## Task 1: Update python_shared types

**Files:**
- Modify: `code/src/services/python_shared/types.py`
- Modify: `code/src/services/annotation-pipeline/app/pipeline/annotator.py`

- [ ] **Step 1: Write the failing test**

```python
# Create: tests/unit/services/annotation-pipeline/test_types.py
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))

from python_shared.types import AnnotateRequest, AnnotationResult, IntentResult, Register, Language, SuggestionChip

def test_annotate_request_validates():
    req = AnnotateRequest(
        message_id="123.456",
        channel_id="C001",
        sender_id="U001",
        sender_culture=Language.vi,
        text="Please review by end of week.",
    )
    assert req.sender_culture == Language.vi

def test_annotation_result_has_micro_text_and_message_id():
    result = AnnotationResult(
        message_id="123.456",
        register=Register.neutral,
        intent_label="Firm deadline request",
        micro_text="Cultural context here.",
        coaching_rationale="Rationale here.",
    )
    assert result.micro_text == "Cultural context here."
    assert result.message_id == "123.456"

def test_intent_result_validates():
    intent = IntentResult(
        intent_label="Firm deadline request",
        risk_category="time_commitment_ambiguity",
        micro_text="End of week is often read as soft.",
        suggestions=[SuggestionChip(label="Reply formally", register=Register.formal, text="承知いたしました。")],
        coaching_rationale="Vietnamese directness can read as ambiguous.",
    )
    assert intent.intent_label == "Firm deadline request"
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services python -m pytest tests/unit/services/annotation-pipeline/test_types.py -v
```

Expected: `ImportError: cannot import name 'AnnotateRequest' from 'python_shared.types'`

- [ ] **Step 3: Update python_shared/types.py**

```python
# code/src/services/python_shared/types.py
from enum import Enum
from typing import Optional
from pydantic import BaseModel


class Language(str, Enum):
    vi = "vi"
    ja = "ja"


class Register(str, Enum):
    formal = "formal"
    neutral = "neutral"
    informal = "informal"


class SuggestionChip(BaseModel):
    label: str
    register: Register
    text: str


class IntentResult(BaseModel):
    intent_label: str
    risk_category: Optional[str] = None
    micro_text: str
    suggestions: list[SuggestionChip] = []
    coaching_rationale: str


class AnnotateRequest(BaseModel):
    message_id: str
    channel_id: str
    sender_id: str
    sender_culture: Language
    text: str


class AnnotationResult(BaseModel):
    message_id: str
    register: Register
    intent_label: str
    risk_category: Optional[str] = None
    micro_text: str
    coaching_rationale: str
    suggestions: list[SuggestionChip] = []


class AnnotationRequest(BaseModel):
    message_id: str
    tenant_id: str
    source_language: Language
    target_language: Language
    redacted_text: str


class LLMRequest(BaseModel):
    prompt: str
    system_prompt: str
    max_tokens: int = 512
    temperature: float = 0.3


class LLMResponse(BaseModel):
    text: str
    provider: str
    latency_ms: int
```

Note: `AnnotationRequest` (old schema) is kept unchanged to avoid breaking the `app/schemas/annotation.py` import — we will stop importing it in Task 3.

- [ ] **Step 4: Update annotator.py to use new signature**

```python
# code/src/services/annotation-pipeline/app/pipeline/annotator.py
from python_shared.types import AnnotationResult, Register, IntentResult


def build_annotation(
    message_id: str,
    register: Register,
    intent_result: IntentResult,
) -> AnnotationResult:
    return AnnotationResult(
        message_id=message_id,
        register=register,
        intent_label=intent_result.intent_label,
        risk_category=intent_result.risk_category,
        micro_text=intent_result.micro_text,
        suggestions=intent_result.suggestions,
        coaching_rationale=intent_result.coaching_rationale,
    )
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services python -m pytest tests/unit/services/annotation-pipeline/test_types.py tests/unit/services/annotation-pipeline/test_pipeline.py -v
```

Expected: 4 tests PASS (2 new + 2 existing pipeline tests)

- [ ] **Step 6: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/python_shared/types.py \
  src/services/annotation-pipeline/app/pipeline/annotator.py \
  tests/unit/services/annotation-pipeline/test_types.py
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: add AnnotateRequest, IntentResult; update AnnotationResult fields"
```

---

## Task 2: LLM-powered intent extractor

**Files:**
- Modify: `code/src/services/annotation-pipeline/app/pipeline/intent_extractor.py`
- Modify: `code/src/services/annotation-pipeline/requirements.txt`
- Create: `tests/unit/services/annotation-pipeline/test_intent_extractor.py`

- [ ] **Step 1: Add test dependencies**

```
# Append to code/src/services/annotation-pipeline/requirements.txt
respx==0.21.1
pytest-asyncio==0.23.6
```

- [ ] **Step 2: Write the failing test**

```python
# Create: tests/unit/services/annotation-pipeline/test_intent_extractor.py
import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/annotation-pipeline'))

import httpx
import pytest
import respx

from app.pipeline.intent_extractor import extract_intent, LLM_GATEWAY_URL
from python_shared.types import Register

MOCK_LLM_PAYLOAD = json.dumps({
    "intent_label": "Firm deadline request",
    "risk_category": "time_commitment_ambiguity",
    "micro_text": '"End of week" is often read as a soft suggestion in Japanese context.',
    "suggestions": [
        {"label": "Reply formally", "register": "formal", "text": "承知いたしました。"},
        {"label": "Reply neutrally", "register": "neutral", "text": "わかりました。"},
    ],
    "coaching_rationale": "Vietnamese directness around timelines can read as ambiguous to Japanese colleagues.",
})


@pytest.mark.asyncio
@respx.mock
async def test_extract_intent_maps_llm_response():
    respx.post(f"{LLM_GATEWAY_URL}/complete").mock(
        return_value=httpx.Response(
            200,
            json={"text": MOCK_LLM_PAYLOAD, "provider": "claude", "latency_ms": 450},
        )
    )
    result = await extract_intent(
        "Please review and let me know by end of week.",
        Register.neutral,
        "vi",
        "ja",
    )
    assert result.intent_label == "Firm deadline request"
    assert result.risk_category == "time_commitment_ambiguity"
    assert "End of week" in result.micro_text
    assert len(result.suggestions) == 2
    assert result.suggestions[0].register == Register.formal


@pytest.mark.asyncio
@respx.mock
async def test_extract_intent_raises_on_llm_error():
    respx.post(f"{LLM_GATEWAY_URL}/complete").mock(
        return_value=httpx.Response(503)
    )
    with pytest.raises(Exception):
        await extract_intent("test message", Register.neutral, "vi", "ja")
```

- [ ] **Step 3: Run to verify it fails**

```bash
cd code && pip install -r src/services/annotation-pipeline/requirements.txt -q && \
  PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/test_intent_extractor.py -v
```

Expected: `ImportError: cannot import name 'LLM_GATEWAY_URL' from 'app.pipeline.intent_extractor'`

- [ ] **Step 4: Replace intent_extractor.py**

```python
# code/src/services/annotation-pipeline/app/pipeline/intent_extractor.py
import json
import os
from typing import Optional

import httpx

from python_shared.types import IntentResult, Register, SuggestionChip

LLM_GATEWAY_URL = os.environ.get("LLM_GATEWAY_URL", "http://llm-gateway:8001")

_SYSTEM_PROMPT = (
    "You are a cultural translation assistant specialising in Vietnamese-Japanese "
    "workplace communication. Respond only with valid JSON — no markdown, no explanation."
)


def _build_prompt(text: str, register: Register, source_lang: str, target_lang: str) -> str:
    return (
        f'Analyse this message from a {source_lang} speaker (register: {register.value}):\n'
        f'"{text}"\n\n'
        "Return a JSON object with exactly these fields:\n"
        '- intent_label: one short phrase (e.g. "Firm deadline request")\n'
        '- risk_category: one of ["time_commitment_ambiguity","face_risk",'
        '"missing_acknowledgement","implicit_assumption","register_mismatch"] or null\n'
        f'- micro_text: 1-3 sentences max 40 words explaining cultural context for a {target_lang} reader\n'
        f'- suggestions: array of 2 objects, each with label (str), register '
        f'("formal"|"neutral"|"informal"), text (reply in {target_lang})\n'
        "- coaching_rationale: 1-2 sentences on why this phrase pattern matters culturally\n"
    )


def _parse_response(raw: str) -> IntentResult:
    data = json.loads(raw)
    return IntentResult(
        intent_label=data["intent_label"],
        risk_category=data.get("risk_category"),
        micro_text=data["micro_text"],
        suggestions=[
            SuggestionChip(
                label=s["label"],
                register=Register(s["register"]),
                text=s["text"],
            )
            for s in data.get("suggestions", [])
        ],
        coaching_rationale=data["coaching_rationale"],
    )


async def extract_intent(
    text: str,
    register: Register,
    source_lang: str,
    target_lang: str,
) -> IntentResult:
    prompt = _build_prompt(text, register, source_lang, target_lang)
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{LLM_GATEWAY_URL}/complete",
            json={
                "prompt": prompt,
                "system_prompt": _SYSTEM_PROMPT,
                "max_tokens": 512,
                "temperature": 0.3,
            },
            timeout=1.0,
        )
    response.raise_for_status()
    return _parse_response(response.json()["text"])
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/test_intent_extractor.py -v
```

Expected: 2 tests PASS

- [ ] **Step 6: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/annotation-pipeline/requirements.txt \
  src/services/annotation-pipeline/app/pipeline/intent_extractor.py \
  tests/unit/services/annotation-pipeline/test_intent_extractor.py
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: replace intent_extractor stub with real LLM gateway call"
```

---

## Task 3: Update POST /annotate endpoint

**Files:**
- Modify: `code/src/services/annotation-pipeline/app/routers/annotation.py`
- Create: `tests/unit/services/annotation-pipeline/test_annotate_router.py`

The existing router at `POST /annotate/` uses the old `AnnotationRequest` schema. We update it to use `AnnotateRequest` / `AnnotationResult` from `python_shared`, orchestrate all 6 stages, and call the LLM gateway.

- [ ] **Step 1: Write the failing test**

```python
# Create: tests/unit/services/annotation-pipeline/test_annotate_router.py
import json
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../../../src/services/annotation-pipeline'))

import httpx
import pytest
import respx
from httpx import AsyncClient

from app.main import app
from app.pipeline.intent_extractor import LLM_GATEWAY_URL

MOCK_LLM_PAYLOAD = json.dumps({
    "intent_label": "Firm deadline request",
    "risk_category": "time_commitment_ambiguity",
    "micro_text": "Cultural context explanation.",
    "suggestions": [
        {"label": "Reply formally", "register": "formal", "text": "承知いたしました。"},
    ],
    "coaching_rationale": "Rationale here.",
})


@pytest.mark.asyncio
@respx.mock
async def test_annotate_returns_annotation_result():
    respx.post(f"{LLM_GATEWAY_URL}/complete").mock(
        return_value=httpx.Response(
            200,
            json={"text": MOCK_LLM_PAYLOAD, "provider": "claude", "latency_ms": 300},
        )
    )
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/annotate",
            json={
                "message_id": "123.456",
                "channel_id": "C001",
                "sender_id": "U001",
                "sender_culture": "vi",
                "text": "Please review and let me know by end of week.",
            },
        )
    assert response.status_code == 200
    data = response.json()
    assert data["message_id"] == "123.456"
    assert data["register"] in ("formal", "neutral", "informal")
    assert data["intent_label"] == "Firm deadline request"
    assert data["micro_text"] == "Cultural context explanation."
    assert data["coaching_rationale"] == "Rationale here."


@pytest.mark.asyncio
@respx.mock
async def test_annotate_returns_503_when_llm_unavailable():
    respx.post(f"{LLM_GATEWAY_URL}/complete").mock(
        return_value=httpx.Response(503)
    )
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/annotate",
            json={
                "message_id": "123.456",
                "channel_id": "C001",
                "sender_id": "U001",
                "sender_culture": "vi",
                "text": "test",
            },
        )
    assert response.status_code == 503
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/test_annotate_router.py -v
```

Expected: First test FAIL — endpoint exists but returns wrong shape (old schema)

- [ ] **Step 3: Update the router**

```python
# code/src/services/annotation-pipeline/app/routers/annotation.py
from fastapi import APIRouter, HTTPException

from python_shared.types import AnnotateRequest, AnnotationResult, Language
from app.pipeline.anonymiser import anonymise
from app.pipeline.register_detector import detect_register
from app.pipeline.intent_extractor import extract_intent
from app.pipeline.annotator import build_annotation

router = APIRouter(prefix="/annotate", tags=["annotation"])


@router.post("", response_model=AnnotationResult)
async def annotate(request: AnnotateRequest) -> AnnotationResult:
    target_lang = "ja" if request.sender_culture == Language.vi else "vi"

    # Stage 2: anonymise
    clean_text = anonymise(request.text)

    # Stage 3: detect register
    register = detect_register(clean_text, request.sender_culture.value)

    # Stages 4+5: analyse + LLM call
    try:
        intent_result = await extract_intent(
            clean_text, register, request.sender_culture.value, target_lang
        )
    except Exception:
        raise HTTPException(status_code=503, detail="LLM gateway unavailable")

    # Stage 6: assemble
    return build_annotation(request.message_id, register, intent_result)
```

- [ ] **Step 4: Run all Python tests**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/ -v
```

Expected: 7 tests PASS (`test_pipeline.py` ×2 + `test_types.py` ×3 + `test_intent_extractor.py` ×2 — `test_annotate_router.py` runs separately)

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/test_annotate_router.py -v
```

Expected: 2 PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/annotation-pipeline/app/routers/annotation.py \
  tests/unit/services/annotation-pipeline/test_annotate_router.py
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: update POST /annotate to use AnnotateRequest and call LLM gateway"
```

---

## Task 4: ProfileCache

**Files:**
- Create: `code/src/services/slack-app/src/cache/profile-cache.ts`
- Create: `tests/unit/services/slack-app/profile-cache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Create: tests/unit/services/slack-app/profile-cache.test.ts
import { ProfileCache, CachedProfile } from '../../../../src/services/slack-app/src/cache/profile-cache';

const mockProfile: CachedProfile = {
  slackUserId: 'U001',
  language: 'vi',
  fluencyScore: 10,
  optedIn: true,
};

global.fetch = jest.fn();

describe('ProfileCache', () => {
  let cache: ProfileCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new ProfileCache('http://api-gateway:3001');
  });

  it('calls api-gateway on cache miss and returns profile', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockProfile],
    });
    const result = await cache.get('U001');
    expect(fetch).toHaveBeenCalledWith(
      'http://api-gateway:3001/users/profiles?slackIds=U001'
    );
    expect(result).toEqual(mockProfile);
  });

  it('returns cached profile on second call without fetching again', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockProfile],
    });
    await cache.get('U001');
    jest.clearAllMocks();

    const result = await cache.get('U001');
    expect(fetch).not.toHaveBeenCalled();
    expect(result).toEqual(mockProfile);
  });

  it('returns null when api-gateway is unreachable', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await cache.get('U001');
    expect(result).toBeNull();
  });

  it('getMany returns map of profiles, calls api-gateway only for misses', async () => {
    // Prime cache with U001
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [mockProfile],
    });
    await cache.get('U001');
    jest.clearAllMocks();

    const jpProfile: CachedProfile = { slackUserId: 'U002', language: 'ja', fluencyScore: 20, optedIn: true };
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [jpProfile],
    });

    const result = await cache.getMany(['U001', 'U002']);
    expect(fetch).toHaveBeenCalledTimes(1); // only U002 was a miss
    expect(result.get('U001')).toEqual(mockProfile);
    expect(result.get('U002')).toEqual(jpProfile);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="profile-cache" --no-coverage 2>&1 | tail -20
```

Expected: `Cannot find module '../../../../src/services/slack-app/src/cache/profile-cache'`

- [ ] **Step 3: Implement ProfileCache**

```typescript
// Create: code/src/services/slack-app/src/cache/profile-cache.ts

export interface CachedProfile {
  slackUserId: string;
  language: 'vi' | 'ja';
  fluencyScore: number;
  optedIn: boolean;
}

const TTL_MS = 5 * 60 * 1000;

interface Entry {
  profile: CachedProfile;
  expiresAt: number;
}

export class ProfileCache {
  private cache = new Map<string, Entry>();

  constructor(private apiGatewayUrl: string) {}

  async get(slackUserId: string): Promise<CachedProfile | null> {
    const entry = this.cache.get(slackUserId);
    if (entry && Date.now() < entry.expiresAt) return entry.profile;
    try {
      const profiles = await this.fetchMany([slackUserId]);
      if (profiles.length === 0) return null;
      this.set(profiles[0]);
      return profiles[0];
    } catch {
      return null;
    }
  }

  async getMany(slackUserIds: string[]): Promise<Map<string, CachedProfile>> {
    const result = new Map<string, CachedProfile>();
    const misses: string[] = [];

    for (const id of slackUserIds) {
      const entry = this.cache.get(id);
      if (entry && Date.now() < entry.expiresAt) {
        result.set(id, entry.profile);
      } else {
        misses.push(id);
      }
    }

    if (misses.length > 0) {
      try {
        const fetched = await this.fetchMany(misses);
        for (const profile of fetched) {
          this.set(profile);
          result.set(profile.slackUserId, profile);
        }
      } catch {
        // api-gateway unreachable — return what we have
      }
    }

    return result;
  }

  private set(profile: CachedProfile): void {
    this.cache.set(profile.slackUserId, {
      profile,
      expiresAt: Date.now() + TTL_MS,
    });
  }

  private async fetchMany(slackUserIds: string[]): Promise<CachedProfile[]> {
    const url = `${this.apiGatewayUrl}/users/profiles?slackIds=${slackUserIds.join(',')}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`api-gateway responded ${response.status}`);
    return response.json() as Promise<CachedProfile[]>;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd code && npx jest --testPathPattern="profile-cache" --no-coverage
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/slack-app/src/cache/profile-cache.ts \
  tests/unit/services/slack-app/profile-cache.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: add ProfileCache with 5-min TTL and api-gateway fetch"
```

---

## Task 5: ChannelCache

**Files:**
- Create: `code/src/services/slack-app/src/cache/channel-cache.ts`
- Create: `tests/unit/services/slack-app/channel-cache.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Create: tests/unit/services/slack-app/channel-cache.test.ts
import { ChannelCache } from '../../../../src/services/slack-app/src/cache/channel-cache';
import type { WebClient } from '@slack/web-api';

const mockClient = {
  conversations: {
    members: jest.fn(),
  },
} as unknown as WebClient;

describe('ChannelCache', () => {
  let cache: ChannelCache;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new ChannelCache(mockClient);
  });

  it('calls conversations.members on cache miss', async () => {
    (mockClient.conversations.members as jest.Mock).mockResolvedValueOnce({
      members: ['U001', 'U002', 'U003'],
    });
    const result = await cache.getMembers('C001');
    expect(mockClient.conversations.members).toHaveBeenCalledWith({ channel: 'C001' });
    expect(result).toEqual(['U001', 'U002', 'U003']);
  });

  it('returns cached members on second call without Slack API call', async () => {
    (mockClient.conversations.members as jest.Mock).mockResolvedValueOnce({
      members: ['U001', 'U002'],
    });
    await cache.getMembers('C001');
    jest.clearAllMocks();

    const result = await cache.getMembers('C001');
    expect(mockClient.conversations.members).not.toHaveBeenCalled();
    expect(result).toEqual(['U001', 'U002']);
  });

  it('returns empty array when conversations.members returns no members field', async () => {
    (mockClient.conversations.members as jest.Mock).mockResolvedValueOnce({});
    const result = await cache.getMembers('C001');
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="channel-cache" --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '../../../../src/services/slack-app/src/cache/channel-cache'`

- [ ] **Step 3: Implement ChannelCache**

```typescript
// Create: code/src/services/slack-app/src/cache/channel-cache.ts
import type { WebClient } from '@slack/web-api';

const TTL_MS = 5 * 60 * 1000;

interface Entry {
  memberIds: string[];
  expiresAt: number;
}

export class ChannelCache {
  private cache = new Map<string, Entry>();

  constructor(private client: WebClient) {}

  async getMembers(channelId: string): Promise<string[]> {
    const entry = this.cache.get(channelId);
    if (entry && Date.now() < entry.expiresAt) return entry.memberIds;

    const result = await this.client.conversations.members({ channel: channelId });
    const memberIds = result.members ?? [];
    this.cache.set(channelId, { memberIds, expiresAt: Date.now() + TTL_MS });
    return memberIds;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd code && npx jest --testPathPattern="channel-cache" --no-coverage
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/slack-app/src/cache/channel-cache.ts \
  tests/unit/services/slack-app/channel-cache.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: add ChannelCache with 5-min TTL and Slack conversations.members"
```

---

## Task 6: AnnotationPipelineClient

**Files:**
- Create: `code/src/services/slack-app/src/clients/annotation-pipeline-client.ts`
- Create: `tests/unit/services/slack-app/annotation-pipeline-client.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Create: tests/unit/services/slack-app/annotation-pipeline-client.test.ts
import { annotate } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';

global.fetch = jest.fn();

const mockSnakeResponse = {
  message_id: '123.456',
  register: 'neutral',
  intent_label: 'Firm deadline request',
  risk_category: 'time_commitment_ambiguity',
  micro_text: '"End of week" can read as soft in Japanese context.',
  suggestions: [{ label: 'Reply formally', register: 'formal', text: '承知いたしました。' }],
  coaching_rationale: 'Vietnamese directness can read as ambiguous.',
};

const baseRequest = {
  messageId: '123.456',
  channelId: 'C001',
  senderId: 'U001',
  senderCulture: 'vi' as const,
  text: 'Please review by end of week.',
};

describe('annotate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('maps snake_case response to camelCase AnnotationResult', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnakeResponse,
    });
    const result = await annotate('http://annotation-pipeline:8000', baseRequest);
    expect(result?.intentLabel).toBe('Firm deadline request');
    expect(result?.microText).toBe('"End of week" can read as soft in Japanese context.');
    expect(result?.register).toBe('neutral');
    expect(result?.messageId).toBe('123.456');
  });

  it('sends snake_case body to pipeline', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockSnakeResponse });
    await annotate('http://annotation-pipeline:8000', baseRequest);
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.message_id).toBe('123.456');
    expect(body.sender_culture).toBe('vi');
    expect(body.channel_id).toBe('C001');
  });

  it('returns null on HTTP 503', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await annotate('http://annotation-pipeline:8000', baseRequest);
    expect(result).toBeNull();
  });

  it('returns null on fetch error (timeout/abort)', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const result = await annotate('http://annotation-pipeline:8000', baseRequest);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="annotation-pipeline-client" --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '../../../../src/services/slack-app/src/clients/annotation-pipeline-client'`

- [ ] **Step 3: Implement the client**

```typescript
// Create: code/src/services/slack-app/src/clients/annotation-pipeline-client.ts

export interface SuggestionChip {
  label: string;
  register: 'formal' | 'neutral' | 'informal';
  text: string;
}

export interface AnnotationResult {
  messageId: string;
  register: 'formal' | 'neutral' | 'informal';
  intentLabel: string;
  riskCategory?: string;
  microText: string;
  coachingRationale: string;
  suggestions: SuggestionChip[];
}

export interface AnnotateRequest {
  messageId: string;
  channelId: string;
  senderId: string;
  senderCulture: 'vi' | 'ja';
  text: string;
}

const TIMEOUT_MS = 1400;

export async function annotate(
  pipelineUrl: string,
  request: AnnotateRequest
): Promise<AnnotationResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${pipelineUrl}/annotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: request.messageId,
        channel_id: request.channelId,
        sender_id: request.senderId,
        sender_culture: request.senderCulture,
        text: request.text,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const d = await response.json() as Record<string, unknown>;
    return {
      messageId: d.message_id as string,
      register: d.register as AnnotationResult['register'],
      intentLabel: d.intent_label as string,
      riskCategory: d.risk_category as string | undefined,
      microText: d.micro_text as string,
      coachingRationale: d.coaching_rationale as string,
      suggestions: d.suggestions as SuggestionChip[],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd code && npx jest --testPathPattern="annotation-pipeline-client" --no-coverage
```

Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/slack-app/src/clients/annotation-pipeline-client.ts \
  tests/unit/services/slack-app/annotation-pipeline-client.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: add annotation-pipeline HTTP client with 1.4s timeout"
```

---

## Task 7: Block Kit renderer

**Files:**
- Create: `code/src/services/slack-app/src/renderers/annotation-block.ts`
- Create: `tests/unit/services/slack-app/annotation-block.test.ts`

**Background:** Block Kit is Slack's JSON-based UI framework. An ephemeral message is a message visible only to one user. We build an array of `KnownBlock` objects from `@slack/bolt`. Three fluency states: **full** (score ≤ 30, show everything), **condensed** (score 31–69, badge + intent + "Expand"), **badge-only** (score ≥ 70, badge + "Show more"). These thresholds are configurable — read from env vars `FLUENCY_FULL_MAX` and `FLUENCY_CONDENSED_MAX`, defaulting to 30 and 70.

- [ ] **Step 1: Write the failing test**

```typescript
// Create: tests/unit/services/slack-app/annotation-block.test.ts
import { renderAnnotationBlock } from '../../../../src/services/slack-app/src/renderers/annotation-block';
import type { AnnotationResult } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';

const mockResult: AnnotationResult = {
  messageId: '123.456',
  register: 'neutral',
  intentLabel: 'Firm deadline request',
  riskCategory: 'time_commitment_ambiguity',
  microText: '"End of week" is often read as soft in Japanese context.',
  coachingRationale: 'Vietnamese directness can read as ambiguous.',
  suggestions: [
    { label: 'Reply formally', register: 'formal', text: '承知いたしました。' },
    { label: 'Reply neutrally', register: 'neutral', text: 'わかりました。' },
  ],
};

describe('renderAnnotationBlock', () => {
  it('full state (score 15): returns 4 blocks including actions for suggestion chips', () => {
    const blocks = renderAnnotationBlock(mockResult, 15);
    expect(blocks).toHaveLength(4);
    expect(blocks[0].type).toBe('section');
    const header = (blocks[0] as any).text.text as string;
    expect(header).toContain('NEUTRAL');
    expect(header).toContain('Firm deadline request');
    expect(blocks[1].type).toBe('section');
    expect((blocks[1] as any).text.text).toContain('End of week');
    expect(blocks[2].type).toBe('actions');
    expect((blocks[2] as any).elements).toHaveLength(2);
    expect(blocks[3].type).toBe('context');
  });

  it('condensed state (score 50): returns 1 block with Expand text, no micro-text', () => {
    const blocks = renderAnnotationBlock(mockResult, 50);
    expect(blocks).toHaveLength(1);
    const text = (blocks[0] as any).text.text as string;
    expect(text).toContain('NEUTRAL');
    expect(text).toContain('Firm deadline request');
    expect(text).toContain('Expand');
    expect(text).not.toContain('End of week');
  });

  it('badge-only state (score 75): returns 1 block with register only', () => {
    const blocks = renderAnnotationBlock(mockResult, 75);
    expect(blocks).toHaveLength(1);
    const text = (blocks[0] as any).text.text as string;
    expect(text).toContain('NEUTRAL');
    expect(text).toContain('Show more');
    expect(text).not.toContain('Firm deadline request');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="annotation-block" --no-coverage 2>&1 | tail -10
```

Expected: `Cannot find module '../../../../src/services/slack-app/src/renderers/annotation-block'`

- [ ] **Step 3: Implement the renderer**

```typescript
// Create: code/src/services/slack-app/src/renderers/annotation-block.ts
import type { KnownBlock, ActionsBlock, SectionBlock, ContextBlock } from '@slack/bolt';
import type { AnnotationResult } from '../clients/annotation-pipeline-client';

const FLUENCY_FULL_MAX = parseInt(process.env.FLUENCY_FULL_MAX ?? '30', 10);
const FLUENCY_CONDENSED_MAX = parseInt(process.env.FLUENCY_CONDENSED_MAX ?? '70', 10);

const REGISTER_EMOJI: Record<string, string> = {
  formal: '🔵',
  neutral: '⚪',
  informal: '🟡',
};

export function renderAnnotationBlock(
  result: AnnotationResult,
  fluencyScore: number
): KnownBlock[] {
  if (fluencyScore <= FLUENCY_FULL_MAX) return renderFull(result);
  if (fluencyScore < FLUENCY_CONDENSED_MAX) return renderCondensed(result);
  return renderBadgeOnly(result);
}

function renderFull(result: AnnotationResult): KnownBlock[] {
  const header: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · ${result.intentLabel}`,
    },
  };
  const micro: SectionBlock = {
    type: 'section',
    text: { type: 'mrkdwn', text: result.microText },
  };
  const chips: ActionsBlock = {
    type: 'actions',
    elements: result.suggestions.map(s => ({
      type: 'button' as const,
      text: { type: 'plain_text' as const, text: s.label, emoji: false },
      value: s.text,
      action_id: `suggestion_${s.register}`,
    })),
  };
  const learn: ContextBlock = {
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '_Learn more →_' }],
  };
  return [header, micro, chips, learn];
}

function renderCondensed(result: AnnotationResult): KnownBlock[] {
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · ${result.intentLabel} · _Expand_`,
    },
  };
  return [block];
}

function renderBadgeOnly(result: AnnotationResult): KnownBlock[] {
  const block: SectionBlock = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${REGISTER_EMOJI[result.register] ?? '⚪'} *${result.register.toUpperCase()}* · _Show more_`,
    },
  };
  return [block];
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd code && npx jest --testPathPattern="annotation-block" --no-coverage
```

Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/slack-app/src/renderers/annotation-block.ts \
  tests/unit/services/slack-app/annotation-block.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: add Block Kit renderer with three fluency-state templates"
```

---

## Task 8: Wire up the message handler

**Files:**
- Modify: `code/src/services/slack-app/src/handlers/message.ts`
- Modify: `code/src/services/slack-app/src/index.ts`
- Modify: `code/.env.example`
- Create: `tests/unit/services/slack-app/message-handler.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// Create: tests/unit/services/slack-app/message-handler.test.ts
jest.mock('../../../../src/services/slack-app/src/clients/annotation-pipeline-client');
jest.mock('../../../../src/services/slack-app/src/renderers/annotation-block');

import { handleIncomingMessage } from '../../../../src/services/slack-app/src/handlers/message';
import { annotate } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';
import { renderAnnotationBlock } from '../../../../src/services/slack-app/src/renderers/annotation-block';
import type { WebClient } from '@slack/web-api';
import type { ProfileCache } from '../../../../src/services/slack-app/src/cache/profile-cache';
import type { ChannelCache } from '../../../../src/services/slack-app/src/cache/channel-cache';

const vnProfile = { slackUserId: 'U001', language: 'vi' as const, fluencyScore: 10, optedIn: true };
const jpProfile1 = { slackUserId: 'U002', language: 'ja' as const, fluencyScore: 15, optedIn: true };
const jpProfile2 = { slackUserId: 'U003', language: 'ja' as const, fluencyScore: 50, optedIn: true };
const vnProfile2 = { slackUserId: 'U004', language: 'vi' as const, fluencyScore: 10, optedIn: true };
const notOptedIn = { slackUserId: 'U005', language: 'ja' as const, fluencyScore: 0, optedIn: false };

const mockAnnotationResult = {
  messageId: '123.456', register: 'neutral' as const, intentLabel: 'Test',
  microText: 'ctx', suggestions: [], coachingRationale: 'rationale',
};

const mockClient = {
  chat: { postEphemeral: jest.fn().mockResolvedValue({}) },
} as unknown as WebClient;

const mockProfileCache: ProfileCache = {
  get: jest.fn().mockResolvedValue(vnProfile),
  getMany: jest.fn().mockResolvedValue(new Map([
    ['U001', vnProfile], ['U002', jpProfile1], ['U003', jpProfile2],
    ['U004', vnProfile2], ['U005', notOptedIn],
  ])),
} as unknown as ProfileCache;

const mockChannelCache: ChannelCache = {
  getMembers: jest.fn().mockResolvedValue(['U001', 'U002', 'U003', 'U004', 'U005']),
} as unknown as ChannelCache;

const event = { text: 'Please review by end of week.', user: 'U001', channel: 'C001', ts: '123.456' };

describe('handleIncomingMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (annotate as jest.Mock).mockResolvedValue(mockAnnotationResult);
    (renderAnnotationBlock as jest.Mock).mockReturnValue([{ type: 'section', text: { type: 'mrkdwn', text: 'test' } }]);
    process.env.ANNOTATION_PIPELINE_URL = 'http://annotation-pipeline:8000';
  });

  it('posts ephemeral to both JP opted-in recipients (U002, U003), skips VN and non-opted-in', async () => {
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    expect(mockClient.chat.postEphemeral).toHaveBeenCalledTimes(2);
    const recipients = (mockClient.chat.postEphemeral as jest.Mock).mock.calls.map(c => c[0].user);
    expect(recipients).toContain('U002');
    expect(recipients).toContain('U003');
    expect(recipients).not.toContain('U001'); // same culture
    expect(recipients).not.toContain('U004'); // same culture
    expect(recipients).not.toContain('U005'); // not opted-in
  });

  it('uses recipient fluency score for renderer', async () => {
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    // U002 has fluencyScore 15, U003 has fluencyScore 50
    const calls = (renderAnnotationBlock as jest.Mock).mock.calls;
    const scores = calls.map((c: unknown[]) => c[1]);
    expect(scores).toContain(15);
    expect(scores).toContain(50);
  });

  it('skips entirely when sender is not opted-in', async () => {
    (mockProfileCache.get as jest.Mock).mockResolvedValueOnce({ ...vnProfile, optedIn: false });
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    expect(annotate).not.toHaveBeenCalled();
    expect(mockClient.chat.postEphemeral).not.toHaveBeenCalled();
  });

  it('skips entirely when no cross-cultural opted-in recipients', async () => {
    (mockProfileCache.getMany as jest.Mock).mockResolvedValueOnce(
      new Map([['U001', vnProfile], ['U002', { ...jpProfile1, optedIn: false }]])
    );
    (mockChannelCache.getMembers as jest.Mock).mockResolvedValueOnce(['U001', 'U002']);
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    expect(annotate).not.toHaveBeenCalled();
  });

  it('does not post when annotate returns null (timeout/error)', async () => {
    (annotate as jest.Mock).mockResolvedValueOnce(null);
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    expect(mockClient.chat.postEphemeral).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="message-handler" --no-coverage 2>&1 | tail -20
```

Expected: Tests fail — handler is a stub with no profile/pipeline logic

- [ ] **Step 3: Update message.ts**

```typescript
// code/src/services/slack-app/src/handlers/message.ts
import type { WebClient } from '@slack/web-api';
import type { ProfileCache } from '../cache/profile-cache';
import type { ChannelCache } from '../cache/channel-cache';
import { annotate } from '../clients/annotation-pipeline-client';
import { renderAnnotationBlock } from '../renderers/annotation-block';
import { logRequest } from '../middleware/logger';

export interface MessageEvent {
  text: string;
  user: string;
  channel: string;
  ts: string;
}

export async function handleIncomingMessage(
  event: MessageEvent,
  client: WebClient,
  profileCache: ProfileCache,
  channelCache: ChannelCache,
): Promise<void> {
  logRequest('message.received', { channel: event.channel, ts: event.ts });

  // Check sender is opted-in
  const senderProfile = await profileCache.get(event.user);
  if (!senderProfile?.optedIn) return;

  // Get channel members and their profiles
  const memberIds = await channelCache.getMembers(event.channel);
  const profiles = await profileCache.getMany(memberIds);

  // Filter to opted-in recipients of a different culture
  const recipients = [...profiles.entries()].filter(
    ([id, p]) => id !== event.user && p.optedIn && p.language !== senderProfile.language
  );
  if (recipients.length === 0) return;

  // Call annotation pipeline
  const pipelineUrl = process.env.ANNOTATION_PIPELINE_URL ?? 'http://annotation-pipeline:8000';
  const result = await annotate(pipelineUrl, {
    messageId: event.ts,
    channelId: event.channel,
    senderId: event.user,
    senderCulture: senderProfile.language,
    text: event.text,
  });

  if (!result) {
    logRequest('annotation.dropped', { channel: event.channel, ts: event.ts });
    return;
  }

  // Post ephemeral to each cross-cultural recipient
  for (const [recipientId, recipientProfile] of recipients) {
    const blocks = renderAnnotationBlock(result, recipientProfile.fluencyScore);
    await client.chat.postEphemeral({
      channel: event.channel,
      user: recipientId,
      text: `Cultural context: ${result.register} · ${result.intentLabel}`,
      blocks,
    });
  }
}
```

- [ ] **Step 4: Update index.ts**

```typescript
// code/src/services/slack-app/src/index.ts
import { App, LogLevel } from '@slack/bolt';
import { handleIncomingMessage } from './handlers/message';
import { ProfileCache } from './cache/profile-cache';
import { ChannelCache } from './cache/channel-cache';
import { logRequest } from './middleware/logger';

export function createApp(): App {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.ERROR,
  });

  const profileCache = new ProfileCache(
    process.env.API_GATEWAY_URL ?? 'http://api-gateway:3001'
  );
  const channelCache = new ChannelCache(app.client);

  app.message(async ({ message, client }) => {
    if (message.subtype) return;
    const ev = message as import('@slack/bolt').GenericMessageEvent;
    await handleIncomingMessage(
      { text: ev.text ?? '', user: ev.user, channel: ev.channel, ts: ev.ts },
      client,
      profileCache,
      channelCache,
    );
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  (async () => {
    await app.start();
    logRequest('slack-app.started');
  })();
}
```

- [ ] **Step 5: Add API_GATEWAY_URL to .env.example**

Append to `code/.env.example`:
```
API_GATEWAY_URL=http://localhost:3001
```

- [ ] **Step 6: Run all TypeScript unit tests**

```bash
cd code && npx jest --testPathPattern="tests/unit/services/slack-app" --no-coverage
```

Expected: All tests PASS (profile-cache ×4, channel-cache ×3, annotation-pipeline-client ×4, annotation-block ×3, message-handler ×5 = 19 tests)

- [ ] **Step 7: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  src/services/slack-app/src/handlers/message.ts \
  src/services/slack-app/src/index.ts \
  .env.example \
  tests/unit/services/slack-app/message-handler.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "feat: implement full message handler with profile cache, pipeline call, and Block Kit renderer"
```

---

## Task 9: E2E golden path test

**Files:**
- Create: `tests/e2e/annotation-golden-path.test.ts`

This test calls `handleIncomingMessage` with:
- A real `ProfileCache` (api-gateway mocked via `global.fetch`)
- A real `ChannelCache` (Slack API mocked)
- A real `AnnotationPipelineClient` (pipeline mocked via `global.fetch`)
- A mocked Slack `client.chat.postEphemeral`

It verifies the full handler chain produces the correct ephemeral posts without mocking internal modules.

- [ ] **Step 1: Write the test**

```typescript
// Create: tests/e2e/annotation-golden-path.test.ts
import { handleIncomingMessage } from '../../src/services/slack-app/src/handlers/message';
import { ProfileCache } from '../../src/services/slack-app/src/cache/profile-cache';
import { ChannelCache } from '../../src/services/slack-app/src/cache/channel-cache';
import type { WebClient } from '@slack/web-api';

global.fetch = jest.fn();

const vnProfile = { slackUserId: 'U001', language: 'vi', fluencyScore: 10, optedIn: true };
const jpProfile1 = { slackUserId: 'U002', language: 'ja', fluencyScore: 15, optedIn: true };
const jpProfile2 = { slackUserId: 'U003', language: 'ja', fluencyScore: 50, optedIn: true };
const vnProfile2 = { slackUserId: 'U004', language: 'vi', fluencyScore: 8, optedIn: true };

const mockAnnotateResponse = {
  message_id: '123.456',
  register: 'neutral',
  intent_label: 'Firm deadline request',
  risk_category: 'time_commitment_ambiguity',
  micro_text: '"End of week" is often read as soft in Japanese context.',
  suggestions: [
    { label: 'Reply formally', register: 'formal', text: '承知いたしました。' },
    { label: 'Reply neutrally', register: 'neutral', text: 'わかりました。' },
  ],
  coaching_rationale: 'Vietnamese directness around timelines can read as ambiguous.',
};

const mockSlackClient = {
  conversations: {
    members: jest.fn().mockResolvedValue({ members: ['U001', 'U002', 'U003', 'U004'] }),
  },
  chat: {
    postEphemeral: jest.fn().mockResolvedValue({}),
  },
} as unknown as WebClient;

describe('E2E: annotation golden path', () => {
  let profileCache: ProfileCache;
  let channelCache: ChannelCache;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ANNOTATION_PIPELINE_URL = 'http://annotation-pipeline:8000';
    profileCache = new ProfileCache('http://api-gateway:3001');
    channelCache = new ChannelCache(mockSlackClient);

    // 3 fetch calls in order:
    //   1. profileCache.get('U001') → GET /users/profiles?slackIds=U001
    //   2. profileCache.getMany(['U002','U003','U004']) → U001 already cached from call 1
    //   3. annotate → POST /annotate
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [vnProfile] })
      .mockResolvedValueOnce({ ok: true, json: async () => [jpProfile1, jpProfile2, vnProfile2] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockAnnotateResponse });
  });

  it('posts exactly 2 ephemerals — one to each JP opted-in recipient', async () => {
    await handleIncomingMessage(
      { text: 'Please review and let me know by end of week.', user: 'U001', channel: 'C001', ts: '123.456' },
      mockSlackClient,
      profileCache,
      channelCache,
    );

    expect(mockSlackClient.chat.postEphemeral).toHaveBeenCalledTimes(2);
    const users = (mockSlackClient.chat.postEphemeral as jest.Mock).mock.calls.map(c => c[0].user);
    expect(users).toContain('U002');
    expect(users).toContain('U003');
    expect(users).not.toContain('U001');
    expect(users).not.toContain('U004');
  });

  it('posts 0 ephemerals and does not call pipeline when annotate returns null (503)', async () => {
    jest.clearAllMocks();
    // Fresh caches so profile lookups hit the API again (no carry-over from test 1)
    profileCache = new ProfileCache('http://api-gateway:3001');
    channelCache = new ChannelCache(mockSlackClient);
    (mockSlackClient.conversations.members as jest.Mock).mockResolvedValue({
      members: ['U001', 'U002', 'U003', 'U004'],
    });
    // 3 fetch calls: sender profile, getMany for rest, POST /annotate (503)
    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => [vnProfile] })
      .mockResolvedValueOnce({ ok: true, json: async () => [jpProfile1, jpProfile2, vnProfile2] })
      .mockResolvedValueOnce({ ok: false, status: 503 });

    await handleIncomingMessage(
      { text: 'test', user: 'U001', channel: 'C001', ts: '123.457' },
      mockSlackClient,
      profileCache,
      channelCache,
    );

    expect(mockSlackClient.chat.postEphemeral).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd code && npx jest --testPathPattern="annotation-golden-path" --no-coverage 2>&1 | tail -20
```

Expected: Fail — the fetch mock for the profile lookup call will be off (first call goes to `get` for sender only, not `getMany` for all channel members yet). Adjust the mock order if needed to match the actual call sequence: `get('U001')` → profiles api, then `getMany(['U001','U002','U003','U004'])` → profiles api, then `fetch('http://annotation-pipeline:8000/annotate')`.

If the call sequence differs from the mock order, update the `beforeEach` mock chain to match. Run with `--verbose` to see which fetch calls are made:

```bash
cd code && npx jest --testPathPattern="annotation-golden-path" --no-coverage --verbose 2>&1 | grep -A5 "fetch"
```

Adjust mock chain to 3 calls if `get` + `getMany` each hit the API:
```typescript
(fetch as jest.Mock)
  .mockResolvedValueOnce({ ok: true, json: async () => [vnProfile] })         // get('U001')
  .mockResolvedValueOnce({ ok: true, json: async () => [vnProfile, jpProfile1, jpProfile2, vnProfile2] }) // getMany miss
  .mockResolvedValueOnce({ ok: true, json: async () => mockAnnotateResponse }); // POST /annotate
```

- [ ] **Step 3: Run until green**

```bash
cd code && npx jest --testPathPattern="annotation-golden-path" --no-coverage
```

Expected: 2 tests PASS

- [ ] **Step 4: Run full test suite**

```bash
cd code && PYTHONPATH=src/services/annotation-pipeline:src/services \
  python -m pytest tests/unit/services/annotation-pipeline/ -v
cd code && npx jest --no-coverage
```

Expected: All tests PASS. Python: 9+ tests. TypeScript: 21+ tests.

- [ ] **Step 5: Commit**

```bash
git -C /Users/leodo/Documents/Claude/kokoro/code add \
  tests/e2e/annotation-golden-path.test.ts
git -C /Users/leodo/Documents/Claude/kokoro/code commit -m "test: add E2E golden path for annotation flow"
```
