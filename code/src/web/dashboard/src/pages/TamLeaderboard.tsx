// code/src/web/dashboard/src/pages/TamLeaderboard.tsx
import { Link } from 'react-router-dom';
import { useTamFetch } from '../hooks/useDashboard';

interface LeaderboardEntry {
  userId: string;
  totalPoints: number;
  badgeCount: number;
}

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';
const MEDALS = ['🥇', '🥈', '🥉'];

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

export function TamLeaderboard() {
  const { data, loading, error } = useTamFetch<LeaderboardEntry[]>(
    `/leaderboard?tenantId=${TENANT_ID}&limit=50`,
  );

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  if (error) {
    return (
      <div style={{ padding: 40, color: '#ef4444' }}>
        Failed to load leaderboard: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 40px' }}>
          <Link to="/tam" style={{ fontSize: 14, color: '#0d9488', textDecoration: 'none' }}>
            ← Back to feed
          </Link>
          <div style={{ marginTop: 48, color: '#94a3b8', fontSize: 15, textAlign: 'center' }}>
            No leaderboard data yet.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 40px' }}>
        {/* Back link */}
        <Link
          to="/tam"
          style={{ fontSize: 14, color: '#0d9488', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
        >
          ← Back to feed
        </Link>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
            🏆 Impact Leaderboard
          </h1>
          <div style={{ fontSize: 14, color: '#94a3b8' }}>
            Top contributors ranked by total social-impact points
          </div>
        </div>

        {/* Ranked list */}
        <div style={card}>
          {data.map((entry, index) => {
            const rank = index + 1;
            const isTop3 = rank <= 3;
            const medal = isTop3 ? MEDALS[index] : null;

            return (
              <div
                key={entry.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: 8,
                  marginBottom: 8,
                  background: isTop3 ? '#f0fdfb' : 'transparent',
                  borderBottom: index < data.length - 1 && !isTop3 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                {/* Left: rank + user */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 32,
                    textAlign: 'center',
                    fontSize: medal ? 22 : 14,
                    fontWeight: medal ? undefined : 600,
                    color: '#475569',
                    flexShrink: 0,
                  }}>
                    {medal ?? rank}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b' }}>
                      {entry.userId}
                    </div>
                    {entry.badgeCount > 0 && (
                      <div style={{ fontSize: 12, color: '#0d9488', marginTop: 2 }}>
                        {entry.badgeCount} badge{entry.badgeCount !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: total points */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0d9488', lineHeight: 1 }}>
                    {entry.totalPoints.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
