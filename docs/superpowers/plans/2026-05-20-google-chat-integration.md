# Google Chat Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `google-chat-app` TypeScript/Express service that gives Google Chat users full feature parity with the Slack integration — inline annotation, `/kokoro` pre-send check, suggestion buttons, and coaching dialog.

**Architecture:** New `google-chat-app` service receives Google Chat webhook events via HTTP POST, verifies the Google-signed bearer token, dispatches to handlers that call the existing annotation pipeline REST API, and returns Card v2 JSON responses. Private (ephemeral) messages use the Chat REST API with `privateMessageViewer`. All backend services are unchanged.

**Tech Stack:** TypeScript, Express 4, `google-auth-library` (JWT verification), `googleapis` (Chat REST API), `ts-node-dev` (hot reload), Jest + ts-jest (tests).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/services/google-chat-app/package.json` | npm workspace config, dependencies |
| Create | `src/services/google-chat-app/tsconfig.json` | TypeScript compiler config |
| Create | `src/services/google-chat-app/Dockerfile` | Multi-stage build mirroring slack-app |
| Create | `src/services/google-chat-app/src/middleware/verify.ts` | Google bearer token verification |
| Create | `src/services/google-chat-app/src/middleware/logger.ts` | Structured JSON logger |
| Create | `src/services/google-chat-app/src/cards/annotation.ts` | Build annotation Card v2 |
| Create | `src/services/google-chat-app/src/cards/presend.ts` | Build pre-send Card v2 |
| Create | `src/services/google-chat-app/src/cards/coaching.ts` | Build coaching Dialog response |
| Create | `src/services/google-chat-app/src/handlers/message.ts` | Message event → annotation pipeline → private card |
| Create | `src/services/google-chat-app/src/handlers/slash.ts` | `/kokoro` slash command → pre-send check |
| Create | `src/services/google-chat-app/src/handlers/action.ts` | Button clicks → suggestions + coaching dialog |
| Create | `src/services/google-chat-app/src/index.ts` | Express server, event router |
| Create | `src/services/google-chat-app/tests/verify.test.ts` | Unit tests for token verification |
| Create | `src/services/google-chat-app/tests/cards.test.ts` | Unit tests for card builders |
| Create | `src/services/google-chat-app/tests/handlers.test.ts` | Unit tests for handlers |
| Modify | `package.json` (root) | Add `google-chat-app` to workspaces |
| Modify | `docker-compose.yml` | Add `google-chat-app` service |
| Modify | `.env.example` | Add Google Chat env vars |

---

## Task 1: Service Scaffold

**Files:**
- Create: `src/services/google-chat-app/package.json`
- Create: `src/services/google-chat-app/tsconfig.json`
- Create: `src/services/google-chat-app/Dockerfile`
- Modify: `package.json` (root)

- [ ] **Step 1: Create `src/services/google-chat-app/package.json`**

```json
{
  "name": "@kokoro/google-chat-app",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.19.0",
    "google-auth-library": "^9.11.0",
    "googleapis": "^140.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.0.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Create `src/services/google-chat-app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Create `src/services/google-chat-app/Dockerfile`**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY src/packages/shared src/packages/shared
COPY src/services/google-chat-app src/services/google-chat-app
RUN npm install --workspace=@kokoro/google-chat-app
RUN npm run build --workspace=@kokoro/google-chat-app

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/src/services/google-chat-app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY src/services/google-chat-app/package.json ./
CMD ["node", "dist/index.js"]

FROM node:20-alpine AS development
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY src/services/google-chat-app/package.json ./
COPY src/services/google-chat-app/tsconfig.json ./
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
```

- [ ] **Step 4: Add `google-chat-app` to root `package.json` workspaces**

In `package.json` (root), change:
```json
"workspaces": [
  "src/packages/shared",
  "src/services/slack-app",
  "src/services/api-gateway",
  "src/web/dashboard"
]
```
To:
```json
"workspaces": [
  "src/packages/shared",
  "src/services/slack-app",
  "src/services/api-gateway",
  "src/services/google-chat-app",
  "src/web/dashboard"
]
```

- [ ] **Step 5: Install dependencies**

```bash
cd code
npm install --workspace=@kokoro/google-chat-app
```

Expected: `node_modules/@kokoro/google-chat-app` resolved, `google-auth-library` and `googleapis` present.

- [ ] **Step 6: Commit**

```bash
git add src/services/google-chat-app/package.json \
        src/services/google-chat-app/tsconfig.json \
        src/services/google-chat-app/Dockerfile \
        package.json \
        package-lock.json
git commit -m "feat: scaffold google-chat-app service"
```

---

## Task 2: Logger + Verify Middleware

**Files:**
- Create: `src/services/google-chat-app/src/middleware/logger.ts`
- Create: `src/services/google-chat-app/src/middleware/verify.ts`
- Create: `src/services/google-chat-app/tests/verify.test.ts`

- [ ] **Step 1: Create `src/services/google-chat-app/src/middleware/logger.ts`**

```typescript
export function logRequest(action: string, metadata: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), action, ...metadata }));
}
```

- [ ] **Step 2: Write the failing test for `verify.ts`**

Create `src/services/google-chat-app/tests/verify.test.ts`:

```typescript
import { verifyGoogleToken } from '../src/middleware/verify';

