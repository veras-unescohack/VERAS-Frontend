import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import AuthModal from './AuthModal';
import { useAuth } from '../context/AuthContext';
import StatusBadge from './StatusBadge';
import '../styles/navigation.css';

export default function Navigation({ apiUrl }) {
  const { user, logout, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="app-header">
        <div className="header-left">
          <Link to="/" className="brand-link">
            <span className="material-symbols-outlined brand-icon">verified_user</span>
            <span className="brand-name">VERAS</span>
          </Link>

          <nav className="nav-links">
            <NavLink to="/breakdown" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Media Breakdown</span>
              <span className="nav-icon material-symbols-outlined">manufacturing</span>
            </NavLink>
            <NavLink to="/foro" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Foro</span>
              <span className="nav-icon material-symbols-outlined">forum</span>
            </NavLink>
          </nav>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <StatusBadge apiUrl={apiUrl} />
          {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>@{user}</span>
                <button onClick={logout} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.78rem' }}>
                  Salir
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.82rem' }}>
                Entrar
              </button>
            )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
