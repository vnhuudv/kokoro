// code/src/web/dashboard/src/pages/AdminCarbonView.tsx
import { useState } from 'react';
import { useInochiFetch } from '../hooks/useDashboard';

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

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 8, padding: '20px 24px',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)', marginBottom: 16,
};

const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 4,
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid #e2e8f0', fontSize: 13, boxSizing: 'border-box',
};

const FORM_FIELDS: { field: string; label: string; required?: boolean }[] = [
  { field: 'kg_co2e',      label: 'kg CO₂e covered',        required: true },
  { field: 'cert_id',      label: 'Certificate ID' },
  { field: 'cost_usd',     label: 'Cost (USD)' },
  { field: 'purchased_at', label: 'Purchased (YYYY-MM-DD)',  required: true },
  { field: 'covers_from',  label: 'Covers from (YYYY-MM-DD)', required: true },
  { field: 'covers_to',    label: 'Covers to (YYYY-MM-DD)',  required: true },
  { field: 'notes',        label: 'Notes' },
];

type FormState = Record<string, string>;

const EMPTY_FORM: FormState = {
  kg_co2e: '', cert_id: '', cost_usd: '', provider: 'gold_standard',
  purchased_at: '', covers_from: '', covers_to: '', notes: '',
};

export function AdminCarbonView() {
  const { data, loading } = useInochiFetch<CompanyCarbonSummary>('/carbon/company');
  const { data: offsets, loading: offsetLoading } = useInochiFetch<OffsetRecord[]>('/offsets');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetch('http://localhost:3000/api/inochi/offsets', {
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
      setForm(EMPTY_FORM);
      setShowForm(false);
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 860 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: '#1e293b' }}>
          命 Company AI Carbon — {data?.period_month}
        </h1>
        <div style={{ fontSize: 14, color: '#94a3b8' }}>Admin view — all teams</div>
      </div>

      {/* Summary stats */}
      {data && (
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '4px solid #34d399' }}>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#059669' }}>{data.total_kg_co2e.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>kg CO₂e total</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px', borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#059669' }}>{(data.total_tokens / 1_000_000).toFixed(1)}M</div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>tokens this month</div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 12px' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: data.offset_covered ? '#059669' : '#f59e0b' }}>
              {data.offset_covered ? '✓ Covered' : '⚠ Pending'}
            </div>
            <div style={{ fontSize: 13, color: '#1e293b', marginTop: 6, fontWeight: 600 }}>offset status</div>
          </div>
        </div>
      )}

      {/* Offset records */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>Offset purchases</div>
          <button
            onClick={() => setShowForm(s => !s)}
            style={{ fontSize: 13, background: '#0ea5a0', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Record purchase'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 16, display: 'grid', gap: 10 }}>
            {FORM_FIELDS.map(({ field, label, required }) => (
              <label key={field} style={{ fontSize: 13, color: '#334155' }}>
                {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
                <input
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  required={required}
                  style={inputStyle}
                />
              </label>
            ))}
            <button
              type="submit"
              disabled={submitting}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, opacity: submitting ? 0.6 : 1 }}
            >
              {submitting ? 'Saving…' : 'Save offset record'}
            </button>
          </form>
        )}

        {!offsetLoading && (!offsets || offsets.length === 0) && (
          <div style={{ fontSize: 14, color: '#94a3b8' }}>No offset purchases recorded yet.</div>
        )}
        {offsets?.map(o => (
          <div key={o.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14,
          }}>
            <div>
              <span style={{ color: '#334155', fontWeight: 600 }}>{o.kg_co2e} kg CO₂e</span>
              {o.cert_id && <span style={{ color: '#94a3b8', marginLeft: 8 }}>{o.provider} #{o.cert_id}</span>}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12 }}>
              {o.covers_from} → {o.covers_to}
              {o.cost_usd != null && <span style={{ marginLeft: 8, color: '#059669' }}>${o.cost_usd}</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
