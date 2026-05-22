import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  borderLeft: '4px solid #0ea5a0',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
};

function MetricCard({ label, current, baseline, delta, unit = '%' }: {
  label: string; current: number; baseline: number; delta: number; unit?: string;
}) {
  const isGood = label === 'Miscomm rate' ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? '↑' : '↓';
  const color = isGood ? '#0ea5a0' : '#f59e0b';
  return (
    <div style={card}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: '#1e293b' }}>{current}{unit}</div>
      <div style={{ fontSize: 13, color, marginTop: 6 }}>
        {arrow} {Math.abs(delta)}{unit} vs {baseline}{unit} baseline
      </div>
    </div>
  );
}

interface TeamMetrics {
  miscomm_rate: { current: number; baseline: number; delta: number };
  formal_fluency: { current: number; baseline: number; delta: number };
  user_satisfaction: { current: number; baseline: number; delta: number };
  case_count: number;
  active_users: number;
}

interface TrendPoint { month: string; miscomm_rate: number; formal_fluency: number; }
interface Case { case_id: string; intent_label: string; register: string; suggestion_used: boolean; risk_category: string | null; }

const MIN_ACTIVE_USERS = 5;

export function TeamView() {
  const { data: metrics, loading: ml } = useFetch<TeamMetrics>('/team');
  const { data: trend, loading: tl } = useFetch<TrendPoint[]>('/trend');
  const { data: cases, loading: cl } = useFetch<Case[]>('/cases');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  if (ml || tl || cl) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  const belowThreshold = (metrics?.active_users ?? 0) < MIN_ACTIVE_USERS;

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1e293b' }}>Team Fluency Dashboard</h1>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>Vnext Japan · M3 → M6 · {metrics?.active_users} active participants</span>
      </div>

      {/* Anonymisation warning */}
      {belowThreshold && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#92400e' }}>
          Detailed metrics require at least {MIN_ACTIVE_USERS} active participants. Currently showing {metrics?.active_users} — some breakdowns are suppressed.
        </div>
      )}

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {metrics && <>
          <MetricCard label="Miscomm rate"      {...metrics.miscomm_rate} />
          <MetricCard label="Formal fluency"    {...metrics.formal_fluency} />
          <MetricCard label="User satisfaction" {...metrics.user_satisfaction} unit="" />
        </>}
      </div>

      {/* Chart + case count */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, marginBottom: 28 }}>
        <div style={{ ...card, borderLeft: 'none' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Fluency Trend</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="miscomm_rate"   name="Miscomm rate"    stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="formal_fluency" name="Formal fluency"   stroke="#0ea5a0" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...card, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#0ea5a0' }}>{metrics?.case_count}</div>
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>anonymised teaching cases</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>contributed since M3</div>
        </div>
      </div>

      {/* Recent cases */}
      <div style={{ ...card, borderLeft: 'none' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Recent Teaching Cases</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Case</th>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Register</th>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Flag</th>
              <th style={{ textAlign: 'left', padding: '6px 0', color: '#64748b', fontWeight: 500 }}>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {(cases ?? []).map(c => (
              <>
                <tr
                  key={c.case_id}
                  style={{ borderBottom: expandedCase === c.case_id ? 'none' : '1px solid #f1f5f9', cursor: 'pointer' }}
                  onClick={() => setExpandedCase(expandedCase === c.case_id ? null : c.case_id)}
                >
                  <td style={{ padding: '10px 0', color: '#334155' }}>
                    <span style={{ marginRight: 6, fontSize: 12, color: '#94a3b8' }}>{expandedCase === c.case_id ? '▾' : '▸'}</span>
                    {c.intent_label}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: 4 }}>
                      {c.register}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    {c.risk_category ? (
                      <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: 4 }}>
                        {c.risk_category}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 0', color: c.suggestion_used ? '#0ea5a0' : '#94a3b8' }}>
                    {c.suggestion_used ? 'Suggestion used' : 'Dismissed'}
                  </td>
                </tr>
                {expandedCase === c.case_id && (
                  <tr key={`${c.case_id}-detail`}>
                    <td colSpan={4} style={{ padding: '0 0 14px 20px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 6 }}>
                        <strong>Case ID:</strong> {c.case_id.split('-')[0]}…
                        {c.risk_category && <> · <strong>Cultural risk:</strong> {c.risk_category}</>}
                        {' '}· <strong>Result:</strong> {c.suggestion_used ? 'participant adopted the suggested phrasing' : 'participant sent original message'}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
