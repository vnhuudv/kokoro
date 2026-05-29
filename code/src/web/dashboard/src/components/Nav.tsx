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
      <div style={{ height: 1, background: colors.sidebarActive, margin: '8px 0' }} />
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
        paddingTop: 12, borderTop: `1px solid ${colors.sidebarActive}`, overflow: 'hidden',
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
