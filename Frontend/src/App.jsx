import React, { useState } from 'react';
import StatusBadge from './components/StatusBadge';

// const API_URL = process.env.REACT_APP_API_URL;
const API_URL = import.meta.env.VITE_BACKEND_URL;

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('prompt', prompt);
    if (file) {
      formData.append('file', file);
    }

    try {
      const response = await fetch(`${API_URL}/breakdown`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: No se pudo procesar la solicitud.`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setErrorMsg('No fue posible conectar con el backend. Puede que el servicio siga levantando en Render o haya fallado.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDashboardData(null);
    setPrompt('');
    setFile(null);
    setErrorMsg('');
  };

  return (
    <div style={{ maxWidth: '720px', margin: '40px auto', padding: '0 20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, fontWeight: 600 }}>AI Breakdown</h2>
        <StatusBadge apiUrl={API_URL} />
      </header>

      {errorMsg && (
        <div style={{ padding: '12px', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem' }}>
          {errorMsg}
        </div>
      )}

      {!dashboardData ? (
        /* Formulario tipo IA */
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h1>{console.log(API_URL)}</h1>
          <textarea
            rows="4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe tu requerimiento, contexto o problema..."
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem', resize: 'vertical' }}
            disabled={loading}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem', color: '#555' }}>
              <span className="material-symbols-outlined">attach_file</span>
              <span>{file ? file.name : "Adjuntar PDF o Imagen"}</span>
              <input
                type="file"
                accept=".png, .jpg, .jpeg, .pdf"
                onChange={(e) => setFile(e.target.files[0] || null)}
                style={{ display: 'none' }}
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              <span>{loading ? 'Procesando...' : 'Generar'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* Dashboard UI que reemplaza el formulario */
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>ID: {dashboardData.request_id}</span>
              <h3 style={{ margin: '4px 0 0 0' }}>Resumen del Análisis</h3>
            </div>
            <button
              onClick={handleReset}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              Nuevo
            </button>
          </div>

          <section style={{ marginBottom: '20px' }}>
            <p style={{ lineHeight: '1.6', color: '#374151' }}>{dashboardData.summary}</p>
          </section>

          <section>
            <h4 style={{ margin: '0 0 10px 0' }}>Acciones Recomendadas</h4>
            <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6', color: '#374151' }}>
              {dashboardData.recommended_actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}