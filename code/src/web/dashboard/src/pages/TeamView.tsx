// code/src/web/dashboard/src/pages/TeamView.tsx
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, primaryButton, secondaryButton, shadow, radius } from '../theme';

interface TeamMetrics {
  miscomm_rate:       { current: number; baseline: number; delta: number };
  formal_fluency:     { current: number; baseline: number; delta: number };
  user_satisfaction:  { current: number; baseline: number; delta: number };
  case_count:         number;
  active_users:       number;
}
interface TrendPoint { month: string; miscomm_rate: number; formal_fluency: number; }
interface Case {
  case_id: string; intent_label: string; register: string;
  suggestion_used: boolean; risk_category: string | null;
}

const MIN_ACTIVE_USERS = 5;

function KpiCard({ label, value, unit = '', delta, deltaLabel, accent }: {
  label: string; value: number | string; unit?: string;
  delta?: number; deltaLabel?: string; accent: string;
}) {
  const isPositive = (delta ?? 0) >= 0;
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}{unit}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 11, color: isPositive ? colors.success : colors.danger, marginTop: 6 }}>
          {isPositive ? '▲' : '▼'} {Math.abs(delta)}{unit} {deltaLabel ?? ''}
        </div>
      )}
    </div>
  );
}

export function TeamView() {
  const { data: metrics, loading: ml } = useFetch<TeamMetrics>('/team');
  const { data: trend,   loading: tl } = useFetch<TrendPoint[]>('/trend');
  const { data: cases,   loading: cl } = useFetch<Case[]>('/cases');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  // shadow is imported for potential future use
  void shadow;

  if (ml || tl || cl) {
    return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</span>
    </div>;
  }

  const belowThreshold = (metrics?.active_users ?? 0) < MIN_ACTIVE_USERS;

  return (
    <main style={pageWrap}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Team Overview</h1>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Vnext Japan · M3 → M6 · {metrics?.active_users} active participants
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={secondaryButton}>Last 90 days ▾</button>
          <button style={primaryButton}>Export Report</button>
        </div>
      </div>

      {/* Anonymisation warning */}
      {belowThreshold && (
        <div style={{ background: '#fffbeb', border: `1px solid #fde68a`, borderRadius: radius.button, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          Detailed metrics require at least {MIN_ACTIVE_USERS} active participants. Currently {metrics?.active_users} — some breakdowns are suppressed.
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {metrics && <>
          <KpiCard label="Formal Fluency"      value={metrics.formal_fluency.current}    unit="%" delta={metrics.formal_fluency.delta}    deltaLabel="vs baseline" accent={colors.primary} />
          <KpiCard label="Miscomm Rate"        value={metrics.miscomm_rate.current}      unit="%" delta={-metrics.miscomm_rate.delta}     deltaLabel="vs baseline" accent={colors.danger}  />
          <KpiCard label="User Satisfaction"   value={metrics.user_satisfaction.current}      delta={metrics.user_satisfaction.delta}  deltaLabel="vs baseline" accent={colors.en}      />
          <KpiCard label="Teaching Cases"      value={metrics.case_count}                accent={colors.kokoro} />
          <KpiCard label="Active Participants" value={metrics.active_users}              accent={colors.tam}   />
        </>}
      </div>

      {/* Chart + Teaching cases hero */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Fluency trend chart */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 4 }}>Fluency Trend</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 14 }}>All participants · rolling 90 days</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.textMuted }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: colors.textMuted }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="miscomm_rate"   name="Miscomm rate"   stroke={colors.warning}  strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="formal_fluency" name="Formal fluency"  stroke={colors.primary}  strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Teaching cases hero */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: colors.textMuted, marginBottom: 10 }}>Teaching Cases</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: colors.primary, lineHeight: 1 }}>{metrics?.case_count}</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>anonymised cases</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>contributed since M3</div>
          <div style={{ marginTop: 14, background: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: radius.pill }}>
            Growing each week
          </div>
        </div>
      </div>

      {/* Recent cases table */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Recent Teaching Cases</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Case', 'Register', 'Flag', 'Outcome'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 0', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(cases ?? []).map(c => (
              <React.Fragment key={c.case_id}>
                <tr
                  style={{ borderBottom: expandedCase === c.case_id ? 'none' : `1px solid ${colors.border}`, cursor: 'pointer' }}
                  onClick={() => setExpandedCase(expandedCase === c.case_id ? null : c.case_id)}
                >
                  <td style={{ padding: '10px 0', color: colors.textBody }}>
                    <span style={{ marginRight: 6, fontSize: 11, color: colors.textMuted }}>{expandedCase === c.case_id ? '▾' : '▸'}</span>
                    {c.intent_label}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: 11, background: colors.primaryLight, color: colors.primary, padding: '2px 8px', borderRadius: radius.badge, fontWeight: 600 }}>
                      {c.register}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    {c.risk_category
                      ? <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: radius.badge }}>{c.risk_category}</span>
                      : <span style={{ fontSize: 11, color: colors.textMuted }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: 11, color: c.suggestion_used ? colors.carbon : colors.textMuted, fontWeight: c.suggestion_used ? 600 : 400 }}>
                      {c.suggestion_used ? '✓ Suggestion used' : 'Dismissed'}
                    </span>
                  </td>
                </tr>
                {expandedCase === c.case_id && (
                  <tr key={`${c.case_id}-detail`}>
                    <td colSpan={4} style={{ padding: '0 0 12px 20px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, background: colors.canvasBg, padding: '10px 14px', borderRadius: radius.button }}>
                        <strong>Case ID:</strong> {c.case_id.split('-')[0]}…
                        {c.risk_category && <> · <strong>Cultural risk:</strong> {c.risk_category}</>}
                        {' '}· <strong>Result:</strong> {c.suggestion_used ? 'participant adopted the suggested phrasing' : 'participant sent original message'}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
