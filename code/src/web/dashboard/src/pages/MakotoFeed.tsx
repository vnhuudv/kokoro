// code/src/web/dashboard/src/pages/MakotoFeed.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMakotoFetch } from '../hooks/useDashboard';

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

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '14px 16px',
  marginBottom: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,.04)',
};

const officialCard: React.CSSProperties = {
  ...card,
  background: '#fff7ed',
  border: '1px solid #fed7aa',
};

const articleCard: React.CSSProperties = {
  ...card,
  border: '1px solid #e2e8f0',
};

const typeBadge = (postType: 'official' | 'article'): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  color: postType === 'official' ? '#ea580c' : '#0ea5a0',
  textTransform: 'uppercase',
  letterSpacing: '.05em',
  background: postType === 'official' ? '#ffedd5' : '#f0fdfb',
  padding: '2px 7px',
  borderRadius: 4,
});

function MetricChips({ refs }: { refs: string[] }) {
  const labels: Record<string, string> = {
    en_score: 'En Score',
    carbon: 'Carbon',
  };
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {refs.map(ref => (
        <span key={ref} style={{
          fontSize: 11, fontWeight: 600, color: '#0ea5a0',
          background: '#f0fdfb', border: '1px solid #99f6e4',
          padding: '2px 8px', borderRadius: 12,
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
    <div style={isOfficial ? officialCard : articleCard}>
      <span style={typeBadge(post.postType)}>
        {isOfficial ? 'Official' : 'Article'}
      </span>
      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14, marginTop: 6 }}>
        {post.title}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
        {post.authorUserId} · {new Date(post.createdAt).toLocaleDateString()}
      </div>
      {isOfficial && post.metricRefs && post.metricRefs.length > 0 && (
        <MetricChips refs={post.metricRefs} />
      )}
      <div style={{ fontSize: 12, color: '#475569', marginTop: 6, lineHeight: 1.5 }}>
        {post.body.length > 160 ? post.body.slice(0, 160) + '…' : post.body}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
        <span>👍 {post.likeCount}</span>
        <span>💬 {post.commentCount} comments</span>
        <Link to={`/makoto/${post.id}`} style={{ color: '#0ea5a0', textDecoration: 'none' }}>
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

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>Makoto 誠</span>
            <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>Transparency &amp; Knowledge Sharing</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search articles..."
              style={{
                padding: '6px 12px', fontSize: 13, border: '1px solid #e2e8f0',
                borderRadius: 6, outline: 'none', width: 180,
              }}
            />
            {(['all', 'official', 'article'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                  border: '1px solid',
                  borderColor: typeFilter === t ? '#0ea5a0' : '#e2e8f0',
                  background: typeFilter === t ? '#f0fdfb' : '#fff',
                  color: typeFilter === t ? '#0ea5a0' : '#64748b',
                  fontWeight: typeFilter === t ? 600 : 400,
                }}
              >
                {t === 'all' ? 'All' : t === 'official' ? 'Official' : 'Articles'}
              </button>
            ))}
            <Link to="/makoto/new" style={{
              padding: '5px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
              border: 'none', background: '#0ea5a0', color: '#fff',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
            }}>
              + New Article
            </Link>
          </div>
        </div>

        {/* Official announcements */}
        {typeFilter !== 'article' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              📌 Official Announcements
            </div>
            {officialError && <div style={{ color: '#dc2626', fontSize: 13 }}>Failed to load official posts.</div>}
            {filteredOfficial.length === 0 && !officialError && (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>No official announcements yet.</div>
            )}
            {filteredOfficial.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}

        {/* Divider */}
        {typeFilter === 'all' && <div style={{ borderTop: '1px solid #e2e8f0', marginBottom: 20 }} />}

        {/* Employee articles */}
        {typeFilter !== 'official' && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
              📝 Knowledge Base
            </div>
            {articleError && <div style={{ color: '#dc2626', fontSize: 13 }}>Failed to load articles.</div>}
            {filteredArticles.length === 0 && !articleError && (
              <div style={{ fontSize: 13, color: '#94a3b8', padding: '12px 0' }}>No articles yet. Be the first to share!</div>
            )}
            {filteredArticles.map(p => <PostCard key={p.id} post={p} />)}
          </div>
        )}

      </div>
    </main>
  );
}
