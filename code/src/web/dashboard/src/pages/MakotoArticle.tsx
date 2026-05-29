// code/src/web/dashboard/src/pages/MakotoArticle.tsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMakotoFetch, MAKOTO_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';
import { colors, pageWrap, primaryButton, radius } from '../theme';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const USER_ID = 'U-DASHBOARD-USER';

interface MakotoPost {
  id: string;
  authorUserId: string;
  title: string;
  body: string;
  postType: 'official' | 'article';
  metricRefs: string[] | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface MakotoComment {
  id: string;
  authorUserId: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  replies: MakotoComment[];
}

function Avatar({ initials, size = 28, accent = colors.primaryLight, textColor = colors.primary }: {
  initials: string; size?: number; accent?: string; textColor?: string;
}) {
  return (
    <div style={{ width: size, height: size, background: accent, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: textColor }}>
      {initials}
    </div>
  );
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: MakotoComment;
  onReply: (parentId: string, body: string) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleReply() {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    await onReply(comment.id, replyBody.trim());
    setReplyBody('');
    setReplyOpen(false);
    setSubmitting(false);
  }

  return (
    <div key={comment.id} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
      <Avatar initials={comment.authorUserId.slice(0, 2).toUpperCase()} />
      <div style={{ flex: 1 }}>
        <div style={{ background: colors.canvasBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: '10px 12px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textBody }}>
            {comment.authorUserId} <span style={{ fontWeight: 400, color: colors.textMuted }}>· {new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: 13, color: colors.textBody, marginTop: 4 }}>{comment.body}</div>
        </div>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, paddingLeft: 4 }}>
          <span style={{ color: colors.primary, cursor: 'pointer', fontWeight: 600 }} onClick={() => setReplyOpen(v => !v)}>Reply</span>
        </div>

        {replyOpen && (
          <div style={{ marginTop: 8 }}>
            <textarea
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '8px 12px', borderRadius: radius.input, border: `1px solid ${colors.border}`, fontSize: 13, fontFamily: 'inherit', color: colors.textBody, resize: 'vertical', boxSizing: 'border-box' as const }}
              placeholder="Write a reply…"
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReplyOpen(false)}
                style={{ padding: '4px 12px', borderRadius: radius.button, border: `1px solid ${colors.border}`, background: colors.canvasBg, color: colors.textBody, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleReply}
                disabled={submitting}
                style={{ ...primaryButton, padding: '4px 12px', fontSize: 12 }}
              >
                {submitting ? 'Posting…' : 'Reply'}
              </button>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies.map(reply => (
          <div key={reply.id} style={{ marginTop: 10, marginLeft: 20 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <Avatar initials={reply.authorUserId.slice(0, 2).toUpperCase()} size={24} />
              <div style={{ flex: 1 }}>
                <div style={{ background: colors.canvasBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: '8px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.textBody }}>
                    {reply.authorUserId}{' '}
                    <span style={{ fontWeight: 400, color: colors.textMuted }}>
                      · {new Date(reply.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: colors.textBody, marginTop: 4 }}>{reply.body}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MakotoArticle() {
  const { id } = useParams<{ id: string }>();
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [comments, setComments] = useState<MakotoComment[] | null>(null);

  const { data: post, loading: postLoading, error: postError } =
    useMakotoFetch<MakotoPost>(`/posts/${id}?tenantId=${TENANT_ID}`);

  const { data: fetchedComments, loading: commentsLoading } =
    useMakotoFetch<MakotoComment[]>(`/posts/${id}/comments?tenantId=${TENANT_ID}`);

  const displayComments = comments ?? fetchedComments ?? [];
  const displayLiked = liked ?? false;
  const displayLikeCount = likeCount ?? (post?.likeCount ?? 0);

  async function handleToggleLike() {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(
      `${MAKOTO_BASE}/posts/${id}/reactions?tenantId=${TENANT_ID}&userId=${encodeURIComponent(USER_ID)}`,
      { method: 'POST', headers },
    );
    if (res.ok) {
      const data = await res.json() as { liked: boolean; count: number };
      setLiked(data.liked);
      setLikeCount(data.count);
    }
  }

  async function handleAddComment(parentId?: string, body?: string) {
    const commentText = body ?? commentBody.trim();
    if (!commentText) return;
    const token = getToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    setSubmittingComment(true);
    const res = await fetch(
      `${MAKOTO_BASE}/posts/${id}/comments?tenantId=${TENANT_ID}&userId=${encodeURIComponent(USER_ID)}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ body: commentText, ...(parentId ? { parentId } : {}) }),
      },
    );
    if (res.ok) {
      const newComment = await res.json() as MakotoComment;
      setComments(prev => {
        const base = prev ?? fetchedComments ?? [];
        if (parentId) {
          return base.map(c =>
            c.id === parentId ? { ...c, replies: [...c.replies, newComment] } : c,
          );
        }
        return [...base, newComment];
      });
      if (!body) setCommentBody('');
    }
    setSubmittingComment(false);
  }

  if (postLoading) return <div style={{ padding: 40, color: colors.textMuted }}>Loading…</div>;
  if (postError || !post) return <div style={{ padding: 40, color: colors.danger }}>Post not found.</div>;

  return (
    <main style={{ ...pageWrap }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        <Link to="/makoto" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: 20 }}>
          ← Back to Makoto
        </Link>

        {/* Post type badge + title */}
        <div style={{ marginBottom: 20 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: colors.primary, background: colors.primaryLight, padding: '2px 7px', borderRadius: radius.badge, textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>
            {post.postType === 'official' ? '📌 Official' : '📝 Article'}
          </span>
          <h2 style={{ margin: '10px 0 6px', fontSize: 20, fontWeight: 800, color: colors.textHeading }}>{post.title}</h2>
          <div style={{ fontSize: 12, color: colors.textSecondary }}>{post.authorUserId} · {new Date(post.createdAt).toLocaleDateString()}</div>

          {post.postType === 'official' && post.metricRefs && post.metricRefs.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {post.metricRefs.map(ref => (
                <span key={ref} style={{
                  fontSize: 11, fontWeight: 600, color: colors.primary,
                  background: colors.primaryLight, border: `1px solid ${colors.primaryRing}`,
                  padding: '2px 8px', borderRadius: radius.pill,
                }}>
                  📊 {ref === 'en_score' ? 'En Score' : ref === 'carbon' ? 'Carbon' : ref}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Article body */}
        <div style={{ fontSize: 14, color: colors.textBody, lineHeight: 1.7, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${colors.border}`, whiteSpace: 'pre-wrap' }}>
          {post.body}
        </div>

        {/* Reactions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <button
            onClick={handleToggleLike}
            style={{
              ...primaryButton,
              background: displayLiked ? colors.primary : colors.cardBg,
              color:      displayLiked ? '#fff'          : colors.primary,
              border:     `1px solid ${colors.primary}`,
            }}
          >
            👍 Like · {displayLikeCount}
          </button>
          <span style={{ fontSize: 13, color: colors.textMuted }}>💬 {displayComments.length} comments</span>
        </div>

        {/* Comments */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 16 }}>Comments</div>

          {commentsLoading && <div style={{ fontSize: 13, color: colors.textMuted }}>Loading comments…</div>}

          {displayComments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              onReply={(parentId, body) => handleAddComment(parentId, body)}
            />
          ))}

          {/* Add comment */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Avatar initials={USER_ID.slice(0, 2).toUpperCase()} />
            <div style={{ flex: 1 }}>
              <div style={{ marginTop: 16 }}>
                <textarea
                  value={commentBody}
                  onChange={e => setCommentBody(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: radius.input, border: `1px solid ${colors.border}`, fontSize: 13, fontFamily: 'inherit', color: colors.textBody, resize: 'vertical', boxSizing: 'border-box' as const }}
                />
                <div style={{ textAlign: 'right', marginTop: 6 }}>
                  <button
                    onClick={() => handleAddComment()}
                    disabled={submittingComment || !commentBody.trim()}
                    style={{ ...primaryButton, background: submittingComment ? colors.primaryRing : colors.primary }}
                  >
                    {submittingComment ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
