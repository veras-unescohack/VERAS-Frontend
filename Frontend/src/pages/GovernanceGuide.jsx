import React, { useState, useEffect } from 'react';
import '../styles/governance.css';

// Directorio categorizado por código de país (ISO Alpha-2)
const DIRECTORY_DATA = {
  MX: {
    countryName: 'México',
    services: [
      {
        id: 'mx-1',
        category: 'ciberseguridad',
        categoryLabel: 'Policía Cibernética',
        name: 'Policía Cibernética (SSC / Guardia Nacional)',
        desc: 'Atención a fraudes digitales, suplantación de identidad, acoso y amenazas en plataformas digitales.',
        phone: '55 5242 5100',
        url: 'https://www.gob.mx/guardianacional',
      },
      {
        id: 'mx-2',
        category: 'psicologico',
        categoryLabel: 'Salud Mental',
        name: 'Línea de la Vida',
        desc: 'Servicio gratuito y confidencial de apoyo emocional y prevención en situaciones de crisis 24/7.',
        phone: '800 911 2000',
        url: 'https://www.gob.mx/salud',
      },
      {
        id: 'mx-3',
        category: 'fraude',
        categoryLabel: 'Consumidor y Finanzas',
        name: 'CONDUSEF (Fraudes Financieros)',
        desc: 'Orientación ante cargos no reconocidos, clonación de tarjetas y fraudes bancarios.',
        phone: '55 5340 0999',
        url: 'https://www.condusef.gob.mx',
      },
      {
        id: 'mx-4',
        category: 'denuncia',
        categoryLabel: 'Denuncia Anónima',
        name: 'Denuncia Anónima 089',
        desc: 'Recepción anónima de reportes sobre extorsión, amenazas y delitos de alto impacto.',
        phone: '089',
        url: 'https://www.gob.mx/seguridad',
      }
    ]
  },
  CO: {
    countryName: 'Colombia',
    services: [
      {
        id: 'co-1',
        category: 'ciberseguridad',
        categoryLabel: 'CAI Virtual',
        name: 'Centro Cibernético Policial (CAI Virtual)',
        desc: 'Recepción de denuncias y asesoría ante estafas digitales, malware y suplantación.',
        phone: '123',
        url: 'https://caivirtual.policia.gov.co',
      },
      {
        id: 'co-2',
        category: 'psicologico',
        categoryLabel: 'Salud Mental',
        name: 'Línea 106 - Apoyo Emocional',
        desc: 'Atención psicológica y orientación en crisis para jóvenes y adultos.',
        phone: '106',
        url: 'https://www.minsalud.gov.co',
      },
      {
        id: 'co-3',
        category: 'fraude',
        categoryLabel: 'Protección Financiera',
        name: 'Superintendencia Financiera',
        desc: 'Atención a quejas sobre entidades financieras, captación ilegal y fraudes.',
        phone: '601 307 8042',
        url: 'https://www.superfinanciera.gov.co',
      }
    ]
  },
  ES: {
    countryName: 'España',
    services: [
      {
        id: 'es-1',
        category: 'ciberseguridad',
        categoryLabel: 'INCIBE',
        name: 'Línea de Ayuda en Ciberseguridad (INCIBE)',
        desc: 'Línea gratuita de ayuda y asesoramiento para ciudadanos frente a incidentes de seguridad digital.',
        phone: '017',
        url: 'https://www.incibe.es',
      },
      {
        id: 'es-2',
        category: 'psicologico',
        categoryLabel: 'Salud Mental',
        name: 'Línea 024 - Atención a la Conducta Suicida',
        desc: 'Línea telefónica pública, gratuita y confidencial de atención a la salud emocional.',
        phone: '024',
        url: 'https://www.sanidad.gob.es',
      },
      {
        id: 'es-3',
        category: 'denuncia',
        categoryLabel: 'Guardia Civil / Policía',
        name: 'Policía Nacional / Guardia Civil',
        desc: 'Denuncias generales y delitos telemáticos en territorio nacional.',
        phone: '091',
        url: 'https://www.policia.es',
      }
    ]
  },
  AR: {
    countryName: 'Argentina',
    services: [
      {
        id: 'ar-1',
        category: 'ciberseguridad',
        categoryLabel: 'Ciberdelitos',
        name: 'Unidad Fiscal Especializada en Ciberdelincuencia (UFECI)',
        desc: 'Asesoramiento y recepción de denuncias sobre estafas virtuales y accesos ilegítimos.',
        phone: '11 5071 0040',
        url: 'https://www.mpf.gob.ar/ufeci',
      },
      {
        id: 'ar-2',
        category: 'psicologico',
        categoryLabel: 'Salud Mental',
        name: 'Línea 135 - Centro de Asistencia',
        desc: 'Atención telefónica gratuita para personas en crisis y contención emocional.',
        phone: '135',
        url: 'https://www.argentina.gob.ar/salud',
      }
    ]
  }
};

