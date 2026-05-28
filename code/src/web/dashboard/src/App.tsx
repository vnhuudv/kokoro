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
import { LoginView } from './pages/LoginView';
import { AuthCallback } from './pages/AuthCallback';
import { useAuth } from './hooks/useAuth';

function AuthLayout() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <Nav />
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
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
        </Route>
      </Routes>
    </div>
  );
}
