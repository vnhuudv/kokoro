// code/src/web/dashboard/src/pages/AdminCarbonView.tsx
import { useState } from 'react';
import { useInochiFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

interface OffsetRecord {
  id: string;
  kg_co2e: number;
  provider: string;
  cert_id: string | null;
  cost_usd: number | null;
  purchased_at: string;
  covers_from: string;
  covers_to: string;
  notes: string | null;
}

interface CompanyCarbonSummary {
  period_month: string;
  total_kg_co2e: number;
  total_tokens: number;
  offset_covered: boolean;
  offsets: OffsetRecord[];
}

const INOCHI_API = 'http://localhost:3000/api/inochi';

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 4,
  padding: '6px 10px', borderRadius: radius.input,
  border: `1px solid ${colors.border}`, fontSize: 13, boxSizing: 'border-box',
};

const FORM_FIELDS: { field: string; label: string; required?: boolean; type?: string }[] = [
  { field: 'kg_co2e',      label: 'kg CO₂e covered',          required: true,  type: 'number' },
  { field: 'cert_id',      label: 'Certificate ID' },
  { field: 'cost_usd',     label: 'Cost (USD)',                                 type: 'number' },
  { field: 'purchased_at', label: 'Purchased (YYYY-MM-DD)',    required: true,  type: 'date' },
  { field: 'covers_from',  label: 'Covers from (YYYY-MM-DD)',  required: true,  type: 'date' },
  { field: 'covers_to',    label: 'Covers to (YYYY-MM-DD)',    required: true,  type: 'date' },
  { field: 'notes',        label: 'Notes' },
];

type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  kg_co2e: '', cert_id: '', cost_usd: '', provider: 'gold_standard',
  purchased_at: '', covers_from: '', covers_to: '', notes: '',
};

export function AdminCarbonView() {
  const { data, loading, error } = useInochiFetch<CompanyCarbonSummary>('/carbon/company');
  const { data: offsets, loading: offsetLoading } = useInochiFetch<OffsetRecord[]>('/offsets');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (loading) return <div style={{ ...pageWrap, color: colors.textSecondary }}>Loading…</div>;
  if (error) return <div style={{ ...pageWrap, color: colors.danger }}>Failed to load carbon data.</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`${INOCHI_API}/offsets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kg_co2e: Number(form.kg_co2e),
          provider: form.provider,
          cert_id:  form.cert_id  || undefined,
          cost_usd: form.cost_usd ? Number(form.cost_usd) : undefined,
          purchased_at: form.purchased_at,
          covers_from:  form.covers_from,
          covers_to:    form.covers_to,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      window.location.reload();
    } catch (err) {
      setSubmitError(String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.carbonLight, color: colors.carbon, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
          命 INOCHI PILLAR
        </div>
        <h1 style={{ ...pageTitle, color: colors.carbon }}>Company AI Carbon · {data?.period_month}</h1>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Admin view — all teams</div>
      </div>

      {/* Summary stats */}
      {data && (
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 12, borderTop: `4px solid ${colors.carbon}` }}>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.carbon }}>{data.total_kg_co2e.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: colors.textBody, marginTop: 6, fontWeight: 600 }}>kg CO₂e total</div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>mixed sources</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: colors.carbon }}>{(data.total_tokens / 1_000_000).toFixed(1)}M</div>
            <div style={{ fontSize: 13, color: colors.textBody, marginTop: 6, fontWeight: 600 }}>tokens this month</div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>mixed sources</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: data.offset_covered ? colors.carbon : colors.warning }}>
              {data.offset_covered ? '✓ Covered' : '⚠ Pending'}
            </div>
            <div style={{ fontSize: 13, color: colors.textBody, marginTop: 6, fontWeight: 600 }}>offset status</div>
          </div>
        </div>
      )}

      {/* Offset records */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.textBody }}>Offset purchases</div>
          <button
            onClick={() => setShowForm(s => !s)}
            style={{ fontSize: 13, background: colors.carbon, color: '#fff', border: 'none', borderRadius: radius.button, padding: '6px 14px', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Record purchase'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: colors.canvasBg, borderRadius: radius.card, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
            {FORM_FIELDS.map(({ field, label, required, type }) => (
              <label key={field} style={{ ...labelStyle, fontSize: 13, color: colors.textSecondary }}>
                {label}{required && <span style={{ color: colors.danger }}> *</span>}
                <input
                  type={type || 'text'}
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required={required}
                  disabled={submitting}
                  style={inputStyle}
                />
              </label>
            ))}
            <label style={{ ...labelStyle, fontSize: 13, color: colors.textSecondary }}>
              Provider *
              <select
                value={form.provider}
                onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                disabled={submitting}
                style={inputStyle}
              >
                <option value="gold_standard">Gold Standard</option>
                <option value="verra_vcs">Verra VCS</option>
                <option value="other">Other</option>
              </select>
            </label>
            <button
              type="submit"
              disabled={submitting}
              style={{ background: colors.carbon, color: '#fff', border: 'none', borderRadius: radius.button, padding: '8px 16px', cursor: 'pointer', fontSize: 13, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Saving…' : 'Save offset record'}
            </button>
            {submitError && (
              <div style={{ color: colors.danger, fontSize: 13, marginTop: 4 }}>{submitError}</div>
            )}
          </form>
        )}

        {!offsetLoading && (!offsets || offsets.length === 0) && (
          <div style={{ fontSize: 14, color: colors.textMuted }}>No offset purchases recorded yet.</div>
        )}
        {offsets?.map(o => (
          <div key={o.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 14,
          }}>
            <div>
              <span style={{ color: colors.textBody, fontWeight: 600 }}>{Number(o.kg_co2e).toFixed(2)} kg CO₂e</span>
              {o.cert_id && <span style={{ color: colors.textMuted, marginLeft: 8 }}>{o.provider} #{o.cert_id}</span>}
            </div>
            <div style={{ color: colors.textMuted, fontSize: 12 }}>
              {o.covers_from} → {o.covers_to}
              {o.cost_usd != null && <span style={{ marginLeft: 8, color: colors.carbon }}>${o.cost_usd}</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
