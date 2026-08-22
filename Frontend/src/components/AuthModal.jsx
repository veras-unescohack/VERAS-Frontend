import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_URL = rawUrl.replace(/\/+$/, '');

export default function AuthModal({ isOpen, onClose }) {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3 || username.trim().length > 30) {
      setError('El usuario debe tener entre 3 y 30 caracteres.');
      return;
    }

    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setLoading(true);
    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim().toLowerCase(), 
          password 
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Error en la autenticación');
      }

      login(data.access_token, data.username);
      setUsername('');
      setPassword('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '380px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>
          {isRegister ? 'Crear Cuenta' : 'Iniciar Sesión'}
        </h3>

        {error && <div className="error-banner" style={{ margin: 0 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <input
              type="text"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="modal-input"
              minLength={3}
              maxLength={30}
              required
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
              Longitud: 3 a 30 caracteres (sin espacios).
            </span>
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="modal-input"
              minLength={4}
              required
            />
            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '3px' }}>
              Mínimo 4 caracteres.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.82rem', cursor: 'pointer', padding: 0 }}
            >
              {isRegister ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}