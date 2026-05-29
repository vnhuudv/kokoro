// code/src/web/dashboard/src/pages/LoginView.tsx
import { colors, shadow, radius } from '../theme';

const API_BASE = 'http://localhost:3000/api';

export function LoginView() {
  const params = new URLSearchParams(window.location.search);
  const error  = params.get('error');

  return (
    <main style={{
      display:         'flex',
      flexDirection:   'column',
      alignItems:      'center',
      justifyContent:  'center',
      minHeight:       '100vh',
      background:      colors.sidebarBg,
    }}>
      {/* Card */}
      <div style={{
        background:    colors.cardBg,
        borderRadius:  radius.card + 4,
        padding:       '48px 52px',
        boxShadow:     shadow.modal,
        textAlign:     'center',
        maxWidth:       420,
        width:         '100%',
      }}>
        {/* Logo */}
        <div style={{
          width:        56,
          height:       56,
          background:   colors.primary,
          borderRadius: radius.card,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          fontSize:     24,
          fontWeight:   800,
          color:        '#fff',
          margin:       '0 auto 20px',
        }}>K</div>

        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: colors.textHeading }}>
          Sign in to Kokoro
        </h1>
        <p style={{ margin: '0 0 8px', fontSize: 13, color: colors.textMuted }}>
          Cultural intelligence for global teams
        </p>
        <p style={{ margin: '0 0 32px', fontSize: 12, color: colors.textMuted }}>
          Vnext Japan · Pilot Programme
        </p>

        {error && (
          <div style={{
            background:   '#fef2f2',
            border:       `1px solid #fecaca`,
            borderRadius: radius.button,
            padding:      '10px 14px',
            marginBottom: 20,
            fontSize:     13,
            color:        colors.danger,
          }}>
            {error === 'auth_cancelled' ? 'Sign-in was cancelled.' : 'Authentication failed. Please try again.'}
          </div>
        )}

        <a
          href={`${API_BASE}/auth/slack`}
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            10,
            background:     '#4A154B',
            color:          '#fff',
            borderRadius:   radius.button,
            padding:        '13px 28px',
            fontWeight:     600,
            fontSize:       15,
            textDecoration: 'none',
            width:          '100%',
            boxSizing:      'border-box',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
          </svg>
          Sign in with Slack
        </a>

        <p style={{ marginTop: 20, fontSize: 11, color: colors.textMuted }}>
          Your data is encrypted and private to your workspace.
        </p>
      </div>
    </main>
  );
}
