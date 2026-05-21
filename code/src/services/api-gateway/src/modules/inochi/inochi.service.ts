// code/src/services/api-gateway/src/modules/inochi/inochi.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import {
  calculateCarbon,
  toKmEquivalent,
  estimateOffsetCost,
  PersonalCarbonSummary,
  CompanyCarbonSummary,
  OffsetRecord,
  CreateOffsetDto,
  ToolBreakdown,
} from './inochi.types';

const DEFAULT_TENANT = 'a0000000-0000-0000-0000-000000000001';

@Injectable()
export class InochiService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async getPersonalCarbon(userId: string, periodMonth: string): Promise<PersonalCarbonSummary> {
    const periodDate = `${periodMonth}-01`;

    const { rows: usageRows } = await this.pool.query<{
      tool: string; provider: string; source: string;
      input_tokens: string; output_tokens: string;
    }>(
      `SELECT tool, provider, source, input_tokens, output_tokens
       FROM ai_usage_logs
       WHERE user_id = $1 AND period_month = $2`,
      [userId, periodDate],
    );

    const { rows: offsetRows } = await this.pool.query<{ covered: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM carbon_offsets
         WHERE tenant_id = $1
           AND covers_from <= $2
           AND covers_to >= $2
       ) AS covered`,
      [DEFAULT_TENANT, periodDate],
    );

    const tools: ToolBreakdown[] = usageRows.map(r => {
      const input = Number(r.input_tokens);
      const output = Number(r.output_tokens);
      return {
        tool: r.tool,
        provider: r.provider,
        source: r.source as ToolBreakdown['source'],
        input_tokens: input,
        output_tokens: output,
        carbon_kg: calculateCarbon(input, output, r.provider),
      };
    });

    const total_kg_co2e = tools.reduce((sum, t) => sum + t.carbon_kg, 0);
    const total_tokens = tools.reduce((sum, t) => sum + t.input_tokens + t.output_tokens, 0);

    return {
      period_month: periodMonth,
      total_kg_co2e: Math.round(total_kg_co2e * 10_000_000) / 10_000_000,
      total_tokens,
      km_equivalent: toKmEquivalent(total_kg_co2e),
      offset_cost_usd_estimate: estimateOffsetCost(total_kg_co2e),
      tools,
      offset_covered: offsetRows[0]?.covered ?? false,
    };
  }

  async getPersonalHistory(userId: string): Promise<PersonalCarbonSummary[]> {
    const { rows } = await this.pool.query<{ period_month: string }>(
      `SELECT DISTINCT to_char(period_month, 'YYYY-MM') AS period_month
       FROM ai_usage_logs
       WHERE user_id = $1
       ORDER BY period_month DESC
       LIMIT 12`,
      [userId],
    );
    return Promise.all(rows.map(r => this.getPersonalCarbon(userId, r.period_month)));
  }

  async getCompanyCarbon(periodMonth: string): Promise<CompanyCarbonSummary> {
    const periodDate = `${periodMonth}-01`;

    const { rows: usageRows } = await this.pool.query<{
      provider: string; input_tokens: string; output_tokens: string;
    }>(
      `SELECT provider, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens
       FROM ai_usage_logs
       WHERE tenant_id = $1 AND period_month = $2
       GROUP BY provider`,
      [DEFAULT_TENANT, periodDate],
    );

    const { rows: offsetRows } = await this.pool.query<{
      id: string; kg_co2e: string; provider: string; cert_id: string;
      cost_usd: string; purchased_at: string; covers_from: string;
      covers_to: string; notes: string;
    }>(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets
       WHERE tenant_id = $1
       ORDER BY purchased_at DESC`,
      [DEFAULT_TENANT],
    );

    const total_kg_co2e = usageRows.reduce((sum, r) => {
      return sum + calculateCarbon(Number(r.input_tokens), Number(r.output_tokens), r.provider);
    }, 0);
    const total_tokens = usageRows.reduce(
      (sum, r) => sum + Number(r.input_tokens) + Number(r.output_tokens), 0,
    );

    const offsets: OffsetRecord[] = offsetRows.map(r => ({
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    }));

    const offset_covered = offsets.some(
      o => o.covers_from <= `${periodMonth}-01` && o.covers_to >= `${periodMonth}-01`,
    );

    return {
      period_month: periodMonth,
      total_kg_co2e: Math.round(total_kg_co2e * 100) / 100,
      total_tokens,
      teams: [],
      offsets,
      offset_covered,
    };
  }

  async createOffset(dto: CreateOffsetDto, recordedBy: string): Promise<OffsetRecord> {
    const { rows } = await this.pool.query<{ id: string }>(
      `INSERT INTO carbon_offsets
         (tenant_id, kg_co2e, provider, cert_id, cost_usd, purchased_at, covers_from, covers_to, notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        DEFAULT_TENANT,
        dto.kg_co2e,
        dto.provider,
        dto.cert_id ?? null,
        dto.cost_usd ?? null,
        dto.purchased_at,
        dto.covers_from,
        dto.covers_to,
        dto.notes ?? null,
        recordedBy,
      ],
    );
    return this.getOffsetById(rows[0].id);
  }

  async listOffsets(): Promise<OffsetRecord[]> {
    const { rows } = await this.pool.query(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets WHERE tenant_id = $1 ORDER BY purchased_at DESC`,
      [DEFAULT_TENANT],
    );
    return rows.map(r => ({
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    }));
  }

  private async getOffsetById(id: string): Promise<OffsetRecord> {
    const { rows } = await this.pool.query(
      `SELECT id, kg_co2e, provider, cert_id, cost_usd,
              purchased_at::text, covers_from::text, covers_to::text, notes
       FROM carbon_offsets WHERE id = $1`,
      [id],
    );
    const r = rows[0];
    return {
      id: r.id,
      kg_co2e: Number(r.kg_co2e),
      provider: r.provider,
      cert_id: r.cert_id ?? null,
      cost_usd: r.cost_usd ? Number(r.cost_usd) : null,
      purchased_at: r.purchased_at,
      covers_from: r.covers_from,
      covers_to: r.covers_to,
      notes: r.notes ?? null,
    };
  }
}
