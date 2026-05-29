// code/src/web/dashboard/src/pages/TamFeed.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTamFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, primaryButton, secondaryButton, radius } from '../theme';

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
    <main style={{ ...pageWrap }}>
      <div style={{ maxWidth: 1060, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: colors.tamLight, color: colors.tam,
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              borderRadius: radius.pill, marginBottom: 8,
            }}>
              心 TÂM PILLAR
            </div>
            <h1 style={{ ...pageTitle, margin: 0 }}>Tâm 心 — Social Impact</h1>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              Earn points by taking action on causes your organisation supports
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link
              to="/tam/leaderboard"
              style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              🏆 Leaderboard
            </Link>
            <Link
              to="/tam/new"
              style={{ ...primaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.tam, color: '#fff' }}
            >
              + New Post
            </Link>
          </div>
        </div>

        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {FILTER_CATEGORIES.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveCategory(f.key)}
              style={{
                padding: '5px 14px', borderRadius: radius.pill, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: activeCategory === f.key ? colors.tam    : colors.cardBg,
                color:      activeCategory === f.key ? '#fff'         : colors.textSecondary,
                boxShadow:  activeCategory === f.key ? 'none'         : `0 0 0 1px ${colors.border}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Layout: list + sidebar */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* Left: post list */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {postsLoading && (
              <div style={{ padding: 40, color: colors.textMuted, textAlign: 'center' }}>Loading…</div>
            )}

            {!postsLoading && postsError && (
              <div style={{ padding: 40, color: colors.danger, background: '#fef2f2', borderRadius: radius.card, fontSize: 14 }}>
                Failed to load posts. Please try refreshing the page.
              </div>
            )}

            {!postsLoading && (!posts || posts.length === 0) && (
              <div style={{ ...card, textAlign: 'center', padding: '48px 24px', color: colors.textMuted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🌱</div>
                <div style={{ fontSize: 15, color: colors.textSecondary, marginBottom: 8 }}>
                  No posts yet. Be the first to share a cause.
                </div>
                <Link
                  to="/tam/new"
                  style={{ color: colors.tam, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}
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
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 12 }}>
                🏆 Top Contributors
              </div>

              {lbLoading && (
                <div style={{ fontSize: 13, color: colors.textMuted, padding: '8px 0' }}>Loading…</div>
              )}

              {!lbLoading && (!leaderboard || leaderboard.length === 0) && (
                <div style={{ fontSize: 13, color: colors.textMuted, padding: '8px 0' }}>
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
                    borderBottom: idx < leaderboard.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: idx < 3 ? ['#f59e0b', '#94a3b8', '#cd7c2f'][idx] : colors.border,
                    color: idx < 3 ? '#fff' : colors.textSecondary,
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{
                    flex: 1, fontSize: 12, color: colors.textBody,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {entry.userId.slice(0, 8)}…
                  </span>
                  <span style={{ fontSize: 11, color: colors.tam, fontWeight: 600, flexShrink: 0 }}>
                    {entry.totalPoints}pts
                  </span>
                  {entry.badgeCount > 0 && (
                    <span style={{ fontSize: 10, color: colors.textMuted, flexShrink: 0 }}>
                      🎖{entry.badgeCount}
                    </span>
                  )}
                </div>
              ))}

              <Link
                to="/tam/leaderboard"
                style={{
                  display: 'block', marginTop: 14, fontSize: 12,
                  color: colors.tam, fontWeight: 600, textDecoration: 'none',
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
    <div style={{ ...card, marginBottom: 12, borderLeft: `3px solid ${CATEGORY_COLORS[post.category] ?? colors.tam}`, display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 20px' }}>
      {/* Thumbnail */}
      <div style={{
        width: 80, height: 80, borderRadius: radius.card, flexShrink: 0,
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
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: radius.badge,
            background: `${color}22`,
            color,
          }}>
            {label}
          </span>
          <span style={{ fontSize: 11, color: colors.textMuted }}>
            {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: colors.textBody, marginBottom: 4 }}>
          {post.title}
        </div>

        <div style={{
          fontSize: 13, color: colors.textSecondary, lineHeight: 1.5, marginBottom: 10,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        } as React.CSSProperties}>
          {post.description}
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: colors.textMuted, alignItems: 'center' }}>
          <span>⚡ {post.actionCount} actions</span>
          <span style={{ color: colors.tam, fontWeight: 700 }}>+{post.totalPoints} pts</span>
          {post.externalUrl && (
            <a
              href={post.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginLeft: 'auto', color: colors.primary, fontWeight: 600, textDecoration: 'none', fontSize: 12 }}
            >
              Take action →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
