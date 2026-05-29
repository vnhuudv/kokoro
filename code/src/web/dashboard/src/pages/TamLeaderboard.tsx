// code/src/web/dashboard/src/pages/TamLeaderboard.tsx
import { Link } from 'react-router-dom';
import { useTamFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, radius } from '../theme';

interface LeaderboardEntry {
  userId:      string;
  totalPoints: number;
  badgeCount:  number;
}

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

const PODIUM_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
const PODIUM_LABELS = ['1st', '2nd', '3rd'];
const PODIUM_SIZES  = [80, 64, 64];

export function TamLeaderboard() {
  const { data, loading, error } = useTamFetch<LeaderboardEntry[]>(
    `/leaderboard?tenantId=${TENANT_ID}&limit=50`,
  );

  if (loading) return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: colors.textMuted }}>Loading…</span></div>;

  if (error) return <div style={{ ...pageWrap }}><span style={{ color: colors.danger }}>Failed to load leaderboard: {error}</span></div>;

  const top3 = (data ?? []).slice(0, 3);
  const rest  = (data ?? []).slice(3);

  if (!data || data.length === 0) {
    return (
      <main style={pageWrap}>
        <Link to="/tam" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>← Back to feed</Link>
        <div style={{ marginTop: 48, color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>No leaderboard data yet.</div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      {/* Header */}
      <Link to="/tam" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: 16 }}>← Back to feed</Link>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.tamLight, color: colors.tam, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
        心 TÂM PILLAR
      </div>
      <h1 style={{ ...pageTitle, marginBottom: 4 }}>Impact Leaderboard</h1>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20 }}>Top contributors this quarter · Vnext Japan</div>

      {/* Podium */}
      {top3.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 16 }}>🏆 Top 3</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
              const rank     = visualIdx === 1 ? 0 : visualIdx === 0 ? 1 : 2;
              const initials = entry.userId.slice(0, 2).toUpperCase();
              const size     = PODIUM_SIZES[rank];
              return (
                <div key={entry.userId} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: size, height: size, borderRadius: '50%',
                    background: PODIUM_COLORS[rank], display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: rank === 0 ? 20 : 16, fontWeight: 800, color: '#fff',
                    border: `3px solid ${rank === 0 ? '#fbbf24' : colors.border}`,
                  }}>{initials}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.textBody, marginTop: 8 }}>{entry.userId}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: PODIUM_COLORS[rank], marginTop: 2 }}>{entry.totalPoints}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>pts</div>
                  <div style={{ marginTop: 4, background: `${PODIUM_COLORS[rank]}22`, color: PODIUM_COLORS[rank], fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: radius.pill }}>
                    {PODIUM_LABELS[rank]}
                  </div>
                  {entry.badgeCount > 0 && (
                    <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>🏅 {entry.badgeCount} badge{entry.badgeCount > 1 ? 's' : ''}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Full Rankings</div>
          {rest.map((entry, i) => {
            const rank     = i + 4;
            const initials = entry.userId.slice(0, 2).toUpperCase();
            const maxPts   = data[0]?.totalPoints ?? 1;
            return (
              <div key={entry.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, width: 24, textAlign: 'center', flexShrink: 0 }}>#{rank}</div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.tamLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: colors.tam, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textBody, marginBottom: 4 }}>{entry.userId}</div>
                  <div style={{ height: 4, background: colors.tamLight, borderRadius: radius.pill, overflow: 'hidden' }}>
                    <div style={{ width: `${(entry.totalPoints / maxPts) * 100}%`, height: '100%', background: colors.tam, borderRadius: radius.pill }} />
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.tam, minWidth: 48, textAlign: 'right' }}>{entry.totalPoints}</div>
                {entry.badgeCount > 0 && (
                  <div style={{ fontSize: 11, color: colors.textMuted, minWidth: 40, textAlign: 'right' }}>🏅 {entry.badgeCount}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
