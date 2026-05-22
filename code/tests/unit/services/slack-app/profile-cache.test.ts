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
      expect.stringContaining('/api/users/profiles?slackIds=U001')
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
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.get('U001')).toEqual(mockProfile);
    expect(result.get('U002')).toEqual(jpProfile);
  });

  it('re-fetches profile after TTL expires', async () => {
    const mockFetch = fetch as jest.Mock;
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1000);
    mockFetch.mockResolvedValue({ ok: true, json: async () => [mockProfile] });
    await cache.get('U001');
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: async () => [mockProfile] });

    // Advance past 5-minute TTL
    nowSpy.mockReturnValue(1000 + 5 * 60 * 1000 + 1);
    await cache.get('U001');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    nowSpy.mockRestore();
  });
});
