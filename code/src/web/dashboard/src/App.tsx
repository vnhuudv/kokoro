import { Routes, Route } from 'react-router-dom';
import { Nav } from './components/Nav';
import { TeamView } from './pages/TeamView';
import { PersonalView } from './pages/PersonalView';
import { PublicView } from './pages/PublicView';
import { CarbonView } from './pages/CarbonView';

export default function App() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <Nav />
      <Routes>
        <Route path="/"       element={<TeamView />} />
        <Route path="/me"     element={<PersonalView />} />
        <Route path="/public" element={<PublicView />} />
        <Route path="/carbon" element={<CarbonView />} />
      </Routes>
    </div>
  );
}
