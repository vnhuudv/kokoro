import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import type { CreateSessionDto, NominicationSession, NominicationNudge, NudgeStatus } from './nominication.types';

@Injectable()
export class NominicationService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async createSession(tenantId: string, initiatorSlackUserId: string, dto: CreateSessionDto): Promise<NominicationSession> {
    const { rows } = await this.pool.query<NominicationSession>(
      `INSERT INTO nominication_sessions
         (tenant_id, channel_id, initiator_slack_user_id, beer_app_group_id,
          trigger_type, nudge_id, scheduled_at, venue)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING
         id,
         tenant_id               AS "tenantId",
         channel_id              AS "channelId",
         initiator_slack_user_id AS "initiatorSlackUserId",
         beer_app_group_id       AS "beerAppGroupId",
         trigger_type            AS "triggerType",
         nudge_id                AS "nudgeId",
         scheduled_at            AS "scheduledAt",
         status,
         venue,
         created_at              AS "createdAt"`,
      [
        tenantId,
        dto.channelId,
        initiatorSlackUserId,
        dto.beerAppGroupId ?? null,
        dto.triggerType ?? 'manual',
        dto.nudgeId ?? null,
        dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        dto.venue ?? null,
      ],
    );
    return rows[0];
  }

  async getSession(id: string, tenantId: string): Promise<NominicationSession> {
    const { rows } = await this.pool.query<NominicationSession>(
      `SELECT
         id,
         tenant_id               AS "tenantId",
         channel_id              AS "channelId",
         initiator_slack_user_id AS "initiatorSlackUserId",
         beer_app_group_id       AS "beerAppGroupId",
         trigger_type            AS "triggerType",
         nudge_id                AS "nudgeId",
         scheduled_at            AS "scheduledAt",
         status,
         venue,
         created_at              AS "createdAt"
       FROM nominication_sessions
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );
    if (rows.length === 0) throw new NotFoundException('Session not found');
    return rows[0];
  }

  async markAttendance(_sessionId: string, _tenantId: string, _slackUserId: string): Promise<void> {
    throw new Error('not implemented');
  }

  async getPendingNudges(_tenantId: string): Promise<NominicationNudge[]> {
    throw new Error('not implemented');
  }

  async updateNudgeStatus(_id: string, _tenantId: string, _status: NudgeStatus): Promise<void> {
    throw new Error('not implemented');
  }
}
