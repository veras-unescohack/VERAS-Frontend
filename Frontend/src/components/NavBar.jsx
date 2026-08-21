import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function Navbar({ apiUrl }) {
  return (
    <header className="app-header">
      <div className="header-left">
        <Link to="/" className="brand-link">
          <span className="material-symbols-outlined brand-icon">verified_user</span>
          <span className="brand-name">VERAS</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            About
          </NavLink>
          <NavLink to="/breakdown" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Media Breakdown
          </NavLink>
          <NavLink to="/foro" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Foro
          </NavLink>
          <NavLink to="/guia-gobierno" className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            Guía de Gobierno
          </NavLink>
        </nav>
      </div>

      <div className="header-right">
        <StatusBadge apiUrl={apiUrl} />
      </div>
    </header>
  );
}