// code/src/web/dashboard/src/pages/PublicView.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, radius } from '../theme';

interface CarbonFootprint {
  total_kg_co2e:          number;
  llm_kg_co2e:            number;
  infrastructure_kg_co2e: number;
  offset_cost_usd_estimate: number;
  offset_recommended:     string;
}

interface PublicSummary {
  miscomm_start: number; miscomm_end: number;
  fluency_start: number; fluency_end: number;
  satisfaction_start: number; satisfaction_end: number;
  case_count: number;
  quote: string;
  trend: { month: string; miscomm_rate: number; formal_fluency: number }[];
}

const PILLARS = [
  { symbol: '心', name: 'Kokoro',  principle: 'Cultural-Religious Literacy', desc: 'Know the places you touch.',           accent: colors.kokoro  },
  { symbol: '命', name: 'Inochi',  principle: 'Stewardship of Nature',       desc: 'Treat the Earth as ancestor, not asset.', accent: colors.carbon  },
  { symbol: '心', name: 'Tâm',    principle: 'Dignity of People',           desc: 'Dignity is owed, not earned.',         accent: colors.tam     },
  { symbol: '縁', name: 'En',     principle: 'Service to Community',        desc: 'Bound, not contracted.',               accent: colors.en      },
  { symbol: '誠', name: 'Makoto', principle: 'Transparency & Accountability',desc: 'Sincerity made checkable.',            accent: colors.primary },
];

function ResultRow({ label, start, end, unit = '%', goodWhenDown = false }: {
  label: string; start: number; end: number; unit?: string; goodWhenDown?: boolean;
}) {
  const delta  = end - start;
  const pct    = Math.round((Math.abs(delta) / start) * 100);
  const isGood = goodWhenDown ? delta < 0 : delta > 0;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13 }}>
      <span style={{ color: colors.textBody }}>{label}</span>
      <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: colors.textMuted }}>{start}{unit} → {end}{unit}</span>
        <span style={{ fontWeight: 700, color: isGood ? colors.carbon : colors.warning }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}{unit} ({delta > 0 ? '+' : '−'}{pct}%)
        </span>
      </span>
    </div>
  );
}

export function PublicView() {
  const { data, loading }  = useFetch<PublicSummary>('/public');
  const { data: carbon }   = useFetch<CarbonFootprint>('/inochi/carbon');

  if (loading) return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: colors.textMuted }}>Loading…</span>
  </div>;

  const miscommReduction = data ? Math.round((data.miscomm_start - data.miscomm_end) / data.miscomm_start * 100) : 0;
  const fluencyGain      = data ? Math.round((data.fluency_end - data.fluency_start) / data.fluency_start * 100) : 0;

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
            PUBLIC VIEW
          </div>
          <h1 style={pageTitle}>Kokoro Pilot — Results Overview</h1>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>8-month pilot · Vnext Japan · VN ↔ JP teams</div>
        </div>
      </div>

      {/* Hero stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 12, borderTop: `4px solid ${colors.primary}` }}>
        {data && <>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: colors.carbon, lineHeight: 1 }}>−{miscommReduction}%</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBody, marginTop: 10 }}>Miscommunication</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{data.miscomm_start}% → {data.miscomm_end}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: colors.primary, lineHeight: 1 }}>+{fluencyGain}%</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBody, marginTop: 10 }}>Formal Fluency</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>{data.fluency_start}% → {data.fluency_end}%</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: colors.en, lineHeight: 1 }}>{data.case_count}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: colors.textBody, marginTop: 10 }}>Teaching Cases</div>
            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>anonymised, since M3</div>
          </div>
        </>}
      </div>

      {/* Key outcomes */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 2 }}>Key Outcomes</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>Baseline → endline comparison</div>
        {data && <>
          <ResultRow label="Miscommunication rate reduced"    start={data.miscomm_start}     end={data.miscomm_end}     goodWhenDown />
          <ResultRow label="Formal fluency improved"         start={data.fluency_start}      end={data.fluency_end}     />
          <ResultRow label="User satisfaction"               start={data.satisfaction_start} end={data.satisfaction_end} unit="" />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 13 }}>
            <span style={{ color: colors.textBody }}>Teaching cases generated</span>
            <span style={{ fontWeight: 700, color: colors.primary }}>{data.case_count}</span>
          </div>
        </>}
      </div>

      {/* Trend chart */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Fluency Trend — Pilot Duration</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data?.trend ?? []}>
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.textMuted }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: colors.textMuted }} unit="%" />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend />
            <Line type="monotone" dataKey="miscomm_rate"   name="Miscomm rate"   stroke={colors.warning}  strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="formal_fluency" name="Formal fluency"  stroke={colors.primary}  strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quote */}
      {data?.quote && (
        <blockquote style={{ margin: '0 0 12px', padding: '16px 20px', background: colors.primaryLight, borderLeft: `4px solid ${colors.primary}`, borderRadius: radius.button, color: colors.textBody, fontSize: 14, fontStyle: 'italic' }}>
          "{data.quote}"
          <footer style={{ marginTop: 8, fontSize: 11, color: colors.textMuted, fontStyle: 'normal' }}>— Research lead, endline review</footer>
        </blockquote>
      )}

      {/* Carbon card */}
      {carbon && (
        <div style={{ ...card, borderTop: `4px solid ${colors.carbon}`, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 2 }}>命 Inochi · Pilot Carbon Footprint</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>AI infrastructure measured from real token usage</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: colors.carbon }}>{carbon.total_kg_co2e} kg</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>CO₂e · pilot total</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { label: 'LLM API calls',     value: `${carbon.llm_kg_co2e} kg` },
              { label: 'Devices + hosting', value: `${carbon.infrastructure_kg_co2e} kg` },
              { label: 'Est. offset cost',  value: `~$${carbon.offset_cost_usd_estimate}` },
            ].map(s => (
              <div key={s.label} style={{ background: colors.carbonLight, padding: '10px 14px', borderRadius: radius.button }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.carbon }}>{s.value}</div>
                <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Five Pillars */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 4 }}>The Five Pillars Framework</div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>The wisdom methodology underlying the Kokoro project</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {PILLARS.map(p => (
            <div key={p.name} style={{ ...card, textAlign: 'center', borderTop: `3px solid ${p.accent}`, padding: '16px 10px' }}>
              <div style={{ fontSize: 28, color: p.accent, marginBottom: 8 }}>{p.symbol}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.textBody, marginBottom: 4 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: colors.textSecondary, marginBottom: 6 }}>{p.principle}</div>
              <div style={{ fontSize: 10, color: colors.textMuted, fontStyle: 'italic' }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
