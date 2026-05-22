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

  it('re-fetches after TTL expires', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1000);
    (mockClient.conversations.members as jest.Mock).mockResolvedValue({ members: ['U001'] });

    await cache.getMembers('C001');
    jest.clearAllMocks();

    nowSpy.mockReturnValue(1000 + 5 * 60 * 1000 + 1);
    await cache.getMembers('C001');
    expect(mockClient.conversations.members).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });
});
