import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/about.css'

export default function About() {
  return (
    <div className="page-view">
      <section className="about-hero">
        <h1 className="hero-title">VERAS - DEMO</h1>
        <h2 className="hero-title">Media Information Literacy (MIL)</h2>
        <p className="hero-subtitle">
          A platform designed to fight misinformation by equipping users with tools for forensic analysis, source verification, and digital education.
        </p>
        <div className="hero-actions">
          <Link to="/breakdown" className="primary-cta-btn">
            Test App
            <span className="material-symbols-outlined">rocket_launch</span>
          </Link>
        </div>
      </section>

      <section className='about-deployment'>
        <h3>Deployment Considerations</h3>
        <ul>
          <li>This App is still in development</li>
          <li>This is a Free Hosted Demo (may be slow because of the tier limits)</li>
          <li>The backend needs around 1 minute to boot-up (<a href='https://render.com/docs/free#spinning-down-on-idle' target='blank'>Render <span className="material-symbols-outlined">open_in_new</span></a> constrain)</li>
        </ul>
      </section>

      <section className='about-section'>
        <h2>Core concepts</h2>
        <div className="about-pillars">

          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">visibility</span>
            <h3>De-Biased Analysis</h3>
            <p>We evaluate content patterns and biases without making arbitrary judgments.</p>
          </div>
          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">school</span>
            <h3>Educación Continua</h3>
            <p>Aprende a identificar inconsistencias visuales, lógicas y contextuales por tu cuenta.</p>
          </div>
          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">security</span>
            <h3>Rutas de Seguridad</h3>
            <p>Directrices claras para contrastar información y proteger tu integridad digital.</p>
          </div>
        </div>
      </section>

    </div>
  );
}