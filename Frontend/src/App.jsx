import React, { useState } from 'react';
import StatusBadge from './components/StatusBadge';
import './styles/breakdown.css';

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
    <div className="app-container">
      <header className="app-header">
        <h2 className="app-title">AI Breakdown</h2>
        <StatusBadge apiUrl={API_URL} />
      </header>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {!dashboardData ? (
        <form onSubmit={handleSubmit} className="breakdown-form">
          <textarea
            rows="4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe tu requerimiento, contexto o problema..."
            className="prompt-textarea"
            disabled={loading}
          />

          <div className="form-actions">
            <label className="file-upload-label">
              <span className="material-symbols-outlined">attach_file</span>
              <span>{file ? file.name : "Adjuntar PDF o Imagen"}</span>
              <input
                type="file"
                accept=".png, .jpg, .jpeg, .pdf"
                onChange={(e) => setFile(e.target.files[0] || null)}
                className="file-input-hidden"
                disabled={loading}
              />
            </label>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="submit-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              <span>{loading ? 'Procesando...' : 'Generar'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="dashboard-card">
          <div className="dashboard-header">
            <div>
              <span className="request-id">ID DE ANÁLISIS: {dashboardData.request_id}</span>
              <h3 className="dashboard-title">Inspección y Alfabetización Mediática</h3>
            </div>
            <button onClick={handleReset} className="reset-btn">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
              Nueva consulta
            </button>
          </div>

          <section className="section-block">
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>subject</span>
              Resumen Objetivo
            </h4>
            <p className="section-text">{dashboardData.neutral_summary}</p>
          </section>

          <section className="section-block">
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>find_in_page</span>
              Factores de Análisis Crítico
            </h4>
            <div className="critical-list">
              {dashboardData.critical_analysis_points.map((point, index) => (
                <div key={index} className="critical-card">
                  <strong>{point.indicator}</strong>
                  <p>{point.observation}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="educational-box">
            <h4 className="educational-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
              Criterio de Evaluación Futura
            </h4>
            <p className="educational-text">{dashboardData.educational_insights}</p>
          </section>

          <section>
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
              Ruta de Verificación y Seguridad
            </h4>
            <div className="actions-grid">
              {dashboardData.recommended_actions.map((act, index) => (
                <div key={index} className="action-card">
                  <span className="action-category">{act.category}</span>
                  <span className="action-guideline">{act.guideline}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}