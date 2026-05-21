const API_BASE = 'http://localhost:3000/api';

export function LoginView() {
  const params = new URLSearchParams(window.location.search);
  const error = params.get('error');

  return (
    <main style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', background: '#f8fafc',
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '48px 56px',
        boxShadow: '0 4px 24px rgba(0,0,0,.08)', textAlign: 'center', maxWidth: 400,
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>心</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#1e293b' }}>
          Sign in to Kokoro
        </h1>
        <p style={{ margin: '0 0 32px', fontSize: 14, color: '#64748b' }}>
          Use your Vnext Slack account
        </p>
        {error && (
          <div style={{ color: '#ef4444', marginBottom: 16, fontSize: 13 }}>
            {error === 'auth_cancelled' ? 'Sign-in was cancelled.' : 'Authentication failed. Please try again.'}
          </div>
        )}
        <a
          href={`${API_BASE}/auth/slack`}
          style={{
            display: 'inline-block', background: '#4A154B', color: '#fff',
            borderRadius: 8, padding: '12px 28px', fontWeight: 600,
            fontSize: 15, textDecoration: 'none',
          }}
        >
          Sign in with Slack
        </a>
      </div>
    </main>
  );
}
