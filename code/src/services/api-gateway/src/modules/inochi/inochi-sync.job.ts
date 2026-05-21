import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

const TOOL_PROVIDER: Record<string, string> = {
  claude_web:       'anthropic',
  gemini_workspace: 'google',
};

@Injectable()
export class InochiSyncJob {
  private readonly logger = new Logger(InochiSyncJob.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /** Runs at 02:00 UTC on the 1st of every month. */
  @Cron('0 2 1 * *')
  async runMonthlySync(): Promise<void> {
    const now = new Date();
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodDate = lastMonthDate.toISOString().slice(0, 10);

    this.logger.log(`Running Inochi sync for period ${periodDate}`);
    try {
      await this.syncEstimates(periodDate);
      this.logger.log(`Inochi sync complete for ${periodDate}`);
    } catch (err) {
      this.logger.error(`Inochi sync failed: ${err}`);
    }
  }

  async syncEstimates(periodDate: string): Promise<{ users: number; tools: number }> {
    const { rows: users } = await this.pool.query<{ user_id: string }>(
      `SELECT user_id FROM users WHERE tenant_id = $1 AND opted_out_at IS NULL`,
      [DEFAULT_TENANT],
    );

    const { rows: estimates } = await this.pool.query<{
      tool: string; tokens_per_seat_per_month: number;
    }>(
      `SELECT tool, tokens_per_seat_per_month FROM usage_estimates WHERE tenant_id = $1`,
      [DEFAULT_TENANT],
    );

    if (users.length === 0 || estimates.length === 0) {
      return { users: users.length, tools: estimates.length };
    }

    for (const user of users) {
      for (const est of estimates) {
        const provider = TOOL_PROVIDER[est.tool] ?? 'other';
        await this.pool.query(
          `INSERT INTO ai_usage_logs
             (user_id, tenant_id, source, provider, tool, input_tokens, output_tokens, period_month)
           VALUES ($1, $2, 'estimate', $3, $4, $5, 0, $6)
           ON CONFLICT ON CONSTRAINT uq_ai_usage_logs_user_tool_period
           DO NOTHING`,
          [user.user_id, DEFAULT_TENANT, provider, est.tool, est.tokens_per_seat_per_month, periodDate],
        );
      }
    }

    this.logger.log(`Inserted estimates: ${users.length} users × ${estimates.length} tools`);
    return { users: users.length, tools: estimates.length };
  }
}
