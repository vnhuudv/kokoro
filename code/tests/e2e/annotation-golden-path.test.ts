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
  result: {
    register: 'neutral',
    intent_label: 'Firm deadline request',
    risk_category: 'time_commitment_ambiguity',
    micro_text: '"End of week" is often read as soft in Japanese context.',
    suggestions: [
      { label: 'Reply formally', register: 'formal', text: '承知いたしました。' },
    ],
    coaching_rationale: 'Vietnamese directness around timelines can read as ambiguous.',
    case_id: null,
  },
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
    process.env.ANNOTATION_PIPELINE_URL = 'http://annotation-pipeline:8001';
    process.env.SLACK_TENANT_ID = 'default-tenant';
    profileCache = new ProfileCache('http://api-gateway:3001');
    channelCache = new ChannelCache(mockSlackClient);

    // Fetch call order:
    // 1. profileCache.get('U001') → GET /api/users/profiles?slackIds=U001
    // 2. profileCache.getMany(['U001','U002','U003','U004']) → only misses U002,U003,U004
    // 3. annotate → POST /annotate/
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

  it('posts 0 ephemerals when pipeline returns 503', async () => {
    // resetAllMocks clears both call counts AND the mockResolvedValueOnce queues,
    // so we start fresh without consuming queued responses from beforeEach.
    jest.resetAllMocks();
    profileCache = new ProfileCache('http://api-gateway:3001');
    channelCache = new ChannelCache(mockSlackClient);
    (mockSlackClient.conversations.members as jest.Mock).mockResolvedValue({
      members: ['U001', 'U002', 'U003', 'U004'],
    });
    (mockSlackClient.chat.postEphemeral as jest.Mock).mockResolvedValue({});
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
