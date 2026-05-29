# Dashboard UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Kokoro React dashboard from a minimal inline-styled UI to an investor-ready "Indigo Enterprise Light" design — deep indigo sidebar, pillar accent colors, premium card system, and a collapsible hybrid sidebar nav.

**Architecture:** Pure frontend redesign. A shared `theme.ts` exports all design tokens; a rewritten `Nav.tsx` provides the collapsible sidebar; `App.tsx` is updated to use a flex-row shell layout. All 11 page components are then restyled to use theme tokens. No backend changes.

**Tech Stack:** React 18, React Router 6, Vite, TypeScript, inline `React.CSSProperties`, Recharts (unchanged), Inter font via Google Fonts

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `code/src/web/dashboard/src/theme.ts` | All color tokens, spacing, shared style objects |
| Modify | `code/src/web/dashboard/index.html` | Add Inter Google Font link |
| Modify | `code/src/web/dashboard/src/App.tsx` | Flex-row shell layout (sidebar + content) |
| Modify | `code/src/web/dashboard/src/components/Nav.tsx` | Collapsible sidebar with hover expand |
| Modify | `code/src/web/dashboard/src/pages/LoginView.tsx` | Premium login page |
| Modify | `code/src/web/dashboard/src/pages/TeamView.tsx` | Team overview redesign |
| Modify | `code/src/web/dashboard/src/pages/PersonalView.tsx` | Personal fluency redesign |
| Modify | `code/src/web/dashboard/src/pages/PublicView.tsx` | Pilot results redesign |
| Modify | `code/src/web/dashboard/src/pages/CarbonView.tsx` | Carbon view with emerald tint |
| Modify | `code/src/web/dashboard/src/pages/AdminCarbonView.tsx` | Admin carbon with emerald tint |
| Modify | `code/src/web/dashboard/src/pages/TamFeed.tsx` | Tâm feed with amber tint |
| Modify | `code/src/web/dashboard/src/pages/TamPost.tsx` | Tâm post form redesign |
| Modify | `code/src/web/dashboard/src/pages/TamLeaderboard.tsx` | Leaderboard with podium |
| Modify | `code/src/web/dashboard/src/pages/MakotoFeed.tsx` | Makoto feed redesign |
| Modify | `code/src/web/dashboard/src/pages/MakotoPost.tsx` | Makoto post form redesign |
| Modify | `code/src/web/dashboard/src/pages/MakotoArticle.tsx` | Article detail redesign |

**Dependency order:**
- Task 1 (theme.ts): no deps
- Task 2 (Shell): depends on Task 1
- Tasks 3–11 (pages): all depend on Task 2; independent of each other — parallelize freely

---

### Task 1: Design Token System

`depends_on: []`

**Files:**
- Create: `code/src/web/dashboard/src/theme.ts`

- [ ] **Step 1: Create theme.ts**

```typescript
// code/src/web/dashboard/src/theme.ts
import type { CSSProperties } from 'react';

export const colors = {
  // Sidebar
  sidebarBg:        '#1e1b4b',
  sidebarActive:    '#312e81',
  sidebarIcon:      '#6366f1',
  sidebarIconActive:'#a5b4fc',

  // Canvas
  canvasBg:         '#f8fafc',
  cardBg:           '#ffffff',
  border:           '#e2e8f0',

  // Text
  textHeading:      '#1e1b4b',
  textBody:         '#1e293b',
  textSecondary:    '#64748b',
  textMuted:        '#94a3b8',

  // Primary (Makoto / Team / shared)
  primary:          '#6366f1',
  primaryHover:     '#4f46e5',
  primaryLight:     '#e0e7ff',
  primaryRing:      '#c7d2fe',

  // Pillar accents
  carbon:           '#10b981',
  carbonLight:      '#d1fae5',
  tam:              '#f59e0b',
  tamLight:         '#fef3c7',
  makoto:           '#6366f1',
  makotoLight:      '#e0e7ff',
  en:               '#8b5cf6',
  enLight:          '#ede9fe',
  kokoro:           '#0ea5e9',
  kokoroLight:      '#e0f2fe',

  // Semantic
  success:          '#22c55e',
  warning:          '#f59e0b',
  danger:           '#ef4444',
} as const;

export const radius = {
  card:   12,
  button: 8,
  badge:  6,
  pill:   999,
  input:  8,
} as const;

export const shadow = {
  card:  '0 1px 4px rgba(99, 102, 241, 0.08)',
  modal: '0 4px 24px rgba(0,0,0,.12)',
} as const;

export const card: CSSProperties = {
  background:   colors.cardBg,
  borderRadius: radius.card,
  padding:      16,
  border:       `1px solid ${colors.border}`,
  boxShadow:    shadow.card,
};

export const pageWrap: CSSProperties = {
  background: colors.canvasBg,
  minHeight:  '100vh',
  padding:    24,
};

export const pageTitle: CSSProperties = {
  margin:     0,
  fontSize:   20,
  fontWeight: 800,
  color:      colors.textHeading,
  letterSpacing: '-0.02em',
};

export const labelStyle: CSSProperties = {
  fontSize:      10,
  fontWeight:    600,
  textTransform: 'uppercase',
  letterSpacing: '.06em',
  color:         colors.textMuted,
  marginBottom:  6,
};

export const primaryButton: CSSProperties = {
  background:   colors.primary,
  color:        '#fff',
  border:       'none',
  borderRadius: radius.button,
  padding:      '7px 16px',
  fontSize:     13,
  fontWeight:   600,
  cursor:       'pointer',
};

export const secondaryButton: CSSProperties = {
  background:   colors.cardBg,
  color:        colors.textSecondary,
  border:       `1px solid ${colors.border}`,
  borderRadius: radius.button,
  padding:      '7px 14px',
  fontSize:     13,
  fontWeight:   500,
  cursor:       'pointer',
};
```

- [ ] **Step 2: Verify it compiles**

```bash
cd code/src/web/dashboard && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/theme.ts
git commit -m "feat(ui): add design token system — Indigo Enterprise Light"
```

---

### Task 2: Shell — Font, App Layout, Sidebar Nav

