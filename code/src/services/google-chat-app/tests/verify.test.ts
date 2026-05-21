import { OAuth2Client } from 'google-auth-library';
import { verifyGoogleToken } from '../src/middleware/verify';

jest.mock('google-auth-library');

describe('verifyGoogleToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false when Authorization header is missing', async () => {
    const result = await verifyGoogleToken(undefined);
    expect(result).toBe(false);
  });

  it('returns false when token format is invalid', async () => {
    const result = await verifyGoogleToken('Bearer not-a-jwt');
    expect(result).toBe(false);
  });

  it('returns false when GOOGLE_CHAT_WEBHOOK_AUDIENCE is not set', async () => {
    const original = process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE;
    delete process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE;
    const result = await verifyGoogleToken('Bearer sometoken');
    expect(result).toBe(false);
    if (original !== undefined) process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE = original;
  });

  it('returns true for valid token with correct service account email', async () => {
    process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE = 'https://example.ngrok.io/webhook';
    const mockTicket = {
      getPayload: jest.fn().mockReturnValue({ email: 'chat@system.gserviceaccount.com' }),
    };
    (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValueOnce(mockTicket);

    const result = await verifyGoogleToken('Bearer valid.jwt.token');
    expect(result).toBe(true);
    delete process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE;
  });

  it('returns false for token with wrong email', async () => {
    process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE = 'https://example.ngrok.io/webhook';
    const mockTicket = {
      getPayload: jest.fn().mockReturnValue({ email: 'attacker@evil.com' }),
    };
    (OAuth2Client.prototype.verifyIdToken as jest.Mock).mockResolvedValueOnce(mockTicket);

    const result = await verifyGoogleToken('Bearer valid.jwt.token');
    expect(result).toBe(false);
    delete process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE;
  });
});
