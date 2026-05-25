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

  async markAttendance(sessionId: string, tenantId: string, slackUserId: string): Promise<void> {
    const { rows } = await this.pool.query<{ id: string }>(
      `SELECT id FROM nominication_sessions WHERE id = $1 AND tenant_id = $2`,
      [sessionId, tenantId],
    );
    if (rows.length === 0) throw new NotFoundException('Session not found');

    await this.pool.query(
      `INSERT INTO nominication_attendees (session_id, slack_user_id)
       VALUES ($1, $2)
       ON CONFLICT (session_id, slack_user_id) DO NOTHING`,
      [sessionId, slackUserId],
    );

    await this.pool.query(
      `UPDATE nominication_sessions
       SET status = 'completed'
       WHERE id = $1
         AND status = 'pending'
         AND scheduled_at < NOW() - INTERVAL '24 hours'`,
      [sessionId],
    );
  }

  async getPendingNudges(tenantId: string): Promise<NominicationNudge[]> {
    const { rows } = await this.pool.query<NominicationNudge>(
      `SELECT
         id,
         tenant_id               AS "tenantId",
         channel_id              AS "channelId",
         target_slack_user_id    AS "targetSlackUserId",
         reason,
         friction_score          AS "frictionScore",
         status,
         created_at              AS "createdAt",
         responded_at            AS "respondedAt"
       FROM nominication_nudges
       WHERE tenant_id = $1
         AND status IN ('pending')
       ORDER BY created_at ASC`,
      [tenantId],
    );
    return rows;
  }

  async updateNudgeStatus(id: string, tenantId: string, status: NudgeStatus): Promise<void> {
    await this.pool.query(
      `UPDATE nominication_nudges
       SET status = $1,
           responded_at = CASE WHEN $1 IN ('accepted', 'dismissed', 'expired') THEN NOW() ELSE responded_at END
       WHERE id = $2 AND tenant_id = $3`,
      [status, id, tenantId],
    );
  }
}
