jest.mock('../../../../src/services/slack-app/src/clients/annotation-pipeline-client');
jest.mock('../../../../src/services/slack-app/src/renderers/annotation-block');

import { handleIncomingMessage } from '../../../../src/services/slack-app/src/handlers/message';
import { annotate } from '../../../../src/services/slack-app/src/clients/annotation-pipeline-client';
import { renderAnnotationBlock } from '../../../../src/services/slack-app/src/renderers/annotation-block';
import type { WebClient } from '@slack/web-api';
import type { ProfileCache, CachedProfile } from '../../../../src/services/slack-app/src/cache/profile-cache';
import type { ChannelCache } from '../../../../src/services/slack-app/src/cache/channel-cache';

const vnProfile = { slackUserId: 'U001', language: 'vi' as const, fluencyScore: 10, optedIn: true };
const jpProfile1 = { slackUserId: 'U002', language: 'ja' as const, fluencyScore: 15, optedIn: true };
const jpProfile2 = { slackUserId: 'U003', language: 'ja' as const, fluencyScore: 50, optedIn: true };
const vnProfile2 = { slackUserId: 'U004', language: 'vi' as const, fluencyScore: 10, optedIn: true };
const notOptedIn = { slackUserId: 'U005', language: 'ja' as const, fluencyScore: 0, optedIn: false };

const mockAnnotationResult = {
  messageId: '123.456', register: 'neutral' as const, intentLabel: 'Test',
  microText: 'ctx', suggestions: [], coachingRationale: 'rationale',
  caseId: null, riskCategory: null,
};

const mockClient = {
  chat: { postEphemeral: jest.fn().mockResolvedValue({}) },
} as unknown as WebClient;

const mockProfileCache: ProfileCache = {
  get: jest.fn().mockResolvedValue(vnProfile),
  getMany: jest.fn().mockResolvedValue(new Map<string, CachedProfile>([
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
    expect(recipients).not.toContain('U001');
    expect(recipients).not.toContain('U004');
    expect(recipients).not.toContain('U005');
  });

  it('uses recipient fluency score for renderer', async () => {
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
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
      new Map<string, CachedProfile>([['U001', vnProfile], ['U002', { ...jpProfile1, optedIn: false }]])
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

  it('skips entirely when sender profile is null (not in DB)', async () => {
    (mockProfileCache.get as jest.Mock).mockResolvedValueOnce(null);
    await handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache);
    expect(annotate).not.toHaveBeenCalled();
    expect(mockClient.chat.postEphemeral).not.toHaveBeenCalled();
  });

  it('does not throw when channel cache rejects', async () => {
    (mockChannelCache.getMembers as jest.Mock).mockRejectedValueOnce(new Error('network error'));
    await expect(
      handleIncomingMessage(event, mockClient, mockProfileCache, mockChannelCache)
    ).resolves.toBeUndefined();
    expect(mockClient.chat.postEphemeral).not.toHaveBeenCalled();
  });
});
