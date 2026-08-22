import React, { useState, useEffect } from 'react';

export default function StatusBadge({ apiUrl }) {
  const [status, setStatus] = useState('checking'); // checking | waking | ready | error

  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const res = await fetch(`${apiUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setStatus('waking'); // Render tardando en responder
      } else {
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const config = {
    checking: { text: "Checking...", color: "#94a3b8", icon: "sync" },
    waking: { text: "Waking...", color: "#f59e0b", icon: "hourglass_top" },
    ready: { text: "Connected", color: "#10b981", icon: "check_circle" },
    error: { text: "Unavailable", color: "#ef4444", icon: "error" }
  }[status];

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: config.color }}>
      <span style={{ fontSize: '10px', color: 'gray', width: '40px', textAlign: 'right', padding: '0 5px', borderRight: '1px gray solid'}}>Backend status</span>
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{config.icon}</span>
      <span>{config.text}</span>
    </div>
  );
}