describe('verifyGoogleToken', () => {
  it('returns false when Authorization header is missing', async () => {
    const result = await verifyGoogleToken(undefined);
    expect(result).toBe(false);
  });

  it('returns false when token format is invalid', async () => {
    const result = await verifyGoogleToken('Bearer not-a-jwt');
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd code/src/services/google-chat-app
npx jest tests/verify.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/middleware/verify'`

- [ ] **Step 4: Create `src/services/google-chat-app/src/middleware/verify.ts`**

```typescript
import { OAuth2Client } from 'google-auth-library';

const AUDIENCE = process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE ?? '';
const client = new OAuth2Client();

export async function verifyGoogleToken(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience: AUDIENCE });
    const payload = ticket.getPayload();
    return payload?.email === 'chat@system.gserviceaccount.com';
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx jest tests/verify.test.ts --no-coverage
```

Expected: PASS (both tests pass — invalid tokens return false without throwing)

- [ ] **Step 6: Commit**

```bash
git add src/services/google-chat-app/src/middleware/ \
        src/services/google-chat-app/tests/verify.test.ts
git commit -m "feat: add google-chat-app logger and token verification"
```

---

## Task 3: Annotation Card Builder

**Files:**
- Create: `src/services/google-chat-app/src/cards/annotation.ts`
- Create: `src/services/google-chat-app/tests/cards.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/google-chat-app/tests/cards.test.ts`:

```typescript
import { buildAnnotationCard } from '../src/cards/annotation';

describe('buildAnnotationCard', () => {
  const baseResult = {
    case_id: 'case-123',
    register: 'formal',
    intent_label: 'Polite request',
    risk_category: 'Register mismatch',
    micro_text: 'This phrasing may signal blame.',
    coaching_rationale: 'In Japanese culture, direct blame assignment...',
    suggestions: [
      { label: 'Formal equivalent', text: 'より丁寧な表現', register: 'formal' },
    ],
  };

  it('includes risk_category in header when flagged', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const header = card.cardsV2[0].card.header;
    expect(header.title).toContain('Register mismatch');
  });

  it('includes micro_text in body', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const section = card.cardsV2[0].card.sections[0];
    expect(JSON.stringify(section)).toContain('This phrasing may signal blame.');
  });

  it('includes suggestion buttons', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const actionsSection = card.cardsV2[0].card.sections[2];
    expect(JSON.stringify(actionsSection)).toContain('Formal equivalent');
  });

  it('includes Learn more button with coaching context', () => {
    const card = buildAnnotationCard(baseResult, 'ja');
    const actionsSection = card.cardsV2[0].card.sections[2];
    expect(JSON.stringify(actionsSection)).toContain('coaching_open');
  });

  it('shows green check header when neutral (no risk_category)', () => {
    const neutralResult = { ...baseResult, risk_category: null, intent_label: 'Neutral message' };
    const card = buildAnnotationCard(neutralResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('✅');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/cards/annotation'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/cards/annotation.ts`**

```typescript
const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const COACHING_URL = 'http://annotation-pipeline:8001/coaching/panel';

export interface AnnotationResult {
  case_id: string | null;
  register: string;
  intent_label: string;
  risk_category: string | null;
  micro_text: string;
  coaching_rationale: string;
  suggestions: Array<{ label: string; text: string; register: string }>;
}

export function buildAnnotationCard(result: AnnotationResult, sourceLang: string): any {
  const isNeutral = !result.risk_category && result.intent_label === 'Neutral message';
  const headerTitle = isNeutral
    ? `Kokoro · ✅ ${result.intent_label}`
    : `Kokoro · ⚠ ${result.risk_category ?? 'Cultural flag'} · Before you send`;

  const coachingParams = [
    { key: 'register', value: result.register },
    { key: 'intent_label', value: result.intent_label },
    { key: 'risk_category', value: result.risk_category ?? '' },
    { key: 'micro_text', value: result.micro_text },
    { key: 'coaching_rationale', value: result.coaching_rationale },
    { key: 'source_lang', value: sourceLang },
  ];

  const suggestionButtons = result.suggestions.map((s, i) => ({
    text: s.label,
    onClick: {
      action: {
        actionMethodName: `suggestion_${i}`,
        parameters: [
          { key: 'suggestionText', value: s.text || s.label },
          { key: 'caseId', value: result.case_id ?? '' },
        ],
      },
    },
  }));

  suggestionButtons.push({
    text: 'Learn more',
    onClick: {
      action: {
        actionMethodName: 'coaching_open',
        parameters: coachingParams,
      },
    },
  });

  return {
    cardsV2: [{
      cardId: 'annotationCard',
      card: {
        header: { title: headerTitle },
        sections: [
          {
            widgets: [{ textParagraph: { text: `<i>${result.micro_text}</i>` } }],
          },
          ...(result.coaching_rationale ? [{
            widgets: [{ textParagraph: { text: result.coaching_rationale } }],
          }] : []),
          {
            widgets: [{ buttonList: { buttons: suggestionButtons } }],
          },
        ],
      },
    }],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: PASS (5 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/cards/annotation.ts \
        src/services/google-chat-app/tests/cards.test.ts
git commit -m "feat: add annotation Card v2 builder"
```

---

## Task 4: Pre-Send Card Builder

**Files:**
- Create: `src/services/google-chat-app/src/cards/presend.ts`
- Modify: `src/services/google-chat-app/tests/cards.test.ts`

- [ ] **Step 1: Add pre-send tests to `tests/cards.test.ts`**

Append to the existing file:

```typescript
import { buildPresendCard } from '../src/cards/presend';

describe('buildPresendCard', () => {
  const flaggedResult = {
    case_id: 'case-456',
    register: 'formal',
    intent_label: 'Directive pressure',
    risk_category: 'Authority signal',
    micro_text: 'This may read as coercive.',
    coaching_rationale: 'Directive tone in Japanese workplace...',
    suggestions: [
      { label: 'Softer alternative', text: 'ご検討いただけますか', register: 'formal' },
    ],
  };

  it('shows green card when no risk', () => {
    const neutralResult = { ...flaggedResult, risk_category: null, intent_label: 'Neutral message' };
    const card = buildPresendCard(neutralResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('✅');
  });

  it('shows warning header when flagged', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(card.cardsV2[0].card.header.title).toContain('⚠');
  });

  it('includes Send original button', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(JSON.stringify(card)).toContain('presend_dismiss');
  });

  it('includes suggestion buttons', () => {
    const card = buildPresendCard(flaggedResult, 'ja');
    expect(JSON.stringify(card)).toContain('Softer alternative');
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/cards/presend'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/cards/presend.ts`**

```typescript
import type { AnnotationResult } from './annotation';

export function buildPresendCard(result: AnnotationResult, sourceLang: string): any {
  const isClean = !result.risk_category && result.intent_label === 'Neutral message';

  if (isClean) {
    return {
      cardsV2: [{
        cardId: 'presendCard',
        card: {
          header: { title: 'Kokoro · ✅ Your message looks good to send.' },
          sections: [{
            widgets: [{
              textParagraph: { text: `Register: <b>${result.register}</b> · No cultural flags detected.` },
            }],
          }],
        },
      }],
    };
  }

  const coachingParams = [
    { key: 'register', value: result.register },
    { key: 'intent_label', value: result.intent_label },
    { key: 'risk_category', value: result.risk_category ?? '' },
    { key: 'micro_text', value: result.micro_text },
    { key: 'coaching_rationale', value: result.coaching_rationale },
    { key: 'source_lang', value: sourceLang },
  ];

  const suggestionButtons = result.suggestions.map((s, i) => ({
    text: s.label,
    onClick: {
      action: {
        actionMethodName: `presend_suggestion_${i}`,
        parameters: [
          { key: 'suggestionText', value: s.text || s.label },
          { key: 'caseId', value: result.case_id ?? '' },
        ],
      },
    },
  }));

  suggestionButtons.push({
    text: 'Send original',
    onClick: { action: { actionMethodName: 'presend_dismiss', parameters: [] } },
  });

  suggestionButtons.push({
    text: 'Learn more',
    onClick: { action: { actionMethodName: 'coaching_open', parameters: coachingParams } },
  });

  return {
    cardsV2: [{
      cardId: 'presendCard',
      card: {
        header: { title: `Kokoro · ⚠ ${result.risk_category ?? 'Cultural flag'} · Before you send` },
        sections: [
          { widgets: [{ textParagraph: { text: `<i>${result.micro_text}</i>` } }] },
          ...(result.coaching_rationale ? [{
            widgets: [{ textParagraph: { text: result.coaching_rationale } }],
          }] : []),
          { widgets: [{ buttonList: { buttons: suggestionButtons } }] },
        ],
      },
    }],
  };
}
```

- [ ] **Step 4: Run all card tests**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: PASS (9 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/cards/presend.ts \
        src/services/google-chat-app/tests/cards.test.ts
git commit -m "feat: add pre-send Card v2 builder"
```

---

## Task 5: Coaching Dialog Builder

**Files:**
- Create: `src/services/google-chat-app/src/cards/coaching.ts`
- Modify: `src/services/google-chat-app/tests/cards.test.ts`

- [ ] **Step 1: Add coaching dialog tests to `tests/cards.test.ts`**

Append to the existing file:

```typescript
import { buildCoachingDialog } from '../src/cards/coaching';

describe('buildCoachingDialog', () => {
  const coaching = {
    register_label: 'Highly formal keigo',
    register_explanation: 'This message uses formal honorific markers.',
    intent: 'Urgency and accountability',
    cultural_risk: 'Loss of face for the client',
    rationale: 'In Japanese culture, nemawashi requires...',
    suggestion: 'ご確認いただけますでしょうか',
  };

  it('includes REGISTER section', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('REGISTER');
    expect(JSON.stringify(dialog)).toContain('Highly formal keigo');
  });

  it('includes CULTURAL RISK when present', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('CULTURAL RISK');
    expect(JSON.stringify(dialog)).toContain('Loss of face');
  });

  it('omits CULTURAL RISK when null', () => {
    const dialog = buildCoachingDialog({ ...coaching, cultural_risk: null });
    expect(JSON.stringify(dialog)).not.toContain('CULTURAL RISK');
  });

  it('includes SUGGESTED PHRASING when present', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(JSON.stringify(dialog)).toContain('SUGGESTED PHRASING');
    expect(JSON.stringify(dialog)).toContain('ご確認いただけますでしょうか');
  });

  it('returns valid dialog action response shape', () => {
    const dialog = buildCoachingDialog(coaching);
    expect(dialog.actionResponse.type).toBe('DIALOG');
    expect(dialog.actionResponse.dialogAction.dialog.body).toBeDefined();
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/cards/coaching'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/cards/coaching.ts`**

```typescript
export interface CoachingContent {
  register_label: string;
  register_explanation: string;
  intent: string;
  cultural_risk: string | null;
  rationale: string;
  suggestion: string | null;
}

function textSection(header: string, body: string): any {
  return {
    header,
    widgets: [{ textParagraph: { text: body } }],
  };
}

export function buildCoachingDialog(coaching: CoachingContent): any {
  const sections: any[] = [
    textSection('REGISTER', `<b>${coaching.register_label}</b>\n${coaching.register_explanation}`),
    textSection('INTENT', coaching.intent),
  ];

  if (coaching.cultural_risk) {
    sections.push(textSection('CULTURAL RISK', coaching.cultural_risk));
  }

  sections.push(textSection('WHY THIS MATTERS', coaching.rationale));

  if (coaching.suggestion) {
    sections.push(textSection('SUGGESTED PHRASING', `<i>${coaching.suggestion}</i>`));
  }

  return {
    actionResponse: {
      type: 'DIALOG',
      dialogAction: {
        dialog: {
          body: {
            header: { title: 'Kokoro — Cultural Coaching' },
            sections,
          },
        },
      },
    },
  };
}
```

- [ ] **Step 4: Run all card tests**

```bash
npx jest tests/cards.test.ts --no-coverage
```

Expected: PASS (14 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/cards/coaching.ts \
        src/services/google-chat-app/tests/cards.test.ts
git commit -m "feat: add coaching Dialog builder"
```

---

## Task 6: Message Handler (Inline Annotation)

**Files:**
- Create: `src/services/google-chat-app/src/handlers/message.ts`
- Create: `src/services/google-chat-app/tests/handlers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/services/google-chat-app/tests/handlers.test.ts`:

```typescript
jest.mock('../src/cards/annotation', () => ({
  buildAnnotationCard: jest.fn().mockReturnValue({ cardsV2: [] }),
}));

import { handleMessage } from '../src/handlers/message';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('handleMessage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null and does not post when annotation is neutral', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          case_id: null,
          register: 'neutral',
          intent_label: 'Neutral message',
          risk_category: null,
          micro_text: '',
          coaching_rationale: '',
          suggestions: [],
        },
      }),
    });

    const result = await handleMessage({
      text: 'hello',
      senderName: 'users/123',
      spaceName: 'spaces/abc',
    });

    expect(result).toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('returns card when annotation is flagged', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          case_id: 'case-abc',
          register: 'formal',
          intent_label: 'Directive',
          risk_category: 'Register mismatch',
          micro_text: 'Cultural flag detected.',
          coaching_rationale: 'rationale',
          suggestions: [],
        },
      }),
    });

    const result = await handleMessage({
      text: 'test message',
      senderName: 'users/123',
      spaceName: 'spaces/abc',
    });

    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/handlers/message'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/handlers/message.ts`**

