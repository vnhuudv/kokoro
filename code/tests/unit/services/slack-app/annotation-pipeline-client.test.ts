import { annotate } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';

global.fetch = jest.fn();

const mockSnakeResponse = {
  message_id: '123.456',
  result: {
    message_id: '123.456',
    case_id: 'case-abc',
    register: 'neutral',
    intent_label: 'Firm deadline request',
    risk_category: 'time_commitment_ambiguity',
    micro_text: '"End of week" can read as soft in Japanese context.',
    suggestions: [{ label: 'Reply formally', register: 'formal', text: '承知いたしました。' }],
    coaching_rationale: 'Vietnamese directness can read as ambiguous.',
  },
  latency_ms: 300,
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
    const result = await annotate('http://annotation-pipeline:8001', baseRequest);
    expect(result?.intentLabel).toBe('Firm deadline request');
    expect(result?.microText).toBe('"End of week" can read as soft in Japanese context.');
    expect(result?.register).toBe('neutral');
    expect(result?.messageId).toBe('123.456');
    expect(result?.caseId).toBe('case-abc');
  });

  it('sends correct snake_case body to pipeline, deriving target_language from sender_culture', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockSnakeResponse });
    await annotate('http://annotation-pipeline:8001', baseRequest);
    const body = JSON.parse((fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.message_id).toBe('123.456');
    expect(body.source_language).toBe('vi');
    expect(body.target_language).toBe('ja');
    expect(body.slack_user_id).toBe('U001');
    expect(body.redacted_text).toBe('Please review by end of week.');
  });

  it('returns null on HTTP 503', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 503 });
    const result = await annotate('http://annotation-pipeline:8001', baseRequest);
    expect(result).toBeNull();
  });

  it('returns null on AbortError (timeout)', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
    );
    const result = await annotate('http://annotation-pipeline:8001', baseRequest);
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const result = await annotate('http://annotation-pipeline:8001', baseRequest);
    expect(result).toBeNull();
  });
});