`depends_on: [1]`

**Files:**
- Modify: `code/src/web/dashboard/index.html`
- Modify: `code/src/web/dashboard/src/App.tsx`
- Modify: `code/src/web/dashboard/src/components/Nav.tsx`

- [ ] **Step 1: Add Inter font to index.html**

Replace the full contents of `code/src/web/dashboard/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kokoro · Vnext Japan</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Rewrite Nav.tsx as collapsible sidebar**

Replace the full contents of `code/src/web/dashboard/src/components/Nav.tsx`:

```tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { colors, shadow } from '../theme';

const COLLAPSED = 52;
const EXPANDED  = 220;

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" />
    </svg>
  );
}

interface NavItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  accent?: string;
  end?: boolean;
}

function NavItem({ to, label, icon, expanded, accent, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display:        'flex',
        alignItems:     'center',
        gap:            10,
        padding:        expanded ? '8px 10px' : '8px',
        borderRadius:   8,
        textDecoration: 'none',
        color:          isActive ? colors.sidebarIconActive : (accent ?? colors.sidebarIcon),
        background:     isActive ? colors.sidebarActive    : 'transparent',
        width:          '100%',
        boxSizing:      'border-box' as const,
        transition:     'background 150ms ease',
        overflow:       'hidden',
        whiteSpace:     'nowrap' as const,
      })}
    >
      <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20 }}>
        {icon}
      </span>
      {expanded && (
        <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {label}
        </span>
      )}
    </NavLink>
  );
}