```typescript
import { buildAnnotationCard } from '../cards/annotation';
import { logRequest } from '../middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';
const TARGET_LANG = process.env.KOKORO_TARGET_LANG ?? 'vi';

export interface MessageContext {
  text: string;
  senderName: string;   // e.g. "users/12345"
  spaceName: string;    // e.g. "spaces/abc"
}

export async function handleMessage(ctx: MessageContext): Promise<any | null> {
  try {
    const res = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: `gchat-${Date.now()}`,
        tenant_id: TENANT_ID,
        source_language: SOURCE_LANG,
        target_language: TARGET_LANG,
        redacted_text: ctx.text,
      }),
    });

    if (!res.ok) return null;
    const { result } = await res.json() as { result: any };

    if (!result.risk_category && result.intent_label === 'Neutral message') {
      logRequest('annotation.neutral', { space: ctx.spaceName });
      return null;
    }

    logRequest('annotation.flagged', { space: ctx.spaceName, intent: result.intent_label });
    return buildAnnotationCard(result, SOURCE_LANG);
  } catch (err) {
    logRequest('annotation.error', { error: String(err) });
    return null;
  }
}
```

- [ ] **Step 4: Run handler tests**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: PASS (2 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/handlers/message.ts \
        src/services/google-chat-app/tests/handlers.test.ts
git commit -m "feat: add Google Chat message handler"
```

---

## Task 7: Slash Command Handler

**Files:**
- Create: `src/services/google-chat-app/src/handlers/slash.ts`
- Modify: `src/services/google-chat-app/tests/handlers.test.ts`

- [ ] **Step 1: Add slash command tests to `tests/handlers.test.ts`**

Append to the existing file:

```typescript
import { handleSlashCommand } from '../src/handlers/slash';

describe('handleSlashCommand', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns usage card when draft is empty', async () => {
    const result = await handleSlashCommand('');
    expect(JSON.stringify(result)).toContain('Usage');
  });

  it('returns green card when annotation is neutral', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          case_id: null,
          register: 'neutral',
          intent_label: 'Neutral message',
          risk_category: null,
          micro_text: '',
          coaching_rationale: '',
          suggestions: [],
        },
      }),
    });

    const result = await handleSlashCommand('hello team');
    expect(JSON.stringify(result)).toContain('✅');
  });

  it('returns warning card when annotation is flagged', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          case_id: 'case-xyz',
          register: 'formal',
          intent_label: 'Directive',
          risk_category: 'Authority signal',
          micro_text: 'May read as coercive.',
          coaching_rationale: 'rationale',
          suggestions: [{ label: 'Alt', text: 'safer phrasing', register: 'formal' }],
        },
      }),
    });

    const result = await handleSlashCommand('finish by end of week');
    expect(JSON.stringify(result)).toContain('⚠');
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/handlers/slash'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/handlers/slash.ts`**

