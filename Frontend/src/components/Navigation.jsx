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
            <NavLink to="/home" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Home</span>
              <span className="nav-icon material-symbols-outlined">home</span>
            </NavLink>
            <NavLink to="/breakdown" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Media Breakdown</span>
              <span className="nav-icon material-symbols-outlined">manufacturing</span>
            </NavLink>
            <NavLink to="/foro" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Community Forum</span>
              <span className="nav-icon material-symbols-outlined">forum</span>
            </NavLink>
            <NavLink to="/guide" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
              <span className="nav-text">Guide</span>
              <span className="nav-icon material-symbols-outlined">route</span>
            </NavLink>
          </nav>
        </div>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <StatusBadge apiUrl={apiUrl} />
          {isAuthenticated ? (
              <div className="auth-section">
                <span className="auth-user">@{user}</span>
                <button onClick={logout} className="btn-secondary">
                  <span className='auth-btn-text'>Logout</span>
                  <span className='auth-btn-icon material-symbols-outlined'>logout</span>
                </button>
              </div>
            ) : (
              <button onClick={() => setShowAuthModal(true)} className="btn-primary">
                <span className='auth-btn-text'>Login</span>
                <span className='auth-btn-icon material-symbols-outlined'>login</span>
              </button>
            )}
        </div>
      </header>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
