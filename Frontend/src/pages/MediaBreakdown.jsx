import React, { useState } from 'react';
import { processAndValidateFile } from '../utils/fileCompressor';
import { useAuth } from '../context/AuthContext';
import './../styles/breakdown.css';

const rawUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_URL = rawUrl.replace(/\/+$/, '');

export default function MediaBreakdown() {
  const { token, isAuthenticated } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  const handleFileChange = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;

    setProcessingFile(true);
    setErrorMsg('');

    try {
      const optimized = await processAndValidateFile(rawFile, {
        maxImageDimension: 1280,
        quality: 0.75,
        maxPdfSizeMB: 5,
      });

      setFile(optimized);

      if (optimized.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(optimized));
      } else {
        setPreviewUrl(null);
      }
    } catch (err) {
      setErrorMsg(err.message);
      handleRemoveFile();
    } finally {
      setProcessingFile(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || processingFile) return;

    setLoading(true);
    setErrorMsg('');

    const formData = new FormData();
    formData.append('prompt', prompt.trim());
    formData.append('is_public', isPublic.toString());
    if (file) {
      formData.append('file', file);
    }

    const headers = {};
    if (isAuthenticated && token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_URL}/breakdown`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error ${response.status}: No se pudo procesar la solicitud.`);
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      setErrorMsg(err.message || 'No fue posible conectar con el backend. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    handleRemoveFile();
    setDashboardData(null);
    setPrompt('');
    setIsPublic(false);
    setErrorMsg('');
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h2 className="app-title">Media Breakdown Service</h2>
      </header>

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {!dashboardData ? (
        <form onSubmit={handleSubmit} className="breakdown-form">
          <textarea
            rows="4"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pega el texto, afirmación o contexto que deseas someter a análisis crítico..."
            className="prompt-textarea"
            disabled={loading}
          />

          {/* Miniatura / Vista Previa */}
          {file && (
            <div className="file-preview-container">
              {previewUrl ? (
                <img src={previewUrl} alt="Vista previa" className="image-thumbnail" />
              ) : (
                <div className="pdf-thumbnail-icon">
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                </div>
              )}
              <div className="file-preview-info">
                <span className="file-preview-name">{file.name}</span>
                <span className="file-preview-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="remove-file-btn"
                title="Eliminar archivo"
                disabled={loading}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          )}

          {/* Consentimiento de publicación global */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
            <input
              type="checkbox"
              id="isPublicConsent"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={loading}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="isPublicConsent" style={{ cursor: 'pointer' }}>
              Permitir que este análisis aparezca de forma anónima en el <b>Feed Global</b> de la comunidad.
            </label>
          </div>

          <div className="form-actions">
            <label className="file-upload-label">
              <span className="material-symbols-outlined">attach_file</span>
              <span>{file ? "Cambiar archivo" : "Adjuntar PDF o Imagen"}</span>
              <input
                type="file"
                accept=".png, .jpg, .jpeg, .pdf"
                onChange={handleFileChange}
                className="file-input-hidden"
                disabled={loading || processingFile}
              />
            </label>

            <button
              type="submit"
              disabled={loading || processingFile || !prompt.trim()}
              className="submit-btn"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>
              <span>{loading ? 'Analizando...' : processingFile ? 'Comprimiendo...' : 'Generar'}</span>
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

          {/* Consulta Evaluada */}
          <div className="user-prompt-box">
            <span className="user-prompt-label">Consulta Evaluada</span>
            <p className="user-prompt-text">{dashboardData.prompt_received}</p>
          </div>

          {/* Resumen Objetivo */}
          <section className="section-block">
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>subject</span>
              Resumen Objetivo
            </h4>
            <p className="section-text">{dashboardData.neutral_summary}</p>
          </section>

          {/* Factores de Análisis Crítico */}
          <section className="section-block">
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>find_in_page</span>
              Factores de Análisis Crítico
            </h4>
            <div className="critical-list">
              {dashboardData.critical_analysis_points?.map((point, index) => (
                <div key={index} className="critical-card">
                  <strong>{point.indicator}</strong>
                  <p>{point.observation}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Criterio Educativo */}
          <section className="educational-box">
            <h4 className="educational-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
              Criterio de Evaluación Futura
            </h4>
            <p className="educational-text">{dashboardData.educational_insights}</p>
          </section>

          {/* Acciones Recomendadas */}
          <section>
            <h4 className="section-heading">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
              Ruta de Verificación y Seguridad
            </h4>
            <div className="actions-grid">
              {dashboardData.recommended_actions?.map((act, index) => (
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