```typescript
import { buildPresendCard } from '../cards/presend';
import { logRequest } from '../middleware/logger';

const ANNOTATION_URL = 'http://annotation-pipeline:8001/annotate/';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';
const TARGET_LANG = process.env.KOKORO_TARGET_LANG ?? 'vi';

function usageCard(): any {
  return {
    cardsV2: [{
      cardId: 'usageCard',
      card: {
        header: { title: 'Kokoro — Pre-Send Check' },
        sections: [{
          widgets: [{
            textParagraph: {
              text: 'Usage: <b>/kokoro &lt;your draft message&gt;</b> — Kokoro will check it before you send.',
            },
          }],
        }],
      },
    }],
  };
}

export async function handleSlashCommand(draft: string): Promise<any> {
  if (!draft.trim()) return usageCard();

  try {
    const res = await fetch(ANNOTATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_id: `presend-${Date.now()}`,
        tenant_id: TENANT_ID,
        source_language: SOURCE_LANG,
        target_language: TARGET_LANG,
        redacted_text: draft,
      }),
    });

    if (!res.ok) throw new Error(`pipeline ${res.status}`);
    const { result } = await res.json() as { result: any };
    logRequest('presend.checked', { intent: result.intent_label });
    return buildPresendCard(result, SOURCE_LANG);
  } catch (err) {
    logRequest('presend.error', { error: String(err) });
    return {
      text: 'Kokoro is temporarily unavailable. You can send your message.',
    };
  }
}
```

