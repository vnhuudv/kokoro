// code/src/web/dashboard/src/pages/MakotoArticle.tsx
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMakotoFetch, MAKOTO_BASE } from '../hooks/useDashboard';
import { getToken } from '../hooks/useAuth';

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  fontSize: 14,
  color: '#1e293b',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  outline: 'none',
  background: '#fff',
  resize: 'vertical',
};

function Avatar({ userId }: { userId: string }) {
  const initials = userId.slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 28, height: 28, background: '#e2e8f0', borderRadius: '50%',
      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, color: '#64748b', fontWeight: 600,
    }}>
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
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 10 }}>
        <Avatar userId={comment.authorUserId} />
        <div style={{ flex: 1 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
              {comment.authorUserId}{' '}
              <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                · {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{comment.body}</div>
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4, paddingLeft: 4 }}>
            <button
              onClick={() => setReplyOpen(v => !v)}
              style={{ background: 'none', border: 'none', color: '#0ea5a0', cursor: 'pointer', fontSize: 12, padding: 0 }}
            >
              Reply
            </button>
          </div>

          {replyOpen && (
            <div style={{ marginTop: 8 }}>
              <textarea
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                rows={2}
                style={inputStyle}
                placeholder="Write a reply…"
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setReplyOpen(false)}
                  style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#334155', fontSize: 12, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReply}
                  disabled={submitting}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#0ea5a0', color: '#fff', fontSize: 12, cursor: 'pointer' }}
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
                <div style={{
                  width: 24, height: 24, background: '#e2e8f0', borderRadius: '50%',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#64748b', fontWeight: 600,
                }}>
                  {reply.authorUserId.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                      {reply.authorUserId}{' '}
                      <span style={{ fontWeight: 400, color: '#94a3b8' }}>
                        · {new Date(reply.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: '#334155', marginTop: 4 }}>{reply.body}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
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

  if (postLoading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading…</div>;
  if (postError || !post) return <div style={{ padding: 40, color: '#dc2626' }}>Post not found.</div>;

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px' }}>

        <Link to="/makoto" style={{ fontSize: 13, color: '#0ea5a0', textDecoration: 'none', display: 'inline-block', marginBottom: 16 }}>
          ← Back to Makoto
        </Link>

        {/* Article header */}
        <div style={{ marginBottom: 20 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: post.postType === 'official' ? '#ea580c' : '#0ea5a0',
            textTransform: 'uppercase', letterSpacing: '.05em',
            background: post.postType === 'official' ? '#ffedd5' : '#f0fdfb',
            padding: '2px 7px', borderRadius: 4,
          }}>
            {post.postType === 'official' ? 'Official' : 'Article'}
          </span>
          <h1 style={{ margin: '10px 0 6px', color: '#1e293b', fontSize: 22, fontWeight: 700 }}>{post.title}</h1>
          <div style={{ fontSize: 13, color: '#64748b' }}>
            {post.authorUserId} · {new Date(post.createdAt).toLocaleDateString()}
          </div>
          {post.postType === 'official' && post.metricRefs && post.metricRefs.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {post.metricRefs.map(ref => (
                <span key={ref} style={{
                  fontSize: 11, fontWeight: 600, color: '#0ea5a0',
                  background: '#f0fdfb', border: '1px solid #99f6e4',
                  padding: '2px 8px', borderRadius: 12,
                }}>
                  📊 {ref === 'en_score' ? 'En Score' : ref === 'carbon' ? 'Carbon' : ref}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Article body */}
        <div style={{
          fontSize: 15, color: '#334155', lineHeight: 1.8,
          marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 24,
          whiteSpace: 'pre-wrap',
        }}>
          {post.body}
        </div>

        {/* Reactions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <button
            onClick={handleToggleLike}
            style={{
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer',
              border: `1px solid ${displayLiked ? '#0ea5a0' : '#e2e8f0'}`,
              background: displayLiked ? '#f0fdfb' : '#fff',
              color: displayLiked ? '#0ea5a0' : '#64748b',
              fontSize: 13, fontWeight: displayLiked ? 600 : 400,
            }}
          >
            👍 Like · {displayLikeCount}
          </button>
          <span style={{ fontSize: 13, color: '#94a3b8' }}>
            💬 {displayComments.length} comments
          </span>
        </div>

        {/* Comments */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 14 }}>
            Comments ({displayComments.length})
          </div>

          {commentsLoading && <div style={{ fontSize: 13, color: '#94a3b8' }}>Loading comments…</div>}

          {displayComments.map(c => (
            <CommentItem
              key={c.id}
              comment={c}
              onReply={(parentId, body) => handleAddComment(parentId, body)}
            />
          ))}

          {/* Add comment */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Avatar userId={USER_ID} />
            <div style={{ flex: 1 }}>
              <textarea
                value={commentBody}
                onChange={e => setCommentBody(e.target.value)}
                rows={2}
                style={inputStyle}
                placeholder="Add a comment…"
              />
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                <button
                  onClick={() => handleAddComment()}
                  disabled={submittingComment || !commentBody.trim()}
                  style={{
                    padding: '6px 16px', borderRadius: 6, border: 'none',
                    background: submittingComment ? '#7dd3cf' : '#0ea5a0',
                    color: '#fff', fontSize: 13, cursor: 'pointer',
                  }}
                >
                  {submittingComment ? 'Posting…' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
