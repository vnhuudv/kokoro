// code/src/web/dashboard/src/pages/MakotoFeed.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMakotoFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, radius, primaryButton } from '../theme';

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

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

function MetricChips({ refs }: { refs: string[] }) {
  const labels: Record<string, string> = {
    en_score: 'En Score',
    carbon: 'Carbon',
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 8 }}>
      {refs.map(ref => (
        <span key={ref} style={{
          fontSize: 11, background: colors.primaryLight, color: colors.primary,
          padding: '2px 8px', borderRadius: radius.badge, fontWeight: 600,
        }}>
          📊 {labels[ref] ?? ref}
        </span>
      ))}
    </div>
  );
}

function PostCard({ post }: { post: MakotoPost }) {
  const isOfficial = post.postType === 'official';
  return (
    <div style={{
      ...card,
      marginBottom: 10,
      borderLeft: isOfficial ? `3px solid ${colors.tam}` : `3px solid ${colors.primary}`,
      background: isOfficial ? '#fffbeb' : colors.cardBg,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        {isOfficial ? (
          <span style={{
            fontSize: 10, fontWeight: 700, color: '#ea580c', background: '#ffedd5',
            padding: '2px 7px', borderRadius: radius.badge,
            textTransform: 'uppercase' as const, letterSpacing: '.05em',
          }}>
            📌 Official
          </span>
        ) : (
          <span style={{
            fontSize: 10, fontWeight: 700, color: colors.primary, background: colors.primaryLight,
            padding: '2px 7px', borderRadius: radius.badge,
            textTransform: 'uppercase' as const, letterSpacing: '.05em',
          }}>
            📝 Article
          </span>
        )}
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {post.authorUserId} · {new Date(post.createdAt).toLocaleDateString()}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBody }}>
        {post.title}
      </div>
      {isOfficial && post.metricRefs && post.metricRefs.length > 0 && (
        <MetricChips refs={post.metricRefs} />
      )}
      <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 1.55 }}>
        {post.body.length > 160 ? post.body.slice(0, 160) + '…' : post.body}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: colors.textMuted }}>
        <span>👍 {post.likeCount}</span>
        <span>💬 {post.commentCount} comments</span>
        <Link to={`/makoto/${post.id}`} style={{ marginLeft: 'auto', color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>
          Read more →
        </Link>
      </div>
    </div>
  );
}

export function MakotoFeed() {
  const [typeFilter, setTypeFilter] = useState<'all' | 'official' | 'article'>('all');
  const [search, setSearch] = useState('');

  const officialQuery = `/posts?tenantId=${TENANT_ID}&type=official&limit=10`;
  const articleQuery  = `/posts?tenantId=${TENANT_ID}&type=article&limit=50`;

  // CRITICAL: null-path guard — pass null to skip fetch when filter excludes that type
  const { data: officialPosts, error: officialError } = useMakotoFetch<MakotoPost[]>(
    typeFilter === 'article' ? null : officialQuery,
  );
  const { data: articlePosts, error: articleError } = useMakotoFetch<MakotoPost[]>(
    typeFilter === 'official' ? null : articleQuery,
  );

  const filter = (posts: MakotoPost[] | null) => {
    if (!posts) return [];
    if (!search.trim()) return posts;
    return posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()));
  };

  const filteredOfficial = filter(officialPosts);
  const filteredArticles = filter(articlePosts);

  const filterKeys: { key: 'all' | 'official' | 'article'; label: string }[] = [
    { key: 'all',     label: 'All' },
    { key: 'official', label: 'Official' },
    { key: 'article',  label: 'Articles' },
  ];

  return (
    <main style={{ ...pageWrap }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Page header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: colors.primaryLight, color: colors.primary,
              fontSize: 11, fontWeight: 700, padding: '3px 10px',
              borderRadius: radius.pill, marginBottom: 8,
            }}>
              誠 MAKOTO PILLAR
            </div>
            <h1 style={{ ...pageTitle, margin: 0 }}>Makoto 誠 — Transparency &amp; Knowledge</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              style={{
                padding: '7px 12px', borderRadius: radius.input,
                border: `1px solid ${colors.border}`, fontSize: 12,
                color: colors.textBody, outline: 'none', width: 180,
              }}
            />
            <Link to="/makoto/new" style={{ ...primaryButton, textDecoration: 'none', display: 'inline-flex' }}>
              + New Article
            </Link>
          </div>
        </div>

        {/* Type filter pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {filterKeys.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTypeFilter(key)}
              style={{
                padding: '5px 14px', borderRadius: radius.pill, fontSize: 12, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                background: typeFilter === key ? colors.primary : colors.cardBg,
                color:      typeFilter === key ? '#fff'          : colors.textSecondary,
                boxShadow:  typeFilter === key ? 'none'          : `0 0 0 1px ${colors.border}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Official announcements */}
        {typeFilter !== 'article' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              📌 Official Announcements
            </div>
            {officialError && <div style={{ color: colors.danger, fontSize: 13 }}>Failed to load official posts.</div>}
            {filteredOfficial.length === 0 && !officialError && (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '12px 0' }}>No official announcements yet.</div>
            )}
            {filteredOfficial.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}

        {/* Divider */}
        {typeFilter === 'all' && <div style={{ borderTop: `1px solid ${colors.border}`, marginBottom: 20 }} />}

        {/* Employee articles */}
        {typeFilter !== 'official' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              📝 Knowledge Base
            </div>
            {articleError && <div style={{ color: colors.danger, fontSize: 13 }}>Failed to load articles.</div>}
            {filteredArticles.length === 0 && !articleError && (
              <div style={{ fontSize: 13, color: colors.textMuted, padding: '12px 0' }}>No articles yet. Be the first to share!</div>
            )}
            {filteredArticles.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}

      </div>
    </main>
  );
}