export function Nav() {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width:          expanded ? EXPANDED : COLLAPSED,
        minWidth:       expanded ? EXPANDED : COLLAPSED,
        background:     colors.sidebarBg,
        display:        'flex',
        flexDirection:  'column',
        padding:        '14px 8px',
        gap:            2,
        transition:     'width 200ms ease, min-width 200ms ease',
        overflow:       'hidden',
        position:       'sticky',
        top:            0,
        height:         '100vh',
        boxSizing:      'border-box',
        boxShadow:      shadow.modal,
        zIndex:         100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '0 2px', overflow: 'hidden' }}>
        <div style={{
          width: 30, height: 30, background: colors.primary, borderRadius: 8, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, color: '#fff',
        }}>K</div>
        {expanded && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap' }}>Kokoro 心</div>
            <div style={{ fontSize: 10, color: colors.sidebarIcon, whiteSpace: 'nowrap' }}>Vnext Japan</div>
          </div>
        )}
      </div>

      {/* Main navigation */}
      <NavItem to="/"       end    label="Team Overview"  icon={<IconGrid />}  expanded={expanded} />
      <NavItem to="/me"           label="My Fluency"     icon={<IconUser />}  expanded={expanded} />
      <NavItem to="/public"       label="Pilot Results"  icon={<IconChart />} expanded={expanded} />

      {/* Divider */}
      <div style={{ height: 1, background: '#312e81', margin: '8px 0' }} />
      {expanded && (
        <div style={{ fontSize: 9, color: colors.sidebarIcon, letterSpacing: '.1em', textTransform: 'uppercase', padding: '0 10px', marginBottom: 2 }}>
          Pillars
        </div>
      )}

      {/* Pillars */}
      <NavItem to="/carbon" label="Carbon 命" expanded={expanded} accent={colors.carbon}
        icon={<span style={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>命</span>} />
      <NavItem to="/tam"    label="Tâm 心"    expanded={expanded} accent={colors.tam}
        icon={<span style={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>心</span>} />
      <NavItem to="/makoto" label="Makoto 誠" expanded={expanded} accent={colors.makoto}
        icon={<span style={{ fontSize: 15, lineHeight: 1, fontWeight: 700 }}>誠</span>} />

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User footer */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingTop: 12, borderTop: '1px solid #312e81', overflow: 'hidden',
      }}>
        <div style={{
          width: 28, height: 28, background: colors.primaryHover, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, color: '#fff', fontWeight: 700,
        }}>VJ</div>
        {expanded && (
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#e0e7ff', whiteSpace: 'nowrap' }}>Vnext Japan</div>
            <div style={{ fontSize: 9, color: colors.sidebarIcon, whiteSpace: 'nowrap' }}>Pilot participant</div>
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Update App.tsx shell to flex-row layout**

Replace the full contents of `code/src/web/dashboard/src/App.tsx`:

```tsx
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Nav } from './components/Nav';
import { TeamView } from './pages/TeamView';
import { PersonalView } from './pages/PersonalView';
import { PublicView } from './pages/PublicView';
import { CarbonView } from './pages/CarbonView';
import { AdminCarbonView } from './pages/AdminCarbonView';
import { TamFeed } from './pages/TamFeed';
import { TamPost } from './pages/TamPost';
import { TamLeaderboard } from './pages/TamLeaderboard';
import { MakotoFeed } from './pages/MakotoFeed';
import { MakotoPost } from './pages/MakotoPost';
import { MakotoArticle } from './pages/MakotoArticle';
import { LoginView } from './pages/LoginView';
import { AuthCallback } from './pages/AuthCallback';
import { useAuth } from './hooks/useAuth';

function AuthLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Nav />
      <div style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Routes>
        <Route path="/login"         element={<LoginView />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route element={<AuthLayout />}>
          <Route path="/"             element={<TeamView />} />
          <Route path="/me"           element={<PersonalView />} />
          <Route path="/public"       element={<PublicView />} />
          <Route path="/carbon"       element={<CarbonView />} />
          <Route path="/admin/carbon" element={<AdminCarbonView />} />
          <Route path="/tam"             element={<TamFeed />} />
          <Route path="/tam/new"         element={<TamPost />} />
          <Route path="/tam/leaderboard" element={<TamLeaderboard />} />
          <Route path="/makoto"          element={<MakotoFeed />} />
          <Route path="/makoto/new"      element={<MakotoPost />} />
          <Route path="/makoto/:id"      element={<MakotoArticle />} />
        </Route>
      </Routes>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
cd code/src/web/dashboard && npm run test
```

Expected: all tests pass (same as before).

- [ ] **Step 5: Start dev server and verify sidebar**

```bash
cd code/src/web/dashboard && npm run dev
```

Open http://localhost:5173. Verify:
- Deep indigo sidebar visible on left (52px collapsed)
- Hover over sidebar → expands to 220px, shows labels + "Kokoro 心 / Vnext Japan"
- Kanji icons (命 心 誠) visible for pillar nav items
- Active nav item has lighter indigo background
- Page content fills remaining width with Inter font

- [ ] **Step 6: Commit**

```bash
git add code/src/web/dashboard/index.html \
        code/src/web/dashboard/src/App.tsx \
        code/src/web/dashboard/src/components/Nav.tsx
git commit -m "feat(ui): add collapsible sidebar shell — Indigo Enterprise Light"
```

---

### Task 3: Login Page

`depends_on: [1]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/LoginView.tsx`

- [ ] **Step 1: Rewrite LoginView.tsx**

```tsx
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
        background:    '#fff',
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
            boxSizing:      'border-box' as const,
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
```

- [ ] **Step 2: Verify visually**

Navigate to http://localhost:5173/login. Verify:
- Deep indigo full-page background
- White card centered with K logo in indigo square
- "Sign in to Slack" button with Slack logo

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/pages/LoginView.tsx
git commit -m "feat(ui): redesign login page — indigo background, premium card"
```

---

### Task 4: Team Overview

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/TeamView.tsx`

- [ ] **Step 1: Rewrite TeamView.tsx**

```tsx
// code/src/web/dashboard/src/pages/TeamView.tsx
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, primaryButton, secondaryButton, shadow, radius } from '../theme';

interface TeamMetrics {
  miscomm_rate:       { current: number; baseline: number; delta: number };
  formal_fluency:     { current: number; baseline: number; delta: number };
  user_satisfaction:  { current: number; baseline: number; delta: number };
  case_count:         number;
  active_users:       number;
}
interface TrendPoint { month: string; miscomm_rate: number; formal_fluency: number; }
interface Case {
  case_id: string; intent_label: string; register: string;
  suggestion_used: boolean; risk_category: string | null;
}

const MIN_ACTIVE_USERS = 5;

function KpiCard({ label, value, unit = '', delta, deltaLabel, accent }: {
  label: string; value: number | string; unit?: string;
  delta?: number; deltaLabel?: string; accent: string;
}) {
  const isPositive = (delta ?? 0) >= 0;
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}{unit}</div>
      {delta !== undefined && (
        <div style={{ fontSize: 11, color: isPositive ? colors.success : colors.danger, marginTop: 6 }}>
          {isPositive ? '▲' : '▼'} {Math.abs(delta)}{unit} {deltaLabel ?? ''}
        </div>
      )}
    </div>
  );
}

export function TeamView() {
  const { data: metrics, loading: ml } = useFetch<TeamMetrics>('/team');
  const { data: trend,   loading: tl } = useFetch<TrendPoint[]>('/trend');
  const { data: cases,   loading: cl } = useFetch<Case[]>('/cases');
  const [expandedCase, setExpandedCase] = useState<string | null>(null);

  if (ml || tl || cl) {
    return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</span>
    </div>;
  }

  const belowThreshold = (metrics?.active_users ?? 0) < MIN_ACTIVE_USERS;

  return (
    <main style={pageWrap}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={pageTitle}>Team Overview</h1>
          <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            Vnext Japan · M3 → M6 · {metrics?.active_users} active participants
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={secondaryButton}>Last 90 days ▾</button>
          <button style={primaryButton}>Export Report</button>
        </div>
      </div>

      {/* Anonymisation warning */}
      {belowThreshold && (
        <div style={{ background: '#fffbeb', border: `1px solid #fde68a`, borderRadius: radius.button, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          Detailed metrics require at least {MIN_ACTIVE_USERS} active participants. Currently {metrics?.active_users} — some breakdowns are suppressed.
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {metrics && <>
          <KpiCard label="Formal Fluency"     value={metrics.formal_fluency.current}    unit="%" delta={metrics.formal_fluency.delta}    deltaLabel="vs baseline" accent={colors.primary} />
          <KpiCard label="Miscomm Rate"       value={metrics.miscomm_rate.current}      unit="%" delta={-metrics.miscomm_rate.delta}     deltaLabel="vs baseline" accent={colors.danger}  />
          <KpiCard label="User Satisfaction"  value={metrics.user_satisfaction.current}      delta={metrics.user_satisfaction.delta}  deltaLabel="vs baseline" accent={colors.en}      />
          <KpiCard label="Teaching Cases"     value={metrics.case_count}                accent={colors.kokoro} />
          <KpiCard label="Active Participants" value={metrics.active_users}             accent={colors.tam}   />
        </>}
      </div>

      {/* Chart + Top performers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12, marginBottom: 16 }}>
        {/* Fluency trend chart */}
        <div style={{ ...card }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 4 }}>Fluency Trend</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 14 }}>All participants · rolling 90 days</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend ?? []}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: colors.textMuted }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: colors.textMuted }} unit="%" />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="miscomm_rate"   name="Miscomm rate"   stroke={colors.warning}  strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="formal_fluency" name="Formal fluency"  stroke={colors.primary}  strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Teaching cases hero */}
        <div style={{ ...card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: colors.textMuted, marginBottom: 10 }}>Teaching Cases</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: colors.primary, lineHeight: 1 }}>{metrics?.case_count}</div>
          <div style={{ fontSize: 13, color: colors.textSecondary, marginTop: 8 }}>anonymised cases</div>
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>contributed since M3</div>
          <div style={{ marginTop: 14, background: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: radius.pill }}>
            Growing each week
          </div>
        </div>
      </div>

      {/* Recent cases table */}
      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Recent Teaching Cases</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
              {['Case', 'Register', 'Flag', 'Outcome'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 0', color: colors.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(cases ?? []).map(c => (
              <>
                <tr
                  key={c.case_id}
                  style={{ borderBottom: expandedCase === c.case_id ? 'none' : `1px solid ${colors.border}`, cursor: 'pointer' }}
                  onClick={() => setExpandedCase(expandedCase === c.case_id ? null : c.case_id)}
                >
                  <td style={{ padding: '10px 0', color: colors.textBody }}>
                    <span style={{ marginRight: 6, fontSize: 11, color: colors.textMuted }}>{expandedCase === c.case_id ? '▾' : '▸'}</span>
                    {c.intent_label}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: 11, background: colors.primaryLight, color: colors.primary, padding: '2px 8px', borderRadius: radius.badge, fontWeight: 600 }}>
                      {c.register}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    {c.risk_category
                      ? <span style={{ fontSize: 11, background: '#fffbeb', color: '#92400e', padding: '2px 8px', borderRadius: radius.badge }}>{c.risk_category}</span>
                      : <span style={{ fontSize: 11, color: colors.textMuted }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ fontSize: 11, color: c.suggestion_used ? colors.carbon : colors.textMuted, fontWeight: c.suggestion_used ? 600 : 400 }}>
                      {c.suggestion_used ? '✓ Suggestion used' : 'Dismissed'}
                    </span>
                  </td>
                </tr>
                {expandedCase === c.case_id && (
                  <tr key={`${c.case_id}-detail`}>
                    <td colSpan={4} style={{ padding: '0 0 12px 20px', borderBottom: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: 12, color: colors.textSecondary, background: colors.canvasBg, padding: '10px 14px', borderRadius: radius.button }}>
                        <strong>Case ID:</strong> {c.case_id.split('-')[0]}…
                        {c.risk_category && <> · <strong>Cultural risk:</strong> {c.risk_category}</>}
                        {' '}· <strong>Result:</strong> {c.suggestion_used ? 'participant adopted the suggested phrasing' : 'participant sent original message'}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/. Verify:
- 5-column KPI row with indigo/emerald/amber numbers
- Fluency trend chart with line series
- Teaching cases hero number
- Recent cases table with indigo register badges

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/pages/TeamView.tsx
git commit -m "feat(ui): redesign TeamView — KPI cards, chart, indigo theme"
```

---

### Task 5: Personal Fluency

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/PersonalView.tsx`

- [ ] **Step 1: Rewrite PersonalView.tsx**

```tsx
// code/src/web/dashboard/src/pages/PersonalView.tsx
import { useState } from 'react';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

interface PersonalMetrics {
  fluency_score:          number;
  fluency_delta:          number;
  annotations_this_month: number;
  suggestions_used:       number;
  suggestions_total:      number;
  patterns_mastered:      string[];
}

function ProgressBar({ value, accent }: { value: number; accent: string }) {
  return (
    <div style={{ background: colors.primaryLight, borderRadius: radius.pill, height: 8, overflow: 'hidden', marginTop: 10 }}>
      <div style={{ width: `${value}%`, height: '100%', background: accent, borderRadius: radius.pill, transition: 'width .4s ease' }} />
    </div>
  );
}

export function PersonalView() {
  const { data, loading } = useFetch<PersonalMetrics>('/personal');
  const [showHistory, setShowHistory] = useState(false);

  if (loading) {
    return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: colors.textMuted, fontSize: 14 }}>Loading…</span>
    </div>;
  }

  const usageRate = data && data.suggestions_total > 0
    ? Math.round((data.suggestions_used / data.suggestions_total) * 100)
    : 0;

  return (
    <main style={pageWrap}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={pageTitle}>My Fluency</h1>
        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Pilot Week 8</div>
      </div>

      <div style={{ maxWidth: 680 }}>
        {/* Fluency score card */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={labelStyle}>Fluency Score</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: 48, fontWeight: 800, color: colors.primary, lineHeight: 1 }}>{data?.fluency_score}%</span>
            {(data?.fluency_delta ?? 0) > 0 && (
              <span style={{ fontSize: 13, color: colors.success, fontWeight: 600 }}>▲ +{data?.fluency_delta}% from start</span>
            )}
          </div>
          <ProgressBar value={data?.fluency_score ?? 0} accent={colors.primary} />
        </div>

        {/* Activity stats */}
        <div style={{ ...card, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.en }}>{data?.annotations_this_month}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Annotations this month</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.carbon }}>{data?.suggestions_used}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Suggestions used ({usageRate}%)</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: colors.tam }}>{data?.patterns_mastered.length}</div>
            <div style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>Patterns mastered</div>
          </div>
        </div>

        {/* Suggestion usage bar */}
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={labelStyle}>Suggestion Adoption Rate</div>
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.carbon }}>{usageRate}%</span>
          </div>
          <ProgressBar value={usageRate} accent={colors.carbon} />
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 8 }}>
            {data?.suggestions_used} of {data?.suggestions_total} suggestions adopted
          </div>
        </div>

        {/* Patterns mastered */}
        {(data?.patterns_mastered.length ?? 0) > 0 && (
          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 12 }}>Patterns I've mastered</div>
            {(data?.patterns_mastered ?? []).map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: `1px solid ${colors.border}`, fontSize: 13, color: colors.textBody }}>
                <span style={{ width: 20, height: 20, background: colors.primaryLight, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: colors.primary, fontWeight: 700, flexShrink: 0 }}>✓</span>
                {p}
              </div>
            ))}
          </div>
        )}

        {/* Annotation history */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showHistory ? 14 : 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody }}>Annotation History</div>
            <button
              onClick={() => setShowHistory(h => !h)}
              style={{ fontSize: 12, color: colors.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              {showHistory ? 'Hide ▴' : 'View ▾'}
            </button>
          </div>
          {showHistory && (
            <div style={{ fontSize: 13, color: colors.textSecondary, background: colors.canvasBg, padding: '14px 16px', borderRadius: radius.button, textAlign: 'center' }}>
              Full annotation history will be available in the next release.
              <div style={{ marginTop: 8, fontSize: 11, color: colors.textMuted }}>
                Your data is stored privately and not visible to team leads.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/me. Verify:
- Large indigo fluency score with progress bar
- 3-column stat grid with violet / emerald / amber numbers
- Patterns list with indigo circle checkmarks

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/pages/PersonalView.tsx
git commit -m "feat(ui): redesign PersonalView — fluency score hero, stat grid"
```

---

### Task 6: Pilot Results

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/PublicView.tsx`

- [ ] **Step 1: Rewrite PublicView.tsx**

```tsx
// code/src/web/dashboard/src/pages/PublicView.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

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
  const { data, loading } = useFetch<PublicSummary>('/public');
  const { data: carbon }  = useFetch<CarbonFootprint>('/inochi/carbon');
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
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/public. Verify:
- "PUBLIC VIEW" pill badge in header
- Hero stat row with colored numbers (emerald / indigo / violet)
- Five pillars row each with its own top border accent color

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/pages/PublicView.tsx
git commit -m "feat(ui): redesign PublicView — hero stats, pillar cards, emerald carbon"
```

---

### Task 7: Carbon Views

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/CarbonView.tsx`
- Modify: `code/src/web/dashboard/src/pages/AdminCarbonView.tsx`

- [ ] **Step 1: Read the full AdminCarbonView.tsx**

```bash
cat code/src/web/dashboard/src/pages/AdminCarbonView.tsx
```

Note the form fields and state structure — needed for Step 3.

- [ ] **Step 2: Rewrite CarbonView.tsx**

```tsx
// code/src/web/dashboard/src/pages/CarbonView.tsx
import { useInochiFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

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
```

- [ ] **Step 3: Rewrite AdminCarbonView.tsx**

Read the full file first (`cat code/src/web/dashboard/src/pages/AdminCarbonView.tsx`), then replace it preserving all existing state logic and form field definitions but updating every inline style to use theme tokens:

Key style replacements:
- All `#fff` card backgrounds → `{ ...card }`
- All `#0ea5a0` / `#34d399` / `#059669` → `colors.carbon` / `colors.carbonLight`
- All `#1e293b` text → `colors.textBody`
- All `#64748b` text → `colors.textSecondary`
- All `#94a3b8` text → `colors.textMuted`
- All `#e2e8f0` borders → `colors.border`
- All `#f8fafc` backgrounds → `colors.canvasBg`
- Card border-radius 8 → `radius.card` (12)
- Input border-radius 6 → `radius.input` (8)
- The hero banner border-top color → `colors.carbon`
- Page title → `{ ...pageTitle, color: colors.carbon }`
- Add `{ ...pageWrap }` to the `<main>` style
- Add pillar pill badge "命 INOCHI PILLAR" matching CarbonView header style

Do NOT change: API calls (`useInochiFetch`), state management, FORM_FIELDS, form submission logic.

- [ ] **Step 4: Verify**

Navigate to http://localhost:5173/carbon. Verify:
- Emerald top border on hero card
- "命 INOCHI PILLAR" pill badge
- Emerald numbers for kg CO₂e figures
- Emerald source badges on tool rows

- [ ] **Step 5: Commit**

```bash
git add code/src/web/dashboard/src/pages/CarbonView.tsx \
        code/src/web/dashboard/src/pages/AdminCarbonView.tsx
git commit -m "feat(ui): redesign CarbonView + AdminCarbonView — emerald carbon theme"
```

---

### Task 8: Tâm Feed + Post Form

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/TamFeed.tsx`
- Modify: `code/src/web/dashboard/src/pages/TamPost.tsx`

- [ ] **Step 1: Read the full TamFeed.tsx and TamPost.tsx**

```bash
cat code/src/web/dashboard/src/pages/TamFeed.tsx
cat code/src/web/dashboard/src/pages/TamPost.tsx
```

Note: the existing `CATEGORY_COLORS`, `CATEGORY_LABELS`, `CATEGORY_GRADIENTS`, filter state, `TamPost` and `LeaderboardEntry` interfaces — these are preserved.

- [ ] **Step 2: Update TamFeed.tsx**

Preserve all data fetching, interfaces, and constants (`TENANT_ID`, `CATEGORY_COLORS`, `CATEGORY_LABELS`, `CATEGORY_GRADIENTS`, `FILTER_CATEGORIES`). Replace every inline style object to use theme tokens. Key visual changes:

**Remove** the local `card` constant (replaced by import).

**Add** imports:
```tsx
import { colors, card, pageWrap, pageTitle, labelStyle, primaryButton, secondaryButton, radius } from '../theme';
```

**`<main>`**: Use `{ ...pageWrap }`.

**Page header** (title + subtitle + buttons):
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
  <div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.tamLight, color: colors.tam, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
      心 TÂM PILLAR
    </div>
    <h1 style={{ ...pageTitle, margin: 0 }}>Tâm 心 — Social Impact</h1>
    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
      Earn points by taking action on causes your organisation supports
    </div>
  </div>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <Link to="/tam/leaderboard" style={{ ...secondaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
      🏆 Leaderboard
    </Link>
    <Link to="/tam/new" style={{ ...primaryButton, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', background: colors.tam, color: '#fff' }}>
      + New Post
    </Link>
  </div>
</div>
```

**Category filter pills**: Active pill uses `colors.tam` background:
```tsx
<button
  onClick={() => setFilter(f.key)}
  style={{
    padding: '5px 14px', borderRadius: radius.pill, fontSize: 12, fontWeight: 600,
    border: 'none', cursor: 'pointer',
    background: filter === f.key ? colors.tam    : colors.cardBg,
    color:      filter === f.key ? '#fff'         : colors.textSecondary,
    boxShadow:  filter === f.key ? 'none'         : `0 0 0 1px ${colors.border}`,
  }}
>
  {f.label}
</button>
```

**Post cards**: Replace old card styles with:
```tsx
<div style={{ ...card, marginBottom: 12, borderLeft: `3px solid ${CATEGORY_COLORS[post.category] ?? colors.tam}` }}>
```

**Category badge**:
```tsx
<span style={{
  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: radius.badge,
  background: `${CATEGORY_COLORS[post.category]}22`,
  color: CATEGORY_COLORS[post.category],
}}>
  {CATEGORY_LABELS[post.category]}
</span>
```

**Cover image gradient strip** (if `post.coverImageUrl` exists — keep the gradient using `CATEGORY_GRADIENTS`):
```tsx
<div style={{ height: 6, background: CATEGORY_GRADIENTS[post.category], borderRadius: `${radius.card}px ${radius.card}px 0 0`, marginBottom: 14 }} />
```

**Post title**: `fontSize: 15, fontWeight: 700, color: colors.textBody`

**Footer** (action count, total points, link):
```tsx
<div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: colors.textMuted, alignItems: 'center' }}>
  <span>⚡ {post.actionCount} actions</span>
  <span style={{ color: colors.tam, fontWeight: 700 }}>+{post.totalPoints} pts</span>
  <Link to={`/tam/${post.id}`} style={{ marginLeft: 'auto', color: colors.primary, fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
    Take action →
  </Link>
</div>
```

- [ ] **Step 3: Update TamPost.tsx**

Read the full file, then replace styles using theme tokens. Key changes:

**Add** imports: `import { colors, card, pageWrap, pageTitle, radius, primaryButton, secondaryButton } from '../theme';`

**`<main>`**: `{ ...pageWrap }`.

**Form card**: `{ ...card, maxWidth: 600, margin: '0 auto' }`.

**Form title**: `{ ...pageTitle }`.

**Category pill selector** (if category selection UI exists): active pill uses `CATEGORY_COLORS[cat]` background, others use `colors.cardBg` with border.

**Input/textarea styles**: replace local inputStyle with:
```tsx
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 4,
  padding: '8px 12px', borderRadius: radius.input,
  border: `1px solid ${colors.border}`, fontSize: 13,
  boxSizing: 'border-box', fontFamily: 'inherit',
  color: colors.textBody, background: colors.cardBg,
};
```

**Submit button**: use `{ ...primaryButton, background: colors.tam }`.

**Cancel link**: use `{ ...secondaryButton }` styles as an `<a>` tag.

- [ ] **Step 4: Verify**

Navigate to http://localhost:5173/tam. Verify:
- "心 TÂM PILLAR" amber pill badge in header
- Category filter pills with amber active state
- Post cards with left amber/category-color border
- Points displayed in amber

- [ ] **Step 5: Commit**

```bash
git add code/src/web/dashboard/src/pages/TamFeed.tsx \
        code/src/web/dashboard/src/pages/TamPost.tsx
git commit -m "feat(ui): redesign TamFeed + TamPost — amber tint, category borders"
```

---

### Task 9: Tâm Leaderboard

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/TamLeaderboard.tsx`

- [ ] **Step 1: Read the full TamLeaderboard.tsx**

```bash
cat code/src/web/dashboard/src/pages/TamLeaderboard.tsx
```

Note the `LeaderboardEntry` interface (`userId`, `totalPoints`, `badgeCount`) and `MEDALS` constant.

- [ ] **Step 2: Rewrite TamLeaderboard.tsx**

```tsx
// code/src/web/dashboard/src/pages/TamLeaderboard.tsx
import { Link } from 'react-router-dom';
import { useTamFetch } from '../hooks/useDashboard';
import { colors, card, pageWrap, pageTitle, labelStyle, radius } from '../theme';

interface LeaderboardEntry {
  userId:      string;
  totalPoints: number;
  badgeCount:  number;
}

const TENANT_ID = 'a0000000-0000-0000-0000-000000000001';

const PODIUM_COLORS = ['#f59e0b', '#94a3b8', '#b45309'];
const PODIUM_LABELS = ['1st', '2nd', '3rd'];
const PODIUM_SIZES  = [80, 64, 64];

export function TamLeaderboard() {
  const { data, loading, error } = useTamFetch<LeaderboardEntry[]>(
    `/leaderboard?tenantId=${TENANT_ID}&limit=50`,
  );

  if (loading) return <div style={{ ...pageWrap, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: colors.textMuted }}>Loading…</span></div>;

  if (error) return <div style={{ ...pageWrap }}><span style={{ color: colors.danger }}>Failed to load leaderboard: {error}</span></div>;

  const top3 = (data ?? []).slice(0, 3);
  const rest  = (data ?? []).slice(3);

  if (!data || data.length === 0) {
    return (
      <main style={pageWrap}>
        <Link to="/tam" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>← Back to feed</Link>
        <div style={{ marginTop: 48, color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>No leaderboard data yet.</div>
      </main>
    );
  }

  return (
    <main style={pageWrap}>
      {/* Header */}
      <Link to="/tam" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: 16 }}>← Back to feed</Link>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.tamLight, color: colors.tam, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
        心 TÂM PILLAR
      </div>
      <h1 style={{ ...pageTitle, marginBottom: 4 }}>Impact Leaderboard</h1>
      <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20 }}>Top contributors this quarter · Vnext Japan</div>

      {/* Podium */}
      {top3.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 16 }}>🏆 Top 3</div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12 }}>
            {[top3[1], top3[0], top3[2]].filter(Boolean).map((entry, visualIdx) => {
              const rank     = visualIdx === 1 ? 0 : visualIdx === 0 ? 1 : 2;
              const initials = entry.userId.slice(0, 2).toUpperCase();
              const size     = PODIUM_SIZES[rank];
              return (
                <div key={entry.userId} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: size, height: size, borderRadius: '50%',
                    background: PODIUM_COLORS[rank], display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: rank === 0 ? 20 : 16, fontWeight: 800, color: '#fff',
                    border: `3px solid ${rank === 0 ? '#fbbf24' : colors.border}`,
                  }}>{initials}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colors.textBody, marginTop: 8 }}>{entry.userId}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: PODIUM_COLORS[rank], marginTop: 2 }}>{entry.totalPoints}</div>
                  <div style={{ fontSize: 10, color: colors.textMuted }}>pts</div>
                  <div style={{ marginTop: 4, background: `${PODIUM_COLORS[rank]}22`, color: PODIUM_COLORS[rank], fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: radius.pill }}>
                    {PODIUM_LABELS[rank]}
                  </div>
                  {entry.badgeCount > 0 && (
                    <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>🏅 {entry.badgeCount} badge{entry.badgeCount > 1 ? 's' : ''}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textBody, marginBottom: 14 }}>Full Rankings</div>
          {rest.map((entry, i) => {
            const rank     = i + 4;
            const initials = entry.userId.slice(0, 2).toUpperCase();
            const maxPts   = data[0]?.totalPoints ?? 1;
            return (
              <div key={entry.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${colors.border}` }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, width: 24, textAlign: 'center', flexShrink: 0 }}>#{rank}</div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: colors.tamLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: colors.tam, flexShrink: 0 }}>
                  {initials}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textBody, marginBottom: 4 }}>{entry.userId}</div>
                  <div style={{ height: 4, background: colors.tamLight, borderRadius: radius.pill, overflow: 'hidden' }}>
                    <div style={{ width: `${(entry.totalPoints / maxPts) * 100}%`, height: '100%', background: colors.tam, borderRadius: radius.pill }} />
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: colors.tam, minWidth: 48, textAlign: 'right' }}>{entry.totalPoints}</div>
                {entry.badgeCount > 0 && (
                  <div style={{ fontSize: 11, color: colors.textMuted, minWidth: 40, textAlign: 'right' }}>🏅 {entry.badgeCount}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Verify**

Navigate to http://localhost:5173/tam/leaderboard. Verify:
- "心 TÂM PILLAR" amber pill badge
- Top 3 podium cards with gold/silver/bronze colors and avatar circles
- Rankings list with amber progress bars

- [ ] **Step 3: Commit**

```bash
git add code/src/web/dashboard/src/pages/TamLeaderboard.tsx
git commit -m "feat(ui): redesign TamLeaderboard — podium cards, amber rankings"
```

---

### Task 10: Makoto Feed + Post Form

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/MakotoFeed.tsx`
- Modify: `code/src/web/dashboard/src/pages/MakotoPost.tsx`

- [ ] **Step 1: Read the full MakotoFeed.tsx and MakotoPost.tsx**

```bash
cat code/src/web/dashboard/src/pages/MakotoFeed.tsx
cat code/src/web/dashboard/src/pages/MakotoPost.tsx
```

Note: preserve ALL data fetching logic including the `null` path guard (`typeFilter === 'article' ? null : officialQuery`), `TENANT_ID`, `MakotoPost` interface, and `useMakotoFetch` calls.

- [ ] **Step 2: Update MakotoFeed.tsx**

Add import from theme:
```tsx
import { colors, card, pageWrap, pageTitle, radius, primaryButton, secondaryButton } from '../theme';
```

Remove local `card` constant.

**`<main>`**: `{ ...pageWrap }`.

**Page header**:
```tsx
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
  <div>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: colors.primaryLight, color: colors.primary, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: radius.pill, marginBottom: 8 }}>
      誠 MAKOTO PILLAR
    </div>
    <h1 style={{ ...pageTitle, margin: 0 }}>Makoto 誠 — Transparency & Knowledge</h1>
  </div>
  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
    <input placeholder="Search articles..." style={{ padding: '7px 12px', borderRadius: radius.input, border: `1px solid ${colors.border}`, fontSize: 12, color: colors.textBody, outline: 'none', width: 180 }} />
    {/* Type filter pills — All/Official/Articles */}
    <Link to="/makoto/new" style={{ ...primaryButton, textDecoration: 'none', display: 'inline-flex' }}>+ New Article</Link>
  </div>
</div>
```

**Official post cards** (amber left border):
```tsx
<div style={{ ...card, marginBottom: 10, borderLeft: `3px solid ${colors.tam}`, background: '#fffbeb' }}>
```

**Official badge**:
```tsx
<span style={{ fontSize: 10, fontWeight: 700, color: '#ea580c', background: '#ffedd5', padding: '2px 7px', borderRadius: radius.badge, textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>
  📌 Official
</span>
```

**Metric embed chips** (for official posts with `metric_refs`):
```tsx
<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginTop: 8 }}>
  {(post.metricRefs ?? []).map(ref => (
    <span key={ref} style={{ fontSize: 11, background: colors.primaryLight, color: colors.primary, padding: '2px 8px', borderRadius: radius.badge, fontWeight: 600 }}>
      {ref}
    </span>
  ))}
</div>
```

**Article post cards** (indigo left border):
```tsx
<div style={{ ...card, marginBottom: 10, borderLeft: `3px solid ${colors.primary}` }}>
```

**Article badge**:
```tsx
<span style={{ fontSize: 10, fontWeight: 700, color: colors.primary, background: colors.primaryLight, padding: '2px 7px', borderRadius: radius.badge, textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>
  📝 Article
</span>
```

**Card footer** (like + comment + read more):
```tsx
<div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12, color: colors.textMuted }}>
  <span>👍 {post.likeCount}</span>
  <span>💬 {post.commentCount} comments</span>
  <Link to={`/makoto/${post.id}`} style={{ marginLeft: 'auto', color: colors.primary, fontWeight: 600, textDecoration: 'none' }}>
    Read more →
  </Link>
</div>
```

- [ ] **Step 3: Update MakotoPost.tsx**

Add import: `import { colors, card, pageWrap, pageTitle, radius, primaryButton, secondaryButton } from '../theme';`

Remove local style objects.

**`<main>`**: `{ ...pageWrap }`.

**Form wrapper**: `{ ...card, maxWidth: 600, margin: '0 auto' }`.

**Post type selector pills** (Official / Article):
```tsx
{(['article', 'official'] as const).map(t => (
  <button
    key={t}
    onClick={() => setPostType(t)}
    style={{
      padding: '7px 20px', borderRadius: radius.pill, fontSize: 13, fontWeight: 600,
      border: 'none', cursor: 'pointer',
      background: postType === t ? colors.primary : colors.canvasBg,
      color:      postType === t ? '#fff'          : colors.textSecondary,
      boxShadow:  postType === t ? 'none'          : `0 0 0 1px ${colors.border}`,
    }}
  >
    {t === 'article' ? '📝 Article' : '📌 Official'}
  </button>
))}
```

**Input/textarea style**:
```tsx
const inputStyle: React.CSSProperties = {
  display: 'block', width: '100%', marginTop: 6,
  padding: '8px 12px', borderRadius: radius.input,
  border: `1px solid ${colors.border}`, fontSize: 13,
  boxSizing: 'border-box', fontFamily: 'inherit', color: colors.textBody,
};
```

**Submit**: `{ ...primaryButton }`. **Cancel**: `{ ...secondaryButton }`.

- [ ] **Step 4: Verify**

Navigate to http://localhost:5173/makoto. Verify:
- "誠 MAKOTO PILLAR" indigo pill badge
- Official posts have amber left border + amber background
- Article posts have indigo left border + white background
- "Read more →" links in indigo

- [ ] **Step 5: Commit**

```bash
git add code/src/web/dashboard/src/pages/MakotoFeed.tsx \
        code/src/web/dashboard/src/pages/MakotoPost.tsx
git commit -m "feat(ui): redesign MakotoFeed + MakotoPost — official amber, article indigo"
```

---

### Task 11: Makoto Article Detail

`depends_on: [2]`

**Files:**
- Modify: `code/src/web/dashboard/src/pages/MakotoArticle.tsx`

- [ ] **Step 1: Read the full MakotoArticle.tsx**

```bash
cat code/src/web/dashboard/src/pages/MakotoArticle.tsx
```

Note: preserve ALL data fetching, state (liked, commentBody, replyState), and handler functions (handleLike, handleAddComment). Only the visual presentation changes.

- [ ] **Step 2: Update MakotoArticle.tsx**

Add import: `import { colors, card, pageWrap, pageTitle, radius, primaryButton } from '../theme';`

Remove local style constants.

**`<main>`**: `{ ...pageWrap }`.

**Content max-width wrapper**: `{ maxWidth: 720, margin: '0 auto' }`.

**Back link**:
```tsx
<Link to="/makoto" style={{ fontSize: 13, color: colors.primary, textDecoration: 'none', fontWeight: 600, display: 'inline-block', marginBottom: 20 }}>
  ← Back to Makoto
</Link>
```

**Article header**:
```tsx
<div style={{ marginBottom: 20 }}>
  <span style={{ fontSize: 10, fontWeight: 700, color: colors.primary, background: colors.primaryLight, padding: '2px 7px', borderRadius: radius.badge, textTransform: 'uppercase' as const, letterSpacing: '.05em' }}>
    {post.postType === 'official' ? '📌 Official' : '📝 Article'}
  </span>
  <h2 style={{ margin: '10px 0 6px', fontSize: 20, fontWeight: 800, color: colors.textHeading }}>{post.title}</h2>
  <div style={{ fontSize: 12, color: colors.textSecondary }}>{post.authorUserId} · {new Date(post.createdAt).toLocaleDateString()}</div>
</div>
```

**Article body**:
```tsx
<div style={{ fontSize: 14, color: colors.textBody, lineHeight: 1.7, marginBottom: 24, paddingBottom: 24, borderBottom: `1px solid ${colors.border}` }}>
  {post.body}
</div>
```

**Reactions bar**:
```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
  <button
    onClick={handleLike}
    style={{
      ...primaryButton,
      background: liked ? colors.primary : colors.cardBg,
      color:      liked ? '#fff'          : colors.primary,
      border:     `1px solid ${colors.primary}`,
    }}
  >
    👍 Like · {likeCount}
  </button>
  <span style={{ fontSize: 13, color: colors.textMuted }}>💬 {comments.length} comments</span>
</div>
```

**Avatar** (initials circle):
```tsx
function Avatar({ initials, size = 28, accent = colors.primaryLight, textColor = colors.primary }: {
  initials: string; size?: number; accent?: string; textColor?: string;
}) {
  return (
    <div style={{ width: size, height: size, background: accent, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: textColor }}>
      {initials}
    </div>
  );
}
```

**Comment bubble**:
```tsx
<div style={{ background: colors.canvasBg, border: `1px solid ${colors.border}`, borderRadius: radius.button, padding: '10px 12px' }}>
  <div style={{ fontSize: 12, fontWeight: 600, color: colors.textBody }}>{comment.authorUserId} <span style={{ fontWeight: 400, color: colors.textMuted }}>· {new Date(comment.createdAt).toLocaleDateString()}</span></div>
  <div style={{ fontSize: 13, color: colors.textBody, marginTop: 4 }}>{comment.body}</div>
</div>
<div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, paddingLeft: 4 }}>
  <span style={{ color: colors.primary, cursor: 'pointer', fontWeight: 600 }} onClick={() => setReplyTo(comment.id)}>Reply</span>
</div>
```

**Add comment textarea**:
```tsx
<textarea
  value={commentBody}
  onChange={e => setCommentBody(e.target.value)}
  placeholder="Add a comment..."
  rows={2}
  style={{ width: '100%', padding: '8px 12px', borderRadius: radius.input, border: `1px solid ${colors.border}`, fontSize: 13, fontFamily: 'inherit', color: colors.textBody, resize: 'vertical', boxSizing: 'border-box' as const }}
/>
<div style={{ textAlign: 'right', marginTop: 6 }}>
  <button onClick={() => handleAddComment()} style={primaryButton}>Post</button>
</div>
```

- [ ] **Step 3: Verify**

Navigate to any article at http://localhost:5173/makoto/:id. Verify:
- Clean single-column reading layout (max-width 720px)
- Indigo "Like" toggle button
- Comment bubbles with avatar initials and gray background
- Reply button in indigo

- [ ] **Step 4: Commit**

```bash
git add code/src/web/dashboard/src/pages/MakotoArticle.tsx
git commit -m "feat(ui): redesign MakotoArticle — single-column reading layout, threaded comments"
```

---

## Self-Review Checklist

Run after all tasks are complete.

- [ ] All 14 pages open without JS errors in the browser console
- [ ] Sidebar hover expand/collapse works on all pages
- [ ] No hardcoded `#0ea5a0` (old teal) remaining in any page file
- [ ] `npm run test` passes clean
- [ ] Carbon pages show emerald numbers
- [ ] Tâm pages show amber numbers and amber active pills
- [ ] Makoto official posts show amber left border; article posts show indigo left border
- [ ] Login page shows full indigo background (not #f8fafc)
- [ ] Inter font is loading (check Network tab in DevTools → filter "fonts")