- [ ] **Step 4: Run all handler tests**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: PASS (5 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/handlers/slash.ts \
        src/services/google-chat-app/tests/handlers.test.ts
git commit -m "feat: add /kokoro slash command handler"
```

---

## Task 8: Action Handler (Suggestions + Coaching Dialog)

**Files:**
- Create: `src/services/google-chat-app/src/handlers/action.ts`
- Modify: `src/services/google-chat-app/tests/handlers.test.ts`

- [ ] **Step 1: Add action handler tests to `tests/handlers.test.ts`**

Append to the existing file:

```typescript
import { handleAction } from '../src/handlers/action';

describe('handleAction', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns suggestion card on suggestion_N action', async () => {
    const event = {
      action: {
        actionMethodName: 'suggestion_0',
        parameters: [
          { key: 'suggestionText', value: 'より丁寧な表現' },
          { key: 'caseId', value: 'case-abc' },
        ],
      },
      user: { name: 'users/123' },
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const result = await handleAction(event);
    expect(JSON.stringify(result)).toContain('より丁寧な表現');
  });

  it('returns coaching dialog on coaching_open action', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        register_label: 'Formal keigo',
        register_explanation: 'Explanation.',
        intent: 'Urgency',
        cultural_risk: null,
        rationale: 'Rationale.',
        suggestion: null,
      }),
    });
    const event = {
      action: {
        actionMethodName: 'coaching_open',
        parameters: [
          { key: 'register', value: 'formal' },
          { key: 'intent_label', value: 'Directive' },
          { key: 'risk_category', value: '' },
          { key: 'micro_text', value: 'flag' },
          { key: 'coaching_rationale', value: 'rationale' },
          { key: 'source_lang', value: 'ja' },
        ],
      },
      user: { name: 'users/123' },
    };
    const result = await handleAction(event);
    expect(result.actionResponse.type).toBe('DIALOG');
  });

  it('returns empty object on presend_dismiss', async () => {
    const event = {
      action: { actionMethodName: 'presend_dismiss', parameters: [] },
      user: { name: 'users/123' },
    };
    const result = await handleAction(event);
    expect(result).toEqual({});
  });
});
```

- [ ] **Step 2: Run to verify new tests fail**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '../src/handlers/action'`

