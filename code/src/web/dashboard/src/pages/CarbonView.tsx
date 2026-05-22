// code/src/web/dashboard/src/pages/CarbonView.tsx
import { useInochiFetch } from '../hooks/useDashboard';

interface ToolBreakdown {
  tool: string;
  provider: string;
  source: 'gateway' | 'billing_api' | 'estimate';
  input_tokens: number;
  output_tokens: number;
  carbon_kg: number;
}

interface PersonalCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  km_equivalent: number;
  offset_cost_usd_estimate: number;
  tools: ToolBreakdown[];
  offset_covered: boolean;
}

const SOURCE_LABEL: Record<string, string> = {
  gateway:     'exact',
  billing_api: 'estimated',
  estimate:    'approximate',
};

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

export function CarbonView() {
  const { data, loading } = useInochiFetch<PersonalCarbonSummary>('/carbon/me');

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;
  if (!data)   return <div style={{ padding: 40, color: '#94a3b8' }}>No carbon data yet.</div>;

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 40px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          命 My AI Carbon — {data.period_month}
        </h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Your AI token footprint this month</div>
      </div>

      {/* Hero stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '4px solid #34d399' }}>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            {data.total_kg_co2e.toFixed(3)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>kg CO₂e</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>≈ {data.km_equivalent} km by car</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            {(data.total_tokens / 1000).toFixed(0)}k
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>tokens</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>across all tools</div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px 12px' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: '#059669', lineHeight: 1 }}>
            ~${data.offset_cost_usd_estimate.toFixed(2)}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginTop: 8 }}>to offset</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Gold Standard rate</div>
        </div>
      </div>

      {/* Offset status */}
      <div style={{
        ...card,
        borderLeft: `4px solid ${data.offset_covered ? '#34d399' : '#f59e0b'}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>{data.offset_covered ? '✓' : '⚠'}</span>
        <span style={{ fontSize: 14, color: '#334155' }}>
          {data.offset_covered
            ? 'Vnext has purchased verified offsets covering this month.'
            : 'Offsets for this month have not been purchased yet.'}
        </span>
      </div>

      {/* Tool breakdown */}
      <div style={card}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>
          Breakdown by tool
        </div>
        {data.tools.length === 0 && (
          <div style={{ fontSize: 14, color: '#94a3b8' }}>No tool usage recorded this month.</div>
        )}
        {data.tools.map((t, i) => (
          <div key={`${t.tool}-${t.source}`} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: i < data.tools.length - 1 ? '1px solid #f1f5f9' : 'none',
            fontSize: 14,
          }}>
            <span style={{ color: '#334155' }}>{t.tool}</span>
            <span style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <span style={{ color: '#94a3b8' }}>{((t.input_tokens + t.output_tokens) / 1000).toFixed(0)}k tokens</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{t.carbon_kg.toFixed(4)} kg</span>
              <span style={{
                fontSize: 11, padding: '2px 6px', borderRadius: 4,
                background: t.source === 'gateway' ? '#f0fdf4' : '#fefce8',
                color: t.source === 'gateway' ? '#059669' : '#92400e',
              }}>
                {SOURCE_LABEL[t.source]}
              </span>
            </span>
          </div>
        ))}
      </div>
      </div>
    </main>
  );
}
