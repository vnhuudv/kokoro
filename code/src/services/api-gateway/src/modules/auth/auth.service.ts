import { Injectable, Inject, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import { AuthUser } from './auth.types';

const SLACK_AUTHORIZE_URL = 'https://slack.com/oauth/v2/authorize';
const SLACK_TOKEN_URL     = 'https://slack.com/api/oauth.v2.access';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @Inject(DB_POOL) private readonly pool: Pool,
  ) {}

  slackOAuthUrl(): string {
    const params = new URLSearchParams({
      client_id:    process.env.SLACK_CLIENT_ID    ?? '',
      user_scope:   'identity.basic',
      redirect_uri: process.env.SLACK_OAUTH_REDIRECT_URI ?? '',
    });
    return `${SLACK_AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCodeForJwt(code: string): Promise<string> {
    const body = new URLSearchParams({
      code,
      client_id:     process.env.SLACK_CLIENT_ID     ?? '',
      client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
      redirect_uri:  process.env.SLACK_OAUTH_REDIRECT_URI ?? '',
    });

    const res = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const data = await res.json() as {
      ok: boolean;
      authed_user?: { id: string };
      error?: string;
    };

    if (!data.ok || !data.authed_user?.id) {
      this.logger.error(`Slack OAuth failed: ${data.error ?? 'unknown_error'}`);
      throw new Error('Slack authentication failed');
    }

    const slackUserId = data.authed_user.id;

    const { rows } = await this.pool.query<{ user_id: string; tenant_id: string }>(
      `SELECT user_id, tenant_id FROM users
       WHERE slack_user_id = $1 AND opted_out_at IS NULL
       LIMIT 1`,
      [slackUserId],
    );

    if (rows.length === 0) {
      this.logger.warn('No active user found for Slack ID (user not in users table or opted out)');
      throw new Error('User not authorized');
    }

    const payload: AuthUser = {
      user_id:       rows[0].user_id,
      tenant_id:     rows[0].tenant_id,
      slack_user_id: slackUserId,
    };

    return this.jwtService.sign(payload);
  }

  async issueBeerToken(slackUserId: string): Promise<string> {
    const { rows } = await this.pool.query<{ user_id: string; tenant_id: string }>(
      `SELECT user_id, tenant_id FROM users
       WHERE slack_user_id = $1 AND opted_out_at IS NULL
       LIMIT 1`,
      [slackUserId],
    );
    if (rows.length === 0) {
      this.logger.warn('Beer token request: no active user for Slack ID %s', slackUserId);
      throw new Error('User not authorized');
    }
    const payload: AuthUser = {
      user_id:       rows[0].user_id,
      tenant_id:     rows[0].tenant_id,
      slack_user_id: slackUserId,
    };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }
}
