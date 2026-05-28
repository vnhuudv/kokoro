import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import type {
  CreatePostDto, LogActionDto,
  TamPost, TamAction,
  TamLeaderboardEntry, TamUserBadge, TamUserPoints,
  TamCategory,
} from './tam.types';

@Injectable()
export class TamService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async createPost(tenantId: string, authorUserId: string, dto: CreatePostDto): Promise<TamPost> {
    const { rows } = await this.pool.query<TamPost>(
      `INSERT INTO tam_posts
         (tenant_id, author_user_id, title, description, cover_image_url, external_url, source, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING
         id,
         tenant_id        AS "tenantId",
         author_user_id   AS "authorUserId",
         title,
         description,
         cover_image_url  AS "coverImageUrl",
         external_url     AS "externalUrl",
         source,
         category,
         created_at       AS "createdAt",
         updated_at       AS "updatedAt",
         0::int           AS "actionCount",
         0::int           AS "totalPoints"`,
      [
        tenantId,
        authorUserId,
        dto.title,
        dto.description,
        dto.coverImageUrl ?? null,
        dto.externalUrl ?? null,
        dto.source ?? 'user',
        dto.category,
      ],
    );
    return rows[0];
  }

  async listPosts(
    tenantId: string,
    category?: string,
    page = 1,
    limit = 20,
  ): Promise<TamPost[]> {
    const offset = (page - 1) * limit;
    const categoryClause = category ? `AND p.category = $2` : '';
    const limitParam = category ? '$3' : '$2';
    const offsetParam = category ? '$4' : '$3';
    const queryParams = category
      ? [tenantId, category, limit, offset]
      : [tenantId, limit, offset];

    const { rows } = await this.pool.query<TamPost>(
      `SELECT
         p.id,
         p.tenant_id       AS "tenantId",
         p.author_user_id  AS "authorUserId",
         p.title,
         p.description,
         p.cover_image_url AS "coverImageUrl",
         p.external_url    AS "externalUrl",
         p.source,
         p.category,
         p.created_at      AS "createdAt",
         p.updated_at      AS "updatedAt",
         COUNT(a.id)::int  AS "actionCount",
         (COUNT(a.id) * 20)::int AS "totalPoints"
       FROM tam_posts p
       LEFT JOIN tam_actions a ON a.post_id = p.id
       WHERE p.tenant_id = $1 ${categoryClause}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      queryParams,
    );
    return rows;
  }

  async getPost(id: string, tenantId: string): Promise<TamPost> {
    const { rows } = await this.pool.query<TamPost>(
      `SELECT
         p.id,
         p.tenant_id       AS "tenantId",
         p.author_user_id  AS "authorUserId",
         p.title,
         p.description,
         p.cover_image_url AS "coverImageUrl",
         p.external_url    AS "externalUrl",
         p.source,
         p.category,
         p.created_at      AS "createdAt",
         p.updated_at      AS "updatedAt",
         COUNT(a.id)::int  AS "actionCount",
         (COUNT(a.id) * 20)::int AS "totalPoints"
       FROM tam_posts p
       LEFT JOIN tam_actions a ON a.post_id = p.id
       WHERE p.id = $1 AND p.tenant_id = $2
       GROUP BY p.id`,
      [id, tenantId],
    );
    if (rows.length === 0) throw new NotFoundException('Post not found');
    return rows[0];
  }

  async getPostActions(postId: string, tenantId: string): Promise<TamAction[]> {
    const { rows } = await this.pool.query<TamAction>(
      `SELECT
         id,
         tenant_id            AS "tenantId",
         post_id              AS "postId",
         user_id              AS "userId",
         action_type          AS "actionType",
         external_url_clicked AS "externalUrlClicked",
         amount_logged        AS "amountLogged",
         hours_logged         AS "hoursLogged",
         note,
         created_at           AS "createdAt"
       FROM tam_actions
       WHERE post_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [postId, tenantId],
    );
    return rows;
  }

  async logAction(
    postId: string,
    tenantId: string,
    userId: string,
    dto: LogActionDto,
  ): Promise<TamAction> {
    const post = await this.getPost(postId, tenantId);

    const client = await this.pool.connect();
    let action: TamAction;
    let isFirstAction: boolean;

    try {
      await client.query('BEGIN');

      const { rows: existing } = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM tam_actions
         WHERE post_id = $1 AND tenant_id = $2 AND user_id = $3`,
        [postId, tenantId, userId],
      );
      isFirstAction = parseInt(existing[0].count, 10) === 0;

      const { rows } = await client.query<TamAction>(
        `INSERT INTO tam_actions
           (tenant_id, post_id, user_id, action_type, external_url_clicked,
            amount_logged, hours_logged, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           id,
           tenant_id            AS "tenantId",
           post_id              AS "postId",
           user_id              AS "userId",
           action_type          AS "actionType",
           external_url_clicked AS "externalUrlClicked",
           amount_logged        AS "amountLogged",
           hours_logged         AS "hoursLogged",
           note,
           created_at           AS "createdAt"`,
        [
          tenantId, postId, userId, dto.actionType,
          dto.externalUrlClicked ?? false,
          dto.amountLogged ?? null,
          dto.hoursLogged ?? null,
          dto.note ?? null,
        ],
      );
      action = rows[0];
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // Award all points outside the transaction, then evaluate badges once
    await this.awardPointsNoEval(tenantId, userId, 20, `${dto.actionType} on post ${postId}`, post.category);
    if (isFirstAction) {
      await this.awardPointsNoEval(tenantId, userId, 10, `First action bonus on post ${postId}`, post.category);
    }
    if (dto.externalUrlClicked) {
      await this.recordLinkClickNoEval(postId, tenantId, userId, post.category);
    }

    // Single badge evaluation for all accumulated points
    await this.evaluateBadges(tenantId, userId);

    return action;
  }

  async recordLinkClick(
    postId: string,
    tenantId: string,
    userId: string,
    category: string,
  ): Promise<void> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO tam_link_clicks (tenant_id, post_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, post_id, user_id) DO NOTHING`,
      [tenantId, postId, userId],
    );
    if (rowCount && rowCount > 0) {
      await this.awardPoints(tenantId, userId, 5, `Link click on post ${postId}`, category);
    }
  }

  private async recordLinkClickNoEval(
    postId: string,
    tenantId: string,
    userId: string,
    category: string,
  ): Promise<void> {
    const { rowCount } = await this.pool.query(
      `INSERT INTO tam_link_clicks (tenant_id, post_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, post_id, user_id) DO NOTHING`,
      [tenantId, postId, userId],
    );
    if (rowCount && rowCount > 0) {
      await this.awardPointsNoEval(tenantId, userId, 5, `Link click on post ${postId}`, category);
    }
  }

  async awardPoints(
    tenantId: string,
    userId: string,
    points: number,
    reason: string,
    category?: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO tam_points (tenant_id, user_id, points, reason, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, points, reason, category ?? null],
    );
    await this.evaluateBadges(tenantId, userId);
  }

  private async awardPointsNoEval(
    tenantId: string,
    userId: string,
    points: number,
    reason: string,
    category?: string,
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO tam_points (tenant_id, user_id, points, reason, category)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, points, reason, category ?? null],
    );
  }

  async evaluateBadges(tenantId: string, userId: string): Promise<void> {
    const { rows: badges } = await this.pool.query<{
      id: string;
      thresholdPoints: number;
      categoryFilter: string | null;
    }>(
      `SELECT id, threshold_points AS "thresholdPoints", category_filter AS "categoryFilter"
       FROM tam_badges`,
    );

    const { rows: totalRow } = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS total
       FROM tam_points WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    const totalPoints = parseInt(totalRow[0].total, 10);

    const { rows: categoryRows } = await this.pool.query<{ category: string; total: string }>(
      `SELECT category, COALESCE(SUM(points), 0)::text AS total
       FROM tam_points WHERE tenant_id = $1 AND user_id = $2 AND category IS NOT NULL
       GROUP BY category`,
      [tenantId, userId],
    );
    const categoryPoints: Record<string, number> = {};
    for (const row of categoryRows) {
      categoryPoints[row.category] = parseInt(row.total, 10);
    }

    const { rows: alreadyAwarded } = await this.pool.query<{ badgeId: string }>(
      `SELECT badge_id AS "badgeId" FROM tam_user_badges
       WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    const awardedIds = new Set(alreadyAwarded.map(r => r.badgeId));

    for (const badge of badges) {
      if (awardedIds.has(badge.id)) continue;
      const relevantPoints = badge.categoryFilter
        ? (categoryPoints[badge.categoryFilter] ?? 0)
        : totalPoints;
      if (relevantPoints >= badge.thresholdPoints) {
        await this.pool.query(
          `INSERT INTO tam_user_badges (tenant_id, user_id, badge_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [tenantId, userId, badge.id],
        );
      }
    }
  }

  async getLeaderboard(tenantId: string, limit = 10): Promise<TamLeaderboardEntry[]> {
    const { rows } = await this.pool.query<TamLeaderboardEntry>(
      `SELECT
         p.user_id                  AS "userId",
         SUM(p.points)::int         AS "totalPoints",
         COUNT(DISTINCT ub.id)::int AS "badgeCount"
       FROM tam_points p
       LEFT JOIN tam_user_badges ub
         ON ub.tenant_id = p.tenant_id AND ub.user_id = p.user_id
       WHERE p.tenant_id = $1
       GROUP BY p.user_id
       ORDER BY "totalPoints" DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    return rows;
  }

  async getUserBadges(userId: string, tenantId: string): Promise<TamUserBadge[]> {
    interface UserBadgeRow {
      id: string;
      tenantId: string;
      userId: string;
      awardedAt: Date;
      badgeId: string;
      badgeName: string;
      badgeDescription: string;
      badgeIconUrl: string | null | undefined;
      badgeThresholdPoints: number;
      badgeCategoryFilter: TamCategory | null | undefined;
    }
    const { rows } = await this.pool.query<UserBadgeRow>(
      `SELECT
         ub.id,
         ub.tenant_id         AS "tenantId",
         ub.user_id           AS "userId",
         ub.awarded_at        AS "awardedAt",
         b.id                 AS "badgeId",
         b.name               AS "badgeName",
         b.description        AS "badgeDescription",
         b.icon_url           AS "badgeIconUrl",
         b.threshold_points   AS "badgeThresholdPoints",
         b.category_filter    AS "badgeCategoryFilter"
       FROM tam_user_badges ub
       JOIN tam_badges b ON b.id = ub.badge_id
       WHERE ub.tenant_id = $1 AND ub.user_id = $2
       ORDER BY ub.awarded_at ASC`,
      [tenantId, userId],
    );
    return rows.map(r => ({
      id: r.id,
      tenantId: r.tenantId,
      userId: r.userId,
      awardedAt: r.awardedAt,
      badge: {
        id: r.badgeId,
        name: r.badgeName,
        description: r.badgeDescription,
        iconUrl: r.badgeIconUrl ?? undefined,
        thresholdPoints: r.badgeThresholdPoints,
        categoryFilter: r.badgeCategoryFilter ?? undefined,
      },
    }));
  }

  async getUserPoints(userId: string, tenantId: string): Promise<TamUserPoints> {
    const { rows } = await this.pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS total
       FROM tam_points WHERE tenant_id = $1 AND user_id = $2`,
      [tenantId, userId],
    );
    return { userId, totalPoints: parseInt(rows[0].total, 10) };
  }
}
