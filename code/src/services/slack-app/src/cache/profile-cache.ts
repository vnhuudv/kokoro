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
    const tenantId = process.env.SLACK_TENANT_ID ?? 'default-tenant';
    const url = `${this.apiGatewayUrl}/api/users/profiles?slackIds=${slackUserIds.join(',')}&tenantId=${encodeURIComponent(tenantId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`api-gateway responded ${response.status}`);
    return response.json() as Promise<CachedProfile[]>;
  }
}
