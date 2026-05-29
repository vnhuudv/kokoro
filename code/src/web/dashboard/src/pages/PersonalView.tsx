import { useState } from 'react';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

interface PersonalMetrics {
  fluency_score:          number;
  fluency_delta:          number;
  annotations_this_month: number;
  suggestions_used:       number;
  suggestions_total:      number;
  patterns_mastered:      string[];
}

function ProgressBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div style={{ background: colors.primaryLight, borderRadius: radius.pill, height: 8, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ width: `${value}%`, height: '100%', background: accent, borderRadius: radius.pill, transition: 'width .4s ease' }} />
    </div>
  );
}

export function PersonalView() {
  const { data, loading } = useFetch<PersonalMetrics>('/personal');
  const [showHistory, setShowHistory] = useState(false);

  if (loading) {
    return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</span>
    </div>;
  }

  const usageRate = data && data.suggestions_total > 0
    ? Math.round((data.suggestions_used / data.suggestions_total) * 100)
    : 0;

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>My Fluency</h1>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Pilot Week 8</div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* Fluency score card */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={labelStyle}>Fluency Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: colors.primary, lineHeight: 1 }}>{data?.fluency_score}%</span>
            {(data?.fluency_delta ?? 0) > 0 && (
              <span style={{ fontSize: 13, color: colors.success, fontWeight: 600 }}>▲ +{data?.fluency_delta}% from start</span>
            )}
          </div>
          <ProgressBar value={data?.fluency_score ?? 0} accent={colors.primary} />
        </div>

        {/* Activity stats */}
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.en }}>{data?.annotations_this_month}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Annotations this month</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.carbon }}>{data?.suggestions_used}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Suggestions used ({usageRate}%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.tam }}>{data?.patterns_mastered.length}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Patterns mastered</div>
          </div>
        </div>

        {/* Suggestion usage bar */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={labelStyle}>Suggestion Adoption Rate</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.carbon }}>{usageRate}%</span>
          </div>
          <ProgressBar value={usageRate} accent={colors.carbon} />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
            {data?.suggestions_used} of {data?.suggestions_total} suggestions adopted
          </div>
        </div>

        {/* Patterns mastered */}
        {(data?.patterns_mastered.length ?? 0) > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 12 }}>Patterns I've mastered</div>
            {(data?.patterns_mastered ?? []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13, color: colors.textBody }}>
                <span style={{ width: 20, height: 20, background: colors.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: colors.primary, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {p}
              </div>
            ))}
          </div>
        )}

        {/* Annotation history */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHistory ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody }}>Annotation History</div>
            <button
              onClick={() => setShowHistory(h => !h)}
              style={{ fontSize: 12, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {showHistory ? 'Hide ▴' : 'View ▾'}
            </button>
          </div>
          {showHistory && (
            <div style={{ fontSize: 13, color: colors.textSecondary, background: colors.canvasBg, padding: '14px 16px', borderRadius: radius.button, textAlign: 'center' }}>
              Full annotation history will be available in the next release.
              <div style={{ marginTop: 8, fontSize: 11, color: colors.textMuted }}>
                Your data is stored privately and not visible to team leads.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
