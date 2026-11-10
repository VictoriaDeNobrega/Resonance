import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Plus, ArrowRight, Disc, Users, ShieldCheck } from 'lucide-react';
import CreateRoomModal from '../features/rooms/pages/CreateRoomModal';

export default function HomePage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('resonance_user') || 'Usuario_' + Math.floor(Math.random() * 100));

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    localStorage.setItem('resonance_user', username);
    navigate(`/rooms/${joinCode.trim().toUpperCase()}`);
  };

  const handleRoomCreated = (createdRoom) => {
    localStorage.setItem('resonance_user', username);
    navigate(`/rooms/${createdRoom.code}`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '60px auto', padding: '0 20px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.875rem', marginBottom: '24px' }}>
        <Radio size={16} color="var(--accent)" />
        <span>Resonance Jam — Sincronización en Tiempo Real</span>
      </div>

      <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', background: 'linear-gradient(135deg, #ffffff 40%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Escucha música en sincronía con tus amigos
      </h1>

      <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.6 }}>
        Crea salas privadas o públicas, comparte el enlace de invitación, vota para saltar canciones y chatea en vivo con latencia ultra baja.
      </p>

      <div style={{ maxWidth: '320px', margin: '0 auto 30px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', textAlign: 'left' }}>
          Tu Nombre de Usuario:
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            localStorage.setItem('resonance_user', e.target.value);
          }}
          placeholder="Ingresa tu apodo..."
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: '8px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '60px' }}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
          style={{ padding: '14px 28px', fontSize: '1rem' }}
        >
          <Plus size={20} /> Crear Nueva Sala Jam
        </button>

        <button
          onClick={() => navigate('/communities')}
          className="btn-secondary"
          style={{ padding: '14px 24px', fontSize: '1rem', border: '1px solid var(--accent)' }}
        >
          <Users size={20} color="var(--accent)" /> Comunidades Musicales
        </button>

        <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Código (Ej: RES-1234)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'white',
              fontSize: '0.9rem',
              width: '180px'
            }}
          />
          <button type="submit" className="btn-secondary" style={{ padding: '12px 16px' }}>
            Unirse <ArrowRight size={18} />
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', textAlign: 'left' }}>
        <div className="card">
          <Disc size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Desfase &lt; 200 ms</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sincronización milimétrica impulsada por WebSockets nativos con C# SignalR para que todos escuchen la misma nota al mismo tiempo.
          </p>
        </div>

        <div className="card">
          <Users size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Cola y Votación Democrática</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Cualquiera en la sala puede sugerir canciones a la cola y votar democráticamente para saltar la pista si no le gusta.
          </p>
        </div>

        <div className="card">
          <ShieldCheck size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Reconexión Automática</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Si la conexión a internet parpadea, la aplicación se reconecta sola sin interrumpir tu experiencia de audio.
          </p>
        </div>
      </div>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  );
}
