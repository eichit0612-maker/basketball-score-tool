import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Setup from './pages/Setup';
import Live from './pages/Live';
import BoxScore from './pages/BoxScore';
import Season from './pages/Season';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/game/:id/setup" element={<Setup />} />
      <Route path="/game/:id/live" element={<Live />} />
      <Route path="/game/:id/box" element={<BoxScore />} />
      <Route path="/season" element={<Season />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