- [ ] **Step 3: Create `src/services/google-chat-app/src/handlers/action.ts`**

```typescript
import { buildCoachingDialog } from '../cards/coaching';
import { logRequest } from '../middleware/logger';

const FEEDBACK_URL = 'http://annotation-pipeline:8001/feedback/suggestion-used';
const COACHING_URL = 'http://annotation-pipeline:8001/coaching/panel';
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';
const SOURCE_LANG = process.env.KOKORO_SOURCE_LANG ?? 'ja';

function getParam(parameters: Array<{ key: string; value: string }>, key: string): string {
  return parameters.find(p => p.key === key)?.value ?? '';
}

function suggestionCard(text: string): any {
  return {
    cardsV2: [{
      cardId: 'suggestionCard',
      card: {
        header: { title: 'Kokoro · 💡 Suggested phrasing' },
        sections: [{
          widgets: [{ textParagraph: { text: `<blockquote>${text}</blockquote>` } }],
        }, {
          widgets: [{ textParagraph: { text: 'Copy the text above to use it in your message.' } }],
        }],
      },
    }],
  };
}

export async function handleAction(event: any): Promise<any> {
  const methodName: string = event.action?.actionMethodName ?? '';
  const parameters: Array<{ key: string; value: string }> = event.action?.parameters ?? [];
  const userDisplayName: string = event.user?.name ?? '';

  // Dismiss: no-op
  if (methodName === 'presend_dismiss') return {};

  // Suggestion buttons (inline annotation or pre-send)
  if (methodName.startsWith('suggestion_') || methodName.startsWith('presend_suggestion_')) {
    const suggestionText = getParam(parameters, 'suggestionText');
    const caseId = getParam(parameters, 'caseId');

    if (caseId) {
      fetch(FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          slack_user_id: userDisplayName,
          tenant_id: TENANT_ID,
          language: SOURCE_LANG,
        }),
      }).catch(e => logRequest('feedback.post_failed', { error: String(e) }));
    }

    logRequest('suggestion.selected', { method: methodName, user: userDisplayName });
    return suggestionCard(suggestionText);
  }

  // Coaching dialog
  if (methodName === 'coaching_open') {
    try {
      const res = await fetch(COACHING_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          register: getParam(parameters, 'register'),
          intent_label: getParam(parameters, 'intent_label'),
          risk_category: getParam(parameters, 'risk_category') || null,
          micro_text: getParam(parameters, 'micro_text'),
          coaching_rationale: getParam(parameters, 'coaching_rationale'),
          source_lang: getParam(parameters, 'source_lang') || SOURCE_LANG,
        }),
      });
      if (!res.ok) throw new Error(`coaching ${res.status}`);
      const coaching = await res.json();
      logRequest('coaching.opened', { user: userDisplayName });
      return buildCoachingDialog(coaching);
    } catch (err) {
      logRequest('coaching.error', { error: String(err) });
      return buildCoachingDialog({
        register_label: 'Unknown',
        register_explanation: '',
        intent: '',
        cultural_risk: null,
        rationale: 'Coaching is temporarily unavailable.',
        suggestion: null,
      });
    }
  }

  return {};
}
```

