import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import AuthModal from '../components/AuthModal';
import '../styles/dashboard.css';

const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_URL = rawUrl.replace(/\/+$/, '');

export default function UserDashboard() {
  const { user, token, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('global'); // 'global' | 'my-breakdowns' | 'saved-threads'
  const [globalFeed, setGlobalFeed] = useState([]);
  const [myBreakdowns, setMyBreakdowns] = useState([]);
  const [savedThreads, setSavedThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    fetchGlobalFeed();
    if (isAuthenticated) {
      fetchMyData();
    }
  }, [isAuthenticated]);

  const fetchGlobalFeed = async () => {
    try {
      const res = await fetch(`${API_URL}/breakdown/global`);
      if (res.ok) {
        const data = await res.json();
        setGlobalFeed(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const [bRes, tRes] = await Promise.all([
        fetch(`${API_URL}/breakdown/my-breakdowns`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/forum/saved-posts`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (bRes.ok) setMyBreakdowns(await bRes.json());
      if (tRes.ok) setSavedThreads(await tRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated && activeTab !== 'global') {
    return (
      <div className="placeholder-container">
        <span className="material-symbols-outlined placeholder-icon">lock</span>
        <h2>Inicia sesión para ver tu actividad</h2>
        <p>Accede a tus análisis guardados, historial personal y estadísticas.</p>
        <button onClick={() => setShowAuthModal(true)} className="btn-primary" style={{ marginTop: '14px' }}>
          Iniciar Sesión
        </button>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      {/* Resumen de Métricas */}
      <section className="stats-grid">
        <div className="stat-card">
          <span className="material-symbols-outlined stat-icon">analytics</span>
          <div>
            <div className="stat-value">{myBreakdowns.length}</div>
            <div className="stat-label">Análisis personales</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-symbols-outlined stat-icon">bookmark</span>
          <div>
            <div className="stat-value">{savedThreads.length}</div>
            <div className="stat-label">Threads guardados</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="material-symbols-outlined stat-icon">verified</span>
          <div>
            <div className="stat-value">Nivel 1</div>
            <div className="stat-label">Verificador Cívico</div>
          </div>
        </div>
      </section>

      {/* Navegación por pestañas */}
      <div className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === 'global' ? 'active' : ''}`}
          onClick={() => setActiveTab('global')}
        >
          Explorar Global
        </button>
        <button
          className={`tab-btn ${activeTab === 'my-breakdowns' ? 'active' : ''}`}
          onClick={() => setActiveTab('my-breakdowns')}
        >
          Mis Análisis ({myBreakdowns.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'saved-threads' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved-threads')}
        >
          Guardados ({savedThreads.length})
        </button>
      </div>

      {/* Contenido según pestaña */}
      <div className="feed-grid">
        {activeTab === 'global' && (
          globalFeed.map((item) => (
            <div key={item.id} className="feed-card">
              <div className="feed-header">
                <span>Inspección por @{item.author}</span>
                <span>{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <h4 className="feed-prompt">{item.prompt_received}</h4>
              <p className="feed-summary">{item.neutral_summary}</p>
            </div>
          ))
        )}

        {activeTab === 'my-breakdowns' && (
          myBreakdowns.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No tienes análisis recientes.</p>
          ) : (
            myBreakdowns.map((item) => (
              <div key={item.id} className="feed-card">
                <div className="feed-header">
                  <span>ID: {item.id}</span>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h4 className="feed-prompt">{item.prompt_received}</h4>
                <p className="feed-summary">{item.neutral_summary}</p>
              </div>
            ))
          )
        )}

        {activeTab === 'saved-threads' && (
          savedThreads.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>No has guardado ningún thread aún.</p>
          ) : (
            savedThreads.map((thread) => (
              <div key={thread.id} className="feed-card">
                <div className="feed-header">
                  <span>Iniciado por @{thread.author}</span>
                  <span>{thread.comments_count} respuestas</span>
                </div>
                <h4 className="feed-prompt">{thread.title}</h4>
                <p className="feed-summary">{thread.summary}</p>
                <Link to="/foro" style={{ display: 'inline-block', marginTop: '8px', fontSize: '0.85rem', color: '#2563eb' }}>
                  Ver en el foro →
                </Link>
              </div>
            ))
          )
        )}
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}