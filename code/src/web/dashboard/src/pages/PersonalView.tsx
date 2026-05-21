import { useFetch } from '../hooks/useDashboard';

interface PersonalMetrics {
  fluency_score: number;
  fluency_delta: number;
  annotations_this_month: number;
  suggestions_used: number;
  suggestions_total: number;
  patterns_mastered: string[];
}

const card: React.CSSProperties = {
  background: '#fff',
  borderRadius: 8,
  padding: '24px 28px',
  borderLeft: '4px solid #0ea5a0',
  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
  marginBottom: 16,
};

function ProgressBar({ value }: { value: number }) {
  return (
    <div style={{ background: '#f1f5f9', borderRadius: 8, height: 14, overflow: 'hidden', marginTop: 8 }}>
      <div style={{ width: `${value}%`, height: '100%', background: '#0ea5a0', borderRadius: 8, transition: 'width .4s ease' }} />
    </div>
  );
}

export function PersonalView() {
  const { data, loading } = useFetch<PersonalMetrics>('/personal');
  if (loading) return <div style={{ padding: 40, color: '#64748b' }}>Loading…</div>;

  const usageRate = data ? Math.round((data.suggestions_used / data.suggestions_total) * 100) : 0;

  return (
    <main style={{ padding: '32px 40px', background: '#f8fafc', minHeight: '100vh', maxWidth: 640 }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>My Fluency</h1>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 28 }}>Pilot Week 8</div>

      {/* Fluency score */}
      <div style={card}>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Fluency score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 44, fontWeight: 700, color: '#1e293b' }}>{data?.fluency_score}%</span>
          <span style={{ fontSize: 14, color: '#0ea5a0' }}>+{data?.fluency_delta}% from start</span>
        </div>
        <ProgressBar value={data?.fluency_score ?? 0} />
      </div>

      {/* Activity stats */}
      <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b' }}>{data?.annotations_this_month}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Annotations this month</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b' }}>{data?.suggestions_used}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Suggestions used ({usageRate}%)</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#1e293b' }}>{data?.patterns_mastered.length}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Patterns mastered</div>
        </div>
      </div>

      {/* Patterns mastered */}
      <div style={{ ...card, borderLeft: 'none' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 12 }}>Patterns I've mastered</div>
        {(data?.patterns_mastered ?? []).map((p, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: '#334155' }}>
            <span style={{ color: '#0ea5a0', fontWeight: 700 }}>✓</span>
            {p}
          </div>
        ))}
      </div>
    </main>
  );
}
