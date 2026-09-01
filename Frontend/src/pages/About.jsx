import React from 'react';
import { Link } from 'react-router-dom';
import './../styles/about.css';

export default function About() {
  return (
    <div className="page-view">
      {/* Hero Section */}
      <section className="about-hero">
        <h1 className="hero-title">VERAS - DEMO</h1>
        <h2 className="hero-subtitle-tag">Media & Information Literacy (MIL)</h2>
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

      {/* Deployment Notice */}
      <section className="about-deployment">
        <h2>Deployment Notice</h2>
        <ul className="deployment-list">
          <li>This is a lightweight functional prototype deployed for evaluation purposes.</li>
          <li>Hosted on free compute tiers: response times may vary based on cloud limits.</li>
          <li>
            Backend services require ~50 seconds to spin up on cold start (
            <a href="https://render.com/docs/free#spinning-down-on-idle" target="_blank" rel="noopener noreferrer">
              Render sleep policy <span className="material-symbols-outlined icon-inline">open_in_new</span>
            </a>
            ).
          </li>
        </ul>
      </section>

      {/* Tech Stack Minimal Banner */}
      <section className="stack-strip">
        <span className="stack-strip-label">Powered by:</span>
        <div className="stack-pills">
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">auto_awesome</span>
            <span>Gemini API</span>
          </div>
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">code_blocks</span>
            <span>FastAPI</span>
          </div>
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">web</span>
            <span>React</span>
          </div>
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">database</span>
            <span>MongoDB Atlas</span>
          </div>
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">speed</span>
            <span>Upstash Redis</span>
          </div>
          <div className="stack-pill">
            <span className="material-symbols-outlined stack-icon">cloud_upload</span>
            <span>Supabase Storage</span>
          </div>
        </div>
      </section>

      {/* Step-by-Step Quick Start Guide */}
      <section className="about-section">
        <h2 className="section-title">Step-by-Step Workflow</h2>
        <div className="steps-container">
          
          <div className="step-row">
            <div className="step-indicator">
              <div className="step-circle">1</div>
              <div className="step-line"></div>
            </div>
            <div className="step-body">
              <div className="step-header">
                <h3>Inspect Suspicious Media & Claims</h3>
                <Link to="/breakdown" className="step-action-link">Open Inspector →</Link>
              </div>
              <p>
                Upload an image, PDF document, or paste a doubtful statement. The system generates an unbiased forensic summary, spots logical biases, and suggests verification protocols.
              </p>
            </div>
          </div>

          <div className="step-row">
            <div className="step-indicator">
              <div className="step-circle">2</div>
              <div className="step-line"></div>
            </div>
            <div className="step-body">
              <div className="step-header">
                <h3>Engage in Community Verification</h3>
                <Link to="/foro" className="step-action-link">Explore Forum →</Link>
              </div>
              <p>
                Start a public thread or contribute sources to existing debates. AI automatically extracts titles, summaries, and tags while enforcing strict content safety and hate-speech moderation.
              </p>
            </div>
          </div>

          <div className="step-row">
            <div className="step-indicator">
              <div className="step-circle">3</div>
              <div className="step-line"></div>
            </div>
            <div className="step-body">
              <div className="step-header">
                <h3>Access Official Emergency Directories</h3>
                <Link to="/guia-gobierno" className="step-action-link">View Directory →</Link>
              </div>
              <p>
                Reach verified public institutions, cyber-police hotlines, and mental health support services with real-time country detection and step-by-step evidence preservation guidelines.
              </p>
            </div>
          </div>

          <div className="step-row">
            <div className="step-indicator">
              <div className="step-circle">4</div>
            </div>
            <div className="step-body">
              <div className="step-header">
                <h3>Track Insights & Saved Debates</h3>
                <Link to="/dashboard" className="step-action-link">Go to Dashboard →</Link>
              </div>
              <p>
                Review community breakdowns, inspect your private analysis history, and keep track of bookmarked discussions in one unified workspace.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Core Pillars */}
      <section className="about-section">
        <h2 className="section-title">Core Pillars</h2>
        <div className="about-pillars">
          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">visibility</span>
            <h3>De-Biased Evaluation</h3>
            <p>Systematic breakdown of logical fallacies, emotional framing, and lack of attribution without arbitrary censorship.</p>
          </div>
          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">school</span>
            <h3>Continuous Literacy</h3>
            <p>Equips citizens with practical heuristics to autonomously detect manipulated digital media and out-of-context assets.</p>
          </div>
          <div className="pillar-card">
            <span className="material-symbols-outlined pillar-icon">security</span>
            <h3>Civic Protection</h3>
            <p>Direct bridge between online verification and real-world legal, financial, and psychological support entities.</p>
          </div>
        </div>
      </section>
    </div>
  );
}