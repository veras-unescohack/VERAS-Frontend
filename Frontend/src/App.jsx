import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navigation';
import About from './pages/About';
import MediaBreakdown from './pages/MediaBreakdown';
import CommunityForum from './pages/CommunityForum';
import './styles/index.css'
import GovernanceGuide from './pages/GovernanceGuide';
import UserDashboard from './pages/UserDashboard';

const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-container">
          <Navbar apiUrl={API_URL} />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<About />} />
              <Route path="/breakdown" element={<MediaBreakdown />} />
              <Route path="/forum" element={<CommunityForum />} />
              <Route path="/governance" element={<GovernanceGuide />} />
              <Route path="/dashboard" element={<UserDashboard />} />
              {/* Redirección por defecto si la ruta no existe */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}