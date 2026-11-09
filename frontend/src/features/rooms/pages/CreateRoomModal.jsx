import React, { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';
import { roomApi } from '../services/roomApi';

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [title, setTitle] = useState('');
  const [hostName, setHostName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Por favor, ingresa un nombre para la sala.');
      return;
    }
    if (title.trim().length < 3) {
      setError('El título de la sala debe tener al menos 3 caracteres.');
      return;
    }
    if (!hostName.trim()) {
      setError('Por favor, ingresa tu nombre como anfitrión.');
      return;
    }

    try {
      setIsLoading(true);
      const createdRoom = await roomApi.createRoom({
        title: title.trim(),
        hostName: hostName.trim()
      });

      onRoomCreated(createdRoom);
      onClose();
    } catch (err) {
      setError(err.message || 'No se pudo crear la sala. Revisa la conexión con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        backdropFilter: 'blur(4px)'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', color: 'var(--text-muted)' }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Sparkles color="var(--accent)" size={22} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Crear Sala de Música (Jam)</h2>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid var(--danger)',
              color: '#fca5a5',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '14px',
              fontSize: '0.875rem'
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>
              Nombre de la Sala *
            </label>
            <input
              type="text"
              placeholder="Ej: Viernes de Rock, Chill Vibes..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '6px' }}>
              Tu Nombre (Anfitrión) *
            </label>
            <input
              type="text"
              placeholder="Ej: Sebastián Pérez"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'white',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {isLoading ? 'Creando...' : 'Lanzar Sala'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
