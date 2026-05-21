import { OAuth2Client } from 'google-auth-library';
import { logRequest } from './logger';

// OAuth2Client is used here only for JWT verification (verifyIdToken).
// No credentials needed — Google's public keys are used.
const client = new OAuth2Client();

export async function verifyGoogleToken(authHeader: string | undefined): Promise<boolean> {
  const audience = process.env.GOOGLE_CHAT_WEBHOOK_AUDIENCE;
  if (!audience) {
    logRequest('google.verify_skipped', { reason: 'GOOGLE_CHAT_WEBHOOK_AUDIENCE not set' });
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logRequest('google.verify_failed', { reason: 'missing_or_invalid_header' });
    return false;
  }

  const token = authHeader.slice(7);
  const allowedEmail = process.env.GOOGLE_CHAT_SENDER_EMAIL ?? 'chat@system.gserviceaccount.com';

  try {
    const ticket = await client.verifyIdToken({ idToken: token, audience });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      logRequest('google.verify_failed', { reason: 'no_email_in_payload' });
      return false;
    }
    if (payload.email !== allowedEmail) {
      logRequest('google.verify_failed', { reason: 'email_mismatch', token_email: payload.email, expected_email: allowedEmail });
      return false;
    }
    return true;
  } catch {
    // Decode JWT without verification to log what audience Google actually sent
    try {
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      logRequest('google.verify_failed', {
        reason: 'jwt_verification_failed',
        token_aud: decoded.aud,
        token_email: decoded.email,
        expected_aud: audience,
        expected_email: allowedEmail,
      });
    } catch {
      logRequest('google.verify_failed', { reason: 'jwt_verification_failed' });
    }
    return false;
  }
}