- [ ] **Step 4: Run all handler tests**

```bash
npx jest tests/handlers.test.ts --no-coverage
```

Expected: PASS (8 tests pass)

- [ ] **Step 5: Commit**

```bash
git add src/services/google-chat-app/src/handlers/action.ts \
        src/services/google-chat-app/tests/handlers.test.ts
git commit -m "feat: add action handler for suggestions and coaching dialog"
```

---

## Task 9: Express Server + Event Router

**Files:**
- Create: `src/services/google-chat-app/src/index.ts`

> No unit test for `index.ts` — it is integration glue. End-to-end verification happens in Task 10 with a live request.

- [ ] **Step 1: Create `src/services/google-chat-app/src/index.ts`**

```typescript
import express, { Request, Response } from 'express';
import { google } from 'googleapis';
import { verifyGoogleToken } from './middleware/verify';
import { logRequest } from './middleware/logger';
import { handleMessage } from './handlers/message';
import { handleSlashCommand } from './handlers/slash';
import { handleAction } from './handlers/action';

const PORT = process.env.PORT ?? 8004;
const TENANT_ID = process.env.KOKORO_TENANT_ID ?? 'default-tenant';

// Google Chat REST API client (for private/ephemeral messages)
function getChatClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString())
    : null;

  const auth = keyJson
    ? new google.auth.GoogleAuth({ credentials: keyJson, scopes: ['https://www.googleapis.com/auth/chat.bot'] })
    : null;

  return auth ? google.chat({ version: 'v1', auth }) : null;
}

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'google-chat-app' });
});

app.post('/webhook', async (req: Request, res: Response) => {
  // Verify Google bearer token
  const isValid = await verifyGoogleToken(req.headers.authorization);
  if (!isValid) {
    logRequest('webhook.unauthorized');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const event = req.body;
  const eventType: string = event.type ?? '';

  logRequest('webhook.received', { type: eventType });

  // ── MESSAGE event (includes slash commands) ─────────────────
  if (eventType === 'MESSAGE') {
    const slashCommand = event.message?.slashCommand;

    if (slashCommand) {
      // /kokoro pre-send check
      const draft = (event.message?.argumentText ?? '').trim();
      const card = await handleSlashCommand(draft);
      res.json(card);
      return;
    }

    // Inline annotation — respond with 200 immediately, post private card async
    res.json({});
    const text: string = event.message?.text ?? '';
    const senderName: string = event.user?.name ?? '';
    const spaceName: string = event.space?.name ?? '';

    if (!text || !senderName || !spaceName) return;

    const card = await handleMessage({ text, senderName, spaceName });
    if (!card) return;

    const chatClient = getChatClient();
    if (!chatClient) {
      logRequest('annotation.no_chat_client', { space: spaceName });
      return;
    }

    try {
      await chatClient.spaces.messages.create({
        parent: spaceName,
        requestBody: {
          ...card,
          privateMessageViewer: { name: senderName },
        },
      });
      logRequest('annotation.posted', { space: spaceName });
    } catch (err) {
      logRequest('annotation.post_failed', { error: String(err) });
    }
    return;
  }

  // ── CARD_CLICKED event (button actions) ─────────────────────
  if (eventType === 'CARD_CLICKED') {
    const result = await handleAction(event);
    res.json(result);
    return;
  }

  // ── ADDED_TO_SPACE / REMOVED_FROM_SPACE ─────────────────────
  if (eventType === 'ADDED_TO_SPACE') {
    res.json({ text: 'Kokoro is connected. I will privately annotate messages with cultural context.' });
    return;
  }

  res.json({});
});

app.listen(PORT, () => {
  logRequest('google-chat-app.started', { port: PORT });
});
```

- [ ] **Step 2: Commit**

```bash
git add src/services/google-chat-app/src/index.ts
git commit -m "feat: add Express webhook server and event router"
```

---

## Task 10: Docker Compose + Env + End-to-End Smoke Test

**Files:**
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Add `google-chat-app` to `docker-compose.yml`**

Add after the `slack-app` block:

