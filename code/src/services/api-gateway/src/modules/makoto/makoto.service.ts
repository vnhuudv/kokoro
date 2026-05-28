import {
  Injectable, Inject,
  NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { DB_POOL } from '../database/database.module';
import type {
  CreatePostDto, AddCommentDto,
  MakotoPost, MakotoComment, MakotoReactionResult,
} from './makoto.types';

@Injectable()
export class MakotoService {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async listPosts(tenantId: string, type?: string, page = 1, limit = 20): Promise<MakotoPost[]> {
    const offset = (page - 1) * limit;
    const typeClause = type ? `AND p.post_type = $2` : '';
    const limitParam  = type ? '$3' : '$2';
    const offsetParam = type ? '$4' : '$3';
    const params = type
      ? [tenantId, type, limit, offset]
      : [tenantId, limit, offset];

    const { rows } = await this.pool.query<MakotoPost>(
      `SELECT
         p.id,
         p.tenant_id       AS "tenantId",
         p.author_user_id  AS "authorUserId",
         p.title,
         p.body,
         p.post_type       AS "postType",
         p.metric_refs     AS "metricRefs",
         p.created_at      AS "createdAt",
         p.updated_at      AS "updatedAt",
         COUNT(DISTINCT r.id)::int AS "likeCount",
         COUNT(DISTINCT c.id)::int AS "commentCount"
       FROM makoto_posts p
       LEFT JOIN makoto_reactions r ON r.post_id = p.id AND r.reaction_type = 'like'
       LEFT JOIN makoto_comments  c ON c.post_id = p.id
       WHERE p.tenant_id = $1 ${typeClause}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      params,
    );
    return rows;
  }

  async createPost(tenantId: string, authorUserId: string, dto: CreatePostDto): Promise<MakotoPost> {
    const { rows } = await this.pool.query<MakotoPost>(
      `INSERT INTO makoto_posts (tenant_id, author_user_id, title, body, post_type, metric_refs)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         tenant_id       AS "tenantId",
         author_user_id  AS "authorUserId",
         title,
         body,
         post_type       AS "postType",
         metric_refs     AS "metricRefs",
         created_at      AS "createdAt",
         updated_at      AS "updatedAt",
         0::int          AS "likeCount",
         0::int          AS "commentCount"`,
      [
        tenantId,
        authorUserId,
        dto.title,
        dto.body,
        dto.postType,
        dto.metricRefs ? JSON.stringify(dto.metricRefs) : null,
      ],
    );
    return rows[0];
  }

  async getPost(id: string, tenantId: string): Promise<MakotoPost> {
    const { rows } = await this.pool.query<MakotoPost>(
      `SELECT
         p.id,
         p.tenant_id       AS "tenantId",
         p.author_user_id  AS "authorUserId",
         p.title,
         p.body,
         p.post_type       AS "postType",
         p.metric_refs     AS "metricRefs",
         p.created_at      AS "createdAt",
         p.updated_at      AS "updatedAt",
         COUNT(DISTINCT r.id)::int AS "likeCount",
         COUNT(DISTINCT c.id)::int AS "commentCount"
       FROM makoto_posts p
       LEFT JOIN makoto_reactions r ON r.post_id = p.id AND r.reaction_type = 'like'
       LEFT JOIN makoto_comments  c ON c.post_id = p.id
       WHERE p.id = $1 AND p.tenant_id = $2
       GROUP BY p.id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new NotFoundException('Post not found');
    return rows[0];
  }

  async getComments(postId: string, tenantId: string): Promise<MakotoComment[]> {
    type CommentRow = Omit<MakotoComment, 'replies'>;
    const { rows } = await this.pool.query<CommentRow>(
      `SELECT
         id,
         tenant_id       AS "tenantId",
         post_id         AS "postId",
         parent_id       AS "parentId",
         author_user_id  AS "authorUserId",
         body,
         created_at      AS "createdAt"
       FROM makoto_comments
       WHERE post_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC`,
      [postId, tenantId],
    );

    const byId = new Map<string, MakotoComment>();
    for (const row of rows) byId.set(row.id, { ...row, replies: [] });

    const topLevel: MakotoComment[] = [];
    for (const comment of byId.values()) {
      if (comment.parentId === null) {
        topLevel.push(comment);
      } else {
        const parent = byId.get(comment.parentId!);
        if (parent) parent.replies.push(comment);
      }
    }
    return topLevel;
  }

  async addComment(
    postId: string,
    tenantId: string,
    userId: string,
    dto: AddCommentDto,
  ): Promise<MakotoComment> {
    await this.getPost(postId, tenantId); // throws 404 if post doesn't exist/belong to tenant

    if (dto.parentId) {
      const { rows } = await this.pool.query<{ parentId: string | null }>(
        `SELECT parent_id AS "parentId" FROM makoto_comments WHERE id = $1 AND tenant_id = $2`,
        [dto.parentId, tenantId],
      );
      if (rows.length === 0) throw new NotFoundException('Parent comment not found');
      if (rows[0].parentId !== null) throw new BadRequestException('Cannot reply to a reply');
    }

    type CommentRow = Omit<MakotoComment, 'replies'>;
    const { rows } = await this.pool.query<CommentRow>(
      `INSERT INTO makoto_comments (tenant_id, post_id, parent_id, author_user_id, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         id,
         tenant_id       AS "tenantId",
         post_id         AS "postId",
         parent_id       AS "parentId",
         author_user_id  AS "authorUserId",
         body,
         created_at      AS "createdAt"`,
      [tenantId, postId, dto.parentId ?? null, userId, dto.body],
    );
    return { ...rows[0], replies: [] };
  }

  async deleteComment(commentId: string, tenantId: string, userId: string): Promise<void> {
    const { rows } = await this.pool.query<{ authorUserId: string }>(
      `SELECT author_user_id AS "authorUserId"
       FROM makoto_comments WHERE id = $1 AND tenant_id = $2`,
      [commentId, tenantId],
    );
    if (rows.length === 0) throw new NotFoundException('Comment not found');
    if (rows[0].authorUserId !== userId) throw new ForbiddenException("Cannot delete another user's comment");
    await this.pool.query(
      `DELETE FROM makoto_comments WHERE id = $1 AND tenant_id = $2`,
      [commentId, tenantId],
    );
  }

  async toggleReaction(postId: string, tenantId: string, userId: string): Promise<MakotoReactionResult> {
    await this.getPost(postId, tenantId); // throws 404 if post doesn't exist/belong to tenant

    const { rowCount } = await this.pool.query(
      `INSERT INTO makoto_reactions (tenant_id, post_id, user_id, reaction_type)
       VALUES ($1, $2, $3, 'like')
       ON CONFLICT (tenant_id, post_id, user_id, reaction_type) DO NOTHING`,
      [tenantId, postId, userId],
    );

    const inserted = rowCount === 1;
    if (!inserted) {
      await this.pool.query(
        `DELETE FROM makoto_reactions
         WHERE tenant_id = $1 AND post_id = $2 AND user_id = $3 AND reaction_type = 'like'`,
        [tenantId, postId, userId],
      );
    }

    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM makoto_reactions
       WHERE tenant_id = $1 AND post_id = $2 AND reaction_type = 'like'`,
      [tenantId, postId],
    );
    return { liked: inserted, count: parseInt(rows[0].count, 10) };
  }
}
