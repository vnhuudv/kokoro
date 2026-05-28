// code/src/web/dashboard/src/pages/TamFeed.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTamFetch } from '../hooks/useDashboard';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

interface TamPost {
  id: string;
  authorUserId: string;
  title: string;
  description: string;
  coverImageUrl?: string;
  externalUrl?: string;
  category: string;
  actionCount: number;
  totalPoints: number;
  createdAt: string;
}

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  badgeCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  climate:  '#0ea5e9',
  poverty:  '#ec4899',
  disaster: '#f97316',
  other:    '#8b5cf6',
};

const CATEGORY_LABELS: Record<string, string> = {
  climate:  '🌍 Climate',
  poverty:  '💛 Poverty',
  disaster: '🌊 Disaster',
  other:    '🤝 Other',
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  climate:  'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
  poverty:  'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
  disaster: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
  other:    'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

const FILTER_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'climate', label: '🌍 Climate' },
  { key: 'poverty', label: '💛 Poverty' },
  { key: 'disaster', label: '🌊 Disaster' },
  { key: 'other', label: '🤝 Other' },
];

export function TamFeed() {
  const [activeCategory, setActiveCategory] = useState('all');

  const postsPath =
    activeCategory === 'all'
      ? `/posts?tenantId=${TENANT_ID}`
      : `/posts?tenantId=${TENANT_ID}&category=${activeCategory}`;

  const { data: posts, loading: postsLoading, error: postsError } = useTamFetch<TamPost[]>(postsPath);
  const { data: leaderboard, loading: lbLoading } = useTamFetch<LeaderboardEntry[]>(
    `/leaderboard?tenantId=${TENANT_ID}&limit=10`,
  );

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1060, margin: '0 auto', padding: '32px 40px' }}>

        {/* Page header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            縁 Tâm — Social Impact Feed
          </h1>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Causes your team cares about. Take action, earn points.
          </div>
        </div>

        {/* Top bar: filters + action buttons */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, marginBottom: 24, flexWrap: 'wrap',
        }}>
          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FILTER_CATEGORIES.map(cat => {
              const active = activeCategory === cat.key;
              const color = cat.key === 'all' ? '#0ea5a0' : CATEGORY_COLORS[cat.key];
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${active ? color : '#e2e8f0'}`,
                    background: active ? color : '#fff',
                    color: active ? '#fff' : '#64748b',
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              to="/tam/leaderboard"
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#0ea5a0',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🏆 Leaderboard
            </Link>
            <Link
              to="/tam/new"
              style={{
                padding: '7px 16px',
                borderRadius: 6,
                border: 'none',
                background: '#0ea5a0',
                color: '#fff',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              + New Post
            </Link>
          </div>
        </div>

        {/* Layout B: list + sidebar */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* Left: post list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {postsLoading && (
              <div style={{ padding: 40, color: '#64748b', textAlign: 'center' }}>Loading…</div>
            )}

            {!postsLoading && postsError && (
              <div style={{ padding: 40, color: '#ef4444', background: '#fef2f2', borderRadius: 8, fontSize: 14 }}>
                Failed to load posts. Please try refreshing the page.
              </div>
            )}

            {!postsLoading && (!posts || posts.length === 0) && (
              <div style={{
                ...card,
                textAlign: 'center',
                padding: '48px 24px',
                color: '#94a3b8',
              }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 15, color: '#64748b', marginBottom: 8 }}>
                  No posts yet. Be the first to share a cause.
                </div>
                <Link
                  to="/tam/new"
                  style={{ color: '#0ea5a0', fontWeight: 600, textDecoration: 'none', fontSize: 14 }}
                >
                  + Create a post
                </Link>
              </div>
            )}

            {!postsLoading && posts && posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* Right: sidebar leaderboard */}
          <div style={{ width: 220, flexShrink: 0 }}>
            <div style={{ ...card, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 12 }}>
                🏆 Top Contributors
              </div>

              {lbLoading && (
                <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>Loading…</div>
              )}

              {!lbLoading && (!leaderboard || leaderboard.length === 0) && (
                <div style={{ fontSize: 13, color: '#94a3b8', padding: '8px 0' }}>
                  No data yet.
                </div>
              )}

              {!lbLoading && leaderboard && leaderboard.map((entry, idx) => (
                <div
                  key={entry.userId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '7px 0',
                    borderBottom: idx < leaderboard.length - 1 ? '1px solid #f1f5f9' : 'none',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: idx < 3 ? ['#f59e0b', '#94a3b8', '#cd7c2f'][idx] : '#e2e8f0',
                    color: idx < 3 ? '#fff' : '#64748b',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 12, color: '#334155',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {entry.userId.slice(0, 8)}…
                  </span>
                  <span style={{ fontSize: 11, color: '#0ea5a0', fontWeight: 600, flexShrink: 0 }}>
                    {entry.totalPoints}pts
                  </span>
                  {entry.badgeCount > 0 && (
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                      🎖{entry.badgeCount}
                    </span>
                  )}
                </div>
              ))}

              <Link
                to="/tam/leaderboard"
                style={{
                  display: 'block', marginTop: 14, fontSize: 12,
                  color: '#0ea5a0', fontWeight: 600, textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                View full leaderboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ---------- PostCard ---------- */

function PostCard({ post }: { post: TamPost }) {
  const color = CATEGORY_COLORS[post.category] ?? CATEGORY_COLORS.other;
  const label = CATEGORY_LABELS[post.category] ?? '🤝 Other';
  const gradient = CATEGORY_GRADIENTS[post.category] ?? CATEGORY_GRADIENTS.other;

  return (
    <div style={{
      ...card,
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
      padding: '16px 20px',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: 80, height: 80, borderRadius: 8, flexShrink: 0,
        background: post.coverImageUrl ? undefined : gradient,
        backgroundImage: post.coverImageUrl ? `url(${post.coverImageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {!post.coverImageUrl && (
          <span style={{ fontSize: 28 }}>
            {post.category === 'climate'  ? '🌍' :
             post.category === 'poverty'  ? '💛' :
             post.category === 'disaster' ? '🌊' : '🤝'}
          </span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 12,
            background: `${color}18`, color,
          }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>
          {post.title}
        </div>

        <div style={{
          fontSize: 13, color: '#64748b', lineHeight: 1.5, marginBottom: 10,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {post.description}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 14 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              ✅ {post.actionCount} actions
            </span>
            <span style={{ fontSize: 12, color: '#0ea5a0', fontWeight: 600 }}>
              +{post.totalPoints} pts
            </span>
          </div>

          {post.externalUrl && (
            <a
              href={post.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12, fontWeight: 600, color: '#fff',
                background: '#0ea5a0', borderRadius: 6,
                padding: '5px 12px', textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Take Action →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
