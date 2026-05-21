// code/src/services/api-gateway/src/modules/inochi/inochi-sync.job.ts
import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Pool } from 'pg';
import { WebClient } from '@slack/web-api';
import { DB_POOL } from '../database/database.module';
import { InochiService } from './inochi.service';
import { toKmEquivalent } from './inochi.types';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

const TOOL_PROVIDER: Record<string, string> = {
  claude_web:       'anthropic',
  gemini_workspace: 'google',
};

@Injectable()
export class InochiSyncJob {
  private readonly logger = new Logger(InochiSyncJob.name);
  private readonly slack = new WebClient(process.env.SLACK_BOT_TOKEN);

  constructor(
    @Inject(DB_POOL) private readonly pool: Pool,
    private readonly inochiService: InochiService,
  ) {}

  /** Runs at 02:00 UTC on the 1st of every month. */
  @Cron('0 2 1 * *')
  async runMonthlySync(): Promise<void> {
    const now = new Date();
    const lastMonthFirstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const periodDate = lastMonthFirstDay.toISOString().slice(0, 10);
    const periodMonth = periodDate.slice(0, 7);

    this.logger.log(`Running Inochi sync for period ${periodDate}`);
    try {
      await this.syncEstimates(periodDate);
      await this.sendMonthlyDMs(periodMonth);
      this.logger.log(`Inochi sync + DMs complete for ${periodDate}`);
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

  private async sendMonthlyDMs(periodMonth: string): Promise<void> {
    const { rows: users } = await this.pool.query<{ user_id: string; slack_user_id: string }>(
      `SELECT user_id, slack_user_id FROM users
       WHERE tenant_id = $1 AND opted_out_at IS NULL`,
      [DEFAULT_TENANT],
    );

    for (const user of users) {
      try {
        const summary = await this.inochiService.getPersonalCarbon(user.user_id, periodMonth);
        const km = toKmEquivalent(summary.total_kg_co2e);
        const toolLines = summary.tools
          .map(t => {
            const precision = t.source === 'gateway' ? 'exact'
              : t.source === 'billing_api' ? 'estimated' : 'approximate';
            return `• ${t.tool.padEnd(20)} ${t.carbon_kg.toFixed(4)} kg  [${precision}]`;
          })
          .join('\n') || '• No usage recorded';

        const offsetLine = summary.offset_covered
          ? '✅ Vnext has purchased verified offsets covering this month.'
          : '⚠️ Offsets for this month have not been purchased yet.';

        const text =
          `*命 Your AI Carbon — ${periodMonth}*\n\n` +
          `You used ~${(summary.total_tokens / 1000).toFixed(0)}k tokens this month.\n` +
          `That's *${summary.total_kg_co2e.toFixed(3)} kg CO₂e* — about the same as driving *${km} km* by car.\n\n` +
          `*Breakdown:*\n\`\`\`${toolLines}\`\`\`\n\n` +
          `${offsetLine}\n\n` +
          `View full history → https://dashboard.kokoro.vnext.vn/carbon`;

        await this.slack.chat.postMessage({
          channel: user.slack_user_id,
          text,
        });
      } catch (err) {
        this.logger.warn(`DM failed for user ${user.user_id}: ${err}`);
      }
    }
  }
}
