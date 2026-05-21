import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';

interface CarbonFootprint {
  total_kg_co2e: number;
  llm_kg_co2e: number;
  infrastructure_kg_co2e: number;
  offset_cost_usd_estimate: number;
  offset_recommended: string;
  notes: string[];
}

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

function HeroStat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
      <div style={{ fontSize: 52, fontWeight: 800, color: '#0ea5a0', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginTop: 10 }}>{label}</div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

function ResultRow({ label, start, end, unit = '%', goodWhenDown = false }: {
  label: string; start: number; end: number; unit?: string; goodWhenDown?: boolean;
}) {
  const delta = end - start;
  const pct = Math.round((Math.abs(delta) / start) * 100);
  const isGood = goodWhenDown ? delta < 0 : delta > 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #f1f5f9', fontSize: 15 }}>
      <span style={{ color: '#334155' }}>{label}</span>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#94a3b8' }}>{start}{unit} → {end}{unit}</span>
        <span style={{ fontWeight: 700, color: isGood ? '#0ea5a0' : '#f59e0b' }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit} ({delta > 0 ? '+' : '−'}{pct}%)
        </span>
      </span>
    </div>
  );
}

const PILLARS = [
  { symbol: '心', name: 'Kokoro', principle: 'Cultural-Religious Literacy', desc: 'Know the places you touch.' },
  { symbol: '命', name: 'Inochi', principle: 'Stewardship of Nature', desc: 'Treat the Earth as ancestor, not asset.' },
  { symbol: '心', name: 'Tâm', principle: 'Dignity of People', desc: 'Dignity is owed, not earned.' },
  { symbol: '縁', name: 'En', principle: 'Service to Community', desc: 'Bound, not contracted.' },
  { symbol: '誠', name: 'Makoto', principle: 'Transparency & Accountability', desc: 'Sincerity made checkable.' },
];

export function PublicView() {
  const { data, loading } = useFetch<PublicSummary>('/public');
  const { data: carbon } = useFetch<CarbonFootprint>('/inochi/carbon');
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  const miscommReduction = data ? Math.round((data.miscomm_start - data.miscomm_end) / data.miscomm_start * 100) : 0;
  const fluencyGain = data ? Math.round((data.fluency_end - data.fluency_start) / data.fluency_start * 100) : 0;

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>Kokoro Pilot — Results Overview</h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>8-month pilot · Vnext Japan · VN ↔ JP teams</div>
      </div>

      {/* Hero stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16, borderTop: '4px solid #0ea5a0' }}>
        {data && <>
          <HeroStat
            value={`−${miscommReduction}%`}
            label="Miscommunication"
            sub={`${data.miscomm_start}% → ${data.miscomm_end}%`}
          />
          <div style={{ borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
            <HeroStat
              value={`+${fluencyGain}%`}
              label="Formal fluency"
              sub={`${data.fluency_start}% → ${data.fluency_end}%`}
            />
          </div>
          <HeroStat
            value={String(data.case_count)}
            label="Teaching cases"
            sub="anonymised, since M3"
          />
        </>}
      </div>

      {/* Detailed outcomes */}
      <div style={{ ...card, borderLeft: '4px solid #0ea5a0', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>Key outcomes</div>
        {data && <>
          <ResultRow label="Miscommunication rate reduced"    start={data.miscomm_start}     end={data.miscomm_end}     goodWhenDown />
          <ResultRow label="Formal fluency improved"         start={data.fluency_start}      end={data.fluency_end}     />
          <ResultRow label="User satisfaction"               start={data.satisfaction_start} end={data.satisfaction_end} unit="" />
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
        <blockquote style={{ margin: '0 0 28px', padding: '16px 20px', background: '#f0fdfb', borderLeft: '4px solid #0ea5a0', borderRadius: 4, color: '#334155', fontSize: 15, fontStyle: 'italic' }}>
          "{data.quote}"
          <footer style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'normal' }}>— Research lead, endline review</footer>
        </blockquote>
      )}

      {/* Inochi carbon card */}
      {carbon && (
        <div style={{ ...card, borderLeft: '4px solid #34d399', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>命 Inochi · Pilot Carbon Footprint</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>AI infrastructure measured from real token usage</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{carbon.total_kg_co2e} kg</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>CO₂e · pilot total</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 16 }}>
            <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{carbon.llm_kg_co2e} kg</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>LLM API calls</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{carbon.infrastructure_kg_co2e} kg</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Devices + hosting</div>
            </div>
            <div style={{ background: '#f0fdf4', padding: '10px 14px', borderRadius: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>~${carbon.offset_cost_usd_estimate}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Est. offset cost</div>
            </div>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
            Offset via: {carbon.offset_recommended}
          </div>
        </div>
      )}

      {/* Five Pillars */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4 }}>The Five Pillars Framework</div>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16 }}>The wisdom methodology underlying the Kokoro project</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {PILLARS.map(p => (
            <div key={p.name} style={{ background: '#fff', borderRadius: 8, padding: '18px 12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)', textAlign: 'center', borderTop: '3px solid #0ea5a0' }}>
              <div style={{ fontSize: 30, color: '#0ea5a0', marginBottom: 8 }}>{p.symbol}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{p.principle}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
