jest.mock('../src/cards/annotation', () => ({
  buildAnnotationCard: jest.fn().mockReturnValue({ cardsV2: [] }),
  buildCoachingParams: jest.fn().mockReturnValue([]),
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