```yaml
  google-chat-app:
    build:
      context: .
      dockerfile: src/services/google-chat-app/Dockerfile
      target: development
    ports:
      - "8004:8004"
    env_file: .env
    depends_on:
      - annotation-pipeline
    volumes:
      - ./src/services/google-chat-app/src:/app/src
```

- [ ] **Step 2: Add env vars to `.env.example`**

Append to `.env.example`:

```env
# ── Google Chat App ──────────────────────────────────────────
GOOGLE_CHAT_WEBHOOK_AUDIENCE=https://your-ngrok-url.ngrok.io/webhook
GOOGLE_SERVICE_ACCOUNT_KEY=      # base64-encoded service account JSON
KOKORO_TENANT_ID=default-tenant
```

- [ ] **Step 3: Build and start the service**

```bash
cd code
docker compose up -d --build google-chat-app
```

Expected: container starts, no errors.

- [ ] **Step 4: Verify health endpoint**

```bash
curl http://localhost:8004/health
```

Expected:
```json
{"status":"ok","service":"google-chat-app"}
```

- [ ] **Step 5: Smoke test — simulate a MESSAGE event (no auth for local verification)**

Set `GOOGLE_CHAT_WEBHOOK_AUDIENCE` to empty string in `.env` temporarily so `verifyGoogleToken` passes with an empty token. Then:

```bash
curl -s -X POST http://localhost:8004/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{
    "type": "MESSAGE",
    "message": { "text": "プロジェクトは遅れています。原因はクライアント側の要件変更です。" },
    "user": { "name": "users/test123" },
    "space": { "name": "spaces/testspace" }
  }'
```

Expected: HTTP 200 `{}` (async path — card would be posted privately via Chat API)

Check annotation pipeline received the call:
```bash
docker compose logs annotation-pipeline --tail=10
```

Expected: log line showing annotation was processed.

- [ ] **Step 6: Restore `GOOGLE_CHAT_WEBHOOK_AUDIENCE` to actual value**

Set it back to your ngrok URL in `.env`.

- [ ] **Step 7: Run full test suite**

```bash
cd code/src/services/google-chat-app
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: wire google-chat-app into docker-compose"
```

---

## Task 11: Google Cloud Console Setup (Manual)

> These steps are done in the Google Cloud Console and cannot be automated. Complete them once the service is deployed with a stable public URL.

- [ ] **Step 1: Create a Google Cloud project** (or reuse existing one for Vnext Japan)

- [ ] **Step 2: Enable the Google Chat API**

Go to: APIs & Services → Enable APIs → search "Google Chat API" → Enable.

- [ ] **Step 3: Configure the Chat app**

Go to: Google Chat API → Configuration:
- App name: `Kokoro`
- Avatar URL: (upload Kokoro logo or leave default)
- Description: `AI Cultural Translation Engine for Vietnamese-Japanese communication`
- Functionality: ✅ Receive 1:1 messages, ✅ Join spaces and group conversations
- Connection settings: **App URL** → set to `https://<your-ngrok-or-production-url>/webhook`
- Slash commands: Add `/kokoro` with description `Check your draft message before sending`

- [ ] **Step 4: Create a service account**

Go to: IAM & Admin → Service Accounts → Create:
- Name: `kokoro-chat-bot`
- Role: (no special role needed)
- Create JSON key → download

- [ ] **Step 5: Base64-encode the service account key and add to `.env`**

```bash
base64 -i path/to/service-account.json | tr -d '\n'
```

Paste result into `.env` as `GOOGLE_SERVICE_ACCOUNT_KEY`.

- [ ] **Step 6: Add the bot to a test space in Google Chat**

In Google Chat: open a space → Add people & apps → search "Kokoro" → Add.

Send a test message. The bot should annotate it privately within a few seconds.

- [ ] **Step 7: Test `/kokoro` slash command**

In Google Chat: type `/kokoro 今週中に必ず終わらせてください。` — Kokoro should return a pre-send card synchronously.

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Inline annotation → Task 6 + 9
- ✅ Pre-send check → Task 7
- ✅ Suggestion buttons + feedback → Task 8
- ✅ Coaching dialog → Task 5 + 8
- ✅ Private messages (`privateMessageViewer`) → Task 9
- ✅ Bearer token verification → Task 2
- ✅ docker-compose wiring → Task 10
- ✅ Google Cloud Console setup → Task 11

**No placeholders:** All steps contain actual code or exact commands.

**Type consistency:**
- `AnnotationResult` defined in `cards/annotation.ts`, imported in `cards/presend.ts` ✅
- `CoachingContent` defined in `cards/coaching.ts` ✅
- `MessageContext` defined in `handlers/message.ts` ✅
- `handleAction` receives raw Google Chat event object ✅
