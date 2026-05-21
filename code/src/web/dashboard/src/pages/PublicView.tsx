import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';

interface PublicSummary {
  miscomm_start: number; miscomm_end: number;
  fluency_start: number; fluency_end: number;
  satisfaction_start: number; satisfaction_end: number;
  case_count: number;
  quote: string;
  trend: { month: string; miscomm_rate: number; formal_fluency: number }[];
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
};

function ResultRow({ label, start, end, unit = '%' }: { label: string; start: number; end: number; unit?: string }) {
  const delta = end - start;
  const pct = Math.round((Math.abs(delta) / start) * 100);
  const positive = delta > 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9', fontSize: 15 }}>
      <span style={{ color: '#334155' }}>{label}</span>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#94a3b8' }}>{start}{unit} → {end}{unit}</span>
        <span style={{ fontWeight: 700, color: positive ? '#0ea5a0' : '#0ea5a0' }}>
          {positive ? '+' : ''}{delta.toFixed(1)}{unit} ({positive ? '+' : '-'}{pct}%)
        </span>
      </span>
    </div>
  );
}

export function PublicView() {
  const { data, loading } = useFetch<PublicSummary>('/public');
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 760 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Kokoro Pilot — Results Overview</h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>8-month pilot · Vnext Japan · VN ↔ JP teams</div>
      </div>

      {/* Results */}
      <div style={{ ...card, borderLeft: '4px solid #0ea5a0', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Key outcomes</div>
        {data && <>
          <ResultRow label="Miscommunication rate reduced"    start={data.miscomm_start}       end={data.miscomm_end}       />
          <ResultRow label="Formal fluency improved"         start={data.fluency_start}        end={data.fluency_end}       />
          <ResultRow label="User satisfaction"               start={data.satisfaction_start}   end={data.satisfaction_end}  unit="" />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', fontSize: 15 }}>
            <span style={{ color: '#334155' }}>Teaching cases generated</span>
            <span style={{ fontWeight: 700, color: '#0ea5a0' }}>{data.case_count}</span>
          </div>
        </>}
      </div>

      {/* Trend chart */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Fluency trend over pilot</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.trend ?? []}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Line type="monotone" dataKey="miscomm_rate"   name="Miscomm rate"  stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="formal_fluency" name="Formal fluency" stroke="#0ea5a0" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quote */}
      {data?.quote && (
        <blockquote style={{ margin: 0, padding: '16px 20px', background: '#f0fdfb', borderLeft: '4px solid #0ea5a0', borderRadius: 4, color: '#334155', fontSize: 15, fontStyle: 'italic' }}>
          "{data.quote}"
          <footer style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'normal' }}>— Research lead, endline review</footer>
        </blockquote>
      )}
    </main>
  );
}
