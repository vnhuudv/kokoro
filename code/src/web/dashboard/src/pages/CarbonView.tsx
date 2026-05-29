// code/src/web/dashboard/src/pages/CarbonView.tsx
import { useInochiFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, radius } from '../theme';

interface ToolBreakdown {
  tool: string; provider: string;
  source: 'gateway' | 'billing_api' | 'estimate';
  input_tokens: number; output_tokens: number; carbon_kg: number;
}

interface PersonalCarbonSummary {
  period_month:             string;
  total_kg_co2e:            number;
  total_tokens:             number;
  km_equivalent:            number;
  offset_cost_usd_estimate: number;
  tools:                    ToolBreakdown[];
  offset_covered:           boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  gateway:     'exact',
  billing_api: 'estimated',
  estimate:    'approximate',
};

export function CarbonView() {
  const { data, loading } = useInochiFetch<PersonalCarbonSummary>('/carbon/me');

  if (loading) return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: colors.textMuted }}>Loading…</span></div>;
  if (!data)   return <div style={{ ...pageWrap }}><span style={{ color: colors.textMuted }}>No carbon data yet.</span></div>;

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.carbonLight, color: colors.carbon, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
          命 INOCHI PILLAR
        </div>
        <h1 style={{ ...pageTitle, color: colors.carbon }}>My AI Carbon · {data.period_month}</h1>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Your AI token footprint this month</div>
      </div>

      {/* Hero stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 12, borderTop: `4px solid ${colors.carbon}` }}>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: colors.carbon, lineHeight: 1 }}>{data.total_kg_co2e.toFixed(3)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginTop: 8 }}>kg CO₂e</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>≈ {data.km_equivalent} km by car</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: colors.carbon, lineHeight: 1 }}>{(data.total_tokens / 1000).toFixed(0)}k</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginTop: 8 }}>tokens</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>across all tools</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: colors.carbon, lineHeight: 1 }}>~${data.offset_cost_usd_estimate.toFixed(2)}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginTop: 8 }}>to offset</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Gold Standard rate</div>
        </div>
      </div>

      {/* Offset status banner */}
      <div style={{ ...card, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12, background: data.offset_covered ? colors.carbonLight : '#fffbeb', border: `1px solid ${data.offset_covered ? '#6ee7b7' : '#fde68a'}` }}>
        <div style={{ fontSize: 24 }}>{data.offset_covered ? '✅' : '⚠️'}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody }}>
            {data.offset_covered ? 'This month is fully offset.' : 'Not yet offset this month.'}
          </div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            {data.offset_covered ? 'Your AI footprint is covered by organisational offsets.' : 'Contact your admin to arrange an offset purchase.'}
          </div>
        </div>
      </div>

      {/* Tool breakdown table */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Tool Breakdown</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Tool', 'Provider', 'Tokens', 'kg CO₂e', 'Source'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 0', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.tools.map((t, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 0', fontWeight: 600, color: colors.textBody }}>{t.tool}</td>
                <td style={{ padding: '10px 0', color: colors.textSecondary }}>{t.provider}</td>
                <td style={{ padding: '10px 0', color: colors.textBody }}>{((t.input_tokens + t.output_tokens) / 1000).toFixed(1)}k</td>
                <td style={{ padding: '10px 0', fontWeight: 700, color: colors.carbon }}>{t.carbon_kg.toFixed(4)}</td>
                <td style={{ padding: '10px 0' }}>
                  <span style={{ fontSize: 11, background: colors.carbonLight, color: colors.carbon, padding: '2px 8px', borderRadius: radius.badge, fontWeight: 600 }}>
                    {SOURCE_LABEL[t.source]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
