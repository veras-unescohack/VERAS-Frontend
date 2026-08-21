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
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '24px', background: '#ffffff' }}>
            {/* Encabezado */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>ID DE ANÁLISIS: {dashboardData.request_id}</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#0f172a' }}>Inspección y Alfabetización Mediática</h3>
              </div>
              <button
                onClick={handleReset}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                Nueva consulta
              </button>
            </div>

            {/* Resumen Objetivo */}
            <section style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>subject</span>
                Resumen Objetivo
              </h4>
              <p style={{ lineHeight: '1.6', color: '#475569', margin: 0 }}>{dashboardData.neutral_summary}</p>
            </section>

            {/* Puntos de Análisis Crítico */}
            <section style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>find_in_page</span>
                Factores de Análisis Crítico
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dashboardData.critical_analysis_points.map((point, index) => (
                  <div key={index} style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#1e293b' }}>{point.indicator}</strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#475569', lineHeight: '1.5' }}>{point.observation}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Lección / Educación Mediática */}
            <section style={{ marginBottom: '24px', background: '#f0fdf4', padding: '16px', borderRadius: '6px', border: '1px solid #dcfce7' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
                Criterio de Evaluación Futura
              </h4>
              <p style={{ lineHeight: '1.5', color: '#15803d', margin: 0, fontSize: '0.9rem' }}>{dashboardData.educational_insights}</p>
            </section>

            {/* Acciones Recomendadas */}
            <section>
              <h4 style={{ margin: '0 0 12px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
                Ruta de Verificación y Seguridad
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                {dashboardData.recommended_actions.map((act, index) => (
                  <div key={index} style={{ padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', textTransform: 'uppercase' }}>{act.category}</span>
                    <span style={{ fontSize: '0.88rem', color: '#334155' }}>{act.guideline}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
    </div>
  );
}