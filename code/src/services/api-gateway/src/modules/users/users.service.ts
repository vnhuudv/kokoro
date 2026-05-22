import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';

export interface CachedProfile {
  slackUserId: string;
  language: 'vi' | 'ja';
  fluencyScore: number;
  optedIn: boolean;
}

@Injectable()
export class UsersService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async getProfilesBySlackIds(slackIds: string[], tenantId: string): Promise<CachedProfile[]> {
    if (!slackIds.length) return [];

    const placeholders = slackIds.map((_, i) => `$${i + 2}`).join(', ');
    const { rows } = await this.pool.query<{
      slack_user_id: string;
      language: string;
      fluency_score: string | null;
      opted_out_at: string | null;
    }>(
      `SELECT slack_user_id, language, fluency_score, opted_out_at
       FROM users
       WHERE tenant_id = $1
       AND slack_user_id IN (${placeholders})`,
      [tenantId, ...slackIds],
    );

    return rows.map(r => ({
      slackUserId: r.slack_user_id,
      language: r.language as 'vi' | 'ja',
      fluencyScore: r.fluency_score !== null ? Number(r.fluency_score) : 0,
      optedIn: r.opted_out_at === null,
    }));
  }
}