export default function GovernanceGuide() {
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);

  // Detección automática al montar el componente
  useEffect(() => {
    detectUserCountry();
  }, []);

  const detectUserCountry = () => {
    setIsDetecting(true);

    // 1. Detección rápida por Zona Horaria
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('Mexico') || tz.includes('Cancun') || tz.includes('Merida') || tz.includes('Monterrey') || tz.includes('Tijuana')) {
        setSelectedCountry('MX');
        setIsDetecting(false);
        return;
      }
      if (tz.includes('Bogota')) {
        setSelectedCountry('CO');
        setIsDetecting(false);
        return;
      }
      if (tz.includes('Madrid') || tz.includes('Canary')) {
        setSelectedCountry('ES');
        setIsDetecting(false);
        return;
      }
      if (tz.includes('Buenos_Aires') || tz.includes('Cordoba')) {
        setSelectedCountry('AR');
        setIsDetecting(false);
        return;
      }
    } catch (e) {
      // Ignorar fallo de timezone y pasar a geolocalización
    }

    // 2. Detección precisa con Geolocation API si el usuario da permiso
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=es`
            );
            const data = await res.json();
            if (data.countryCode && DIRECTORY_DATA[data.countryCode]) {
              setSelectedCountry(data.countryCode);
            }
          } catch (err) {
            console.warn('No se pudo determinar país por GPS, usando selección predeterminada.');
          } finally {
            setIsDetecting(false);
          }
        },
        () => {
          setIsDetecting(false); // Permiso denegado por el usuario
        },
        { timeout: 5000 }
      );
    } else {
      setIsDetecting(false);
    }
  };

  const currentCountryData = DIRECTORY_DATA[selectedCountry] || DIRECTORY_DATA['MX'];
  const servicesList = currentCountryData.services;

  const filteredServices = servicesList.filter((item) => {
    const matchesCategory = selectedCategory === 'todas' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="gov-container">
      <header className="gov-header">
        <h2 className="gov-title">Directorio Cívico y Asistencia Pública</h2>
        <p className="gov-subtitle">
          Canales oficiales de instituciones públicas para reportar delitos digitales, recibir apoyo psicológico y actuar ante situaciones de riesgo.
        </p>
      </header>

      {/* Barra de Selección y Detección de País */}
      <div className="country-selector-bar">
        <div className="country-info">
          <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>public</span>
          <span>Mostrando instituciones públicas de: <b>{currentCountryData.countryName}</b></span>
        </div>

        <div className="country-select-wrapper">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="country-select"
          >
            <option value="MX">🇲🇽 México</option>
            <option value="CO">🇨🇴 Colombia</option>
            <option value="ES">🇪🇸 España</option>
            <option value="AR">🇦🇷 Argentina</option>
          </select>

          <button onClick={detectUserCountry} className="btn-detect" title="Detectar mi ubicación actual" disabled={isDetecting}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>my_location</span>
            {isDetecting ? 'Detectando...' : 'Detectar'}
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="forum-search-box">
        <span className="material-symbols-outlined" style={{ color: '#64748b' }}>search</span>
        <input
          type="text"
          placeholder="Buscar institución, delito o tipo de apoyo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filtros rápidos */}
      <div className="category-chips">
        {[
          { id: 'todas', label: 'Todos los servicios', icon: 'apps' },
          { id: 'ciberseguridad', label: 'Ciberseguridad y Redes', icon: 'lock' },
          { id: 'psicologico', label: 'Apoyo Psicológico', icon: 'health_and_safety' },
          { id: 'fraude', label: 'Fraudes y Finanzas', icon: 'credit_card' },
          { id: 'denuncia', label: 'Denuncia Anónima', icon: 'shield' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`chip-btn ${selectedCategory === cat.id ? 'active' : ''}`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid de Contactos */}
      <div className="contacts-grid">
        {filteredServices.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1', margin: '30px 0' }}>
            No se encontraron contactos para los filtros seleccionados en este país.
          </p>
        ) : (
          filteredServices.map((contact) => (
            <div key={contact.id} className="contact-card">
              <div>
                <span className="contact-badge">{contact.categoryLabel}</span>
                <h3 className="contact-name">{contact.name}</h3>
                <p className="contact-desc">{contact.desc}</p>
              </div>

              <div className="contact-actions">
                <a href={`tel:${contact.phone.replace(/\s+/g, '')}`} className="btn-call">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>call</span>
                  {contact.phone}
                </a>
                <a href={contact.url} target="_blank" rel="noopener noreferrer" className="btn-link">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>open_in_new</span>
                  Sitio Oficial
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Protocolo de Emergencia */}
      <section className="guides-section">
        <h3 style={{ margin: '0 0 12px 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>fact_check</span>
          Protocolo: ¿Cómo actuar ante un delito o extorsión digital?
        </h3>

        <div className="guide-step">
          <div className="step-number">1</div>
          <div>
            <strong style={{ color: '#0f172a' }}>Preserva la evidencia</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#475569' }}>
              Toma capturas de pantalla legibles con fecha, hora, nombres de usuario y enlaces completos. No elimines conversaciones ni registros de llamadas.
            </p>
          </div>
        </div>

        <div className="guide-step">
          <div className="step-number">2</div>
          <div>
            <strong style={{ color: '#0f172a' }}>No compartas datos bancarios ni códigos de verificación</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#475569' }}>
              Ninguna entidad oficial ni institución bancaria solicita contraseñas o códigos SMS/2FA por llamada o mensaje privado.
            </p>
          </div>
        </div>

        <div className="guide-step">
          <div className="step-number">3</div>
          <div>
            <strong style={{ color: '#0f172a' }}>Comunícate a las líneas oficiales y solicita número de folio</strong>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.88rem', color: '#475569' }}>
              Reporta el hecho a la policía cibernética o línea ciudadana correspondiente y resguarda el folio para seguimiento formal.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}