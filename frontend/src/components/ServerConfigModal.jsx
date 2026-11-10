import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  HardDrive,
  Globe,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Folder,
  ExternalLink
} from 'lucide-react';
import {
  getServerUrl,
  setServerUrl,
  isForceLocalMode,
  setForceLocalMode,
  testServerConnection,
  DEFAULT_SERVER_URL
} from '../config/serverConfig';
import { LOCAL_TRACKS } from '../features/songs/data/localTracks';

export default function ServerConfigModal({ isOpen, onClose }) {
  const [currentUrl, setCurrentUrl] = useState('');
  const [forceLocal, setForceLocal] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null); // 'online', 'offline', null
  const [saveFeedback, setSaveFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentUrl(getServerUrl());
      setForceLocal(isForceLocalMode());
      setSaveFeedback('');
      handleTest(getServerUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async (url) => {
    setIsTesting(true);
    setConnectionStatus(null);
    const ok = await testServerConnection(url || currentUrl);
    setConnectionStatus(ok ? 'online' : 'offline');
    setIsTesting(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setServerUrl(currentUrl);
    setForceLocalMode(forceLocal);
    setSaveFeedback('¡Configuración guardada exitosamente!');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="server-config-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 110,
        padding: '20px',
        backdropFilter: 'blur(6px)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <Server size={20} />
            </div>
            <div>
              <h2 id="server-config-title" style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Configuración del Servidor y Audio
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Gestiona el enlace del backend o el modo local con tus archivos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cuerpo */}
        <form onSubmit={handleSave} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {saveFeedback && (
            <div
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#d1fae5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} color="#10b981" />
              <span>{saveFeedback}</span>
            </div>
          )}

          {/* Tarjeta de estado de música local */}
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)'
                }}
              >
                <Music size={20} />
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block' }}>
                  Carpeta de Música Local Cargada
                </strong>
                <span style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                  Álbum: <strong>Calva Louise - Edge of the Abyss</strong> ({LOCAL_TRACKS.length} canciones .mp3)
                </span>
              </div>
            </div>

            <span
              style={{
                fontSize: '0.725rem',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                border: '1px solid var(--success)',
                padding: '3px 8px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Listo para Sonar
            </span>
          </div>

          {/* Campo de Link del Servidor */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label
                htmlFor="server-url-input"
                style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}
              >
                Enlace / URL del Servidor Backend
              </label>
              <button
                type="button"
                onClick={() => setCurrentUrl(DEFAULT_SERVER_URL)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Restablecer por defecto (localhost:5000)
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="server-url-input"
                type="text"
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                placeholder="http://localhost:5000 o https://mi-servidor.com"
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />

              <button
                type="button"
                onClick={() => handleTest(currentUrl)}
                disabled={isTesting}
                className="btn-secondary"
                style={{ padding: '10px 14px', fontSize: '0.825rem' }}
                title="Probar si el servidor está respondiendo"
              >
                {isTesting ? (
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <RefreshCw size={15} />
                )}
                <span>Probar</span>
              </button>
            </div>

            {/* Resultado del test */}
            <div style={{ marginTop: '8px', fontSize: '0.8rem' }}>
              {isTesting ? (
                <span style={{ color: 'var(--text-muted)' }}>Comprobando conexión con {currentUrl}...</span>
              ) : connectionStatus === 'online' ? (
                <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={14} /> ¡Servidor en línea y listo para recibir datos!
                </span>
              ) : connectionStatus === 'offline' ? (
                <span style={{ color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <AlertCircle size={14} /> Servidor no detectado. El programa usará automáticamente la carpeta local con las 11 canciones.
                </span>
              ) : null}
            </div>
          </div>

          {/* Toggle de Modo Local Forzado */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                Forzar Modo Música Local
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Usa directamente los archivos MP3 locales sin intentar conectar al servidor backend.
              </span>
            </div>

            <input
              type="checkbox"
              id="force-local-toggle"
              checked={forceLocal}
              onChange={(e) => setForceLocal(e.target.checked)}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--accent)',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Botones de acción */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border)'
            }}
          >
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Guardar Enlace
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
