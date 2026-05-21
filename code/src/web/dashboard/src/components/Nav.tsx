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
  background: '#f1f5f9',
  color: '#0ea5a0',
};

export function Nav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '12px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
      <span style={{ fontWeight: 700, color: '#0ea5a0', marginRight: 24, fontSize: 16 }}>Kokoro 心</span>
      <NavLink to="/"       style={({ isActive }) => isActive ? activeLink : link}>Team</NavLink>
      <NavLink to="/me"     style={({ isActive }) => isActive ? activeLink : link}>My Fluency</NavLink>
      <NavLink to="/public" style={({ isActive }) => isActive ? activeLink : link}>Pilot Results</NavLink>
    </nav>
  );
}
