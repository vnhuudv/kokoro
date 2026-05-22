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
