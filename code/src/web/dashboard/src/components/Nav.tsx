import { NavLink } from 'react-router-dom';

const link: React.CSSProperties = {
  textDecoration: 'none',
  color: '#64748b',
  fontWeight: 500,
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 14,
};

const activeLink: React.CSSProperties = {
  ...link,
  background: '#f0fdfb',
  color: '#0ea5a0',
};

export function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
      <div style={{ marginRight: 28 }}>
        <span style={{ fontWeight: 800, color: '#0ea5a0', fontSize: 17 }}>Kokoro 心</span>
        <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 10 }}>Cross-cultural fluency · Vnext Japan pilot</span>
      </div>
      <NavLink to="/"       style={({ isActive }) => isActive ? activeLink : link}>Team</NavLink>
      <NavLink to="/me"     style={({ isActive }) => isActive ? activeLink : link}>My Fluency</NavLink>
      <NavLink to="/public" style={({ isActive }) => isActive ? activeLink : link}>Pilot Results</NavLink>
      <NavLink to="/carbon" style={({ isActive }) => isActive ? activeLink : link}>Carbon 命</NavLink>
      <NavLink to="/tam"    style={({ isActive }) => isActive ? activeLink : link}>Tâm 心</NavLink>
      <NavLink to="/makoto" style={({ isActive }) => isActive ? activeLink : link}>Makoto 誠</NavLink>
    </nav>
  );
}
