import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Plus, ArrowRight, Disc, Users, ShieldCheck, UserRound, LogIn, LogOut, HardDrive, Settings, Music } from 'lucide-react';
import CreateRoomModal from '../features/rooms/pages/CreateRoomModal';
import ServerConfigModal from '../components/ServerConfigModal';
import { CreatePlaylistForm } from '../features/playlists/CreatePlaylistForm';
import { SongSearch } from '../features/songs/SongSearch';
import { HomeSongs } from '../features/songs/HomeSongs';

export default function HomePage() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [username, setUsername] = useState(() => localStorage.getItem('resonance_user') || 'Usuario_' + Math.floor(Math.random() * 100));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });

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
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
      {/* Header de Autenticación de Usuario */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '28px' }}>
        {user ? (
          <>
            <button className="btn-secondary" onClick={() => navigate('/profile')}>
              <UserRound size={18} /> {user.name}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                localStorage.removeItem('user');
                setUser(null);
              }}
              aria-label="Cerrar sesión"
            >
              <LogOut size={18} /> Salir
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => navigate('/login')}>
              <LogIn size={18} /> Iniciar sesión
            </button>
            <button className="btn-primary" onClick={() => navigate('/register')}>
              <UserRound size={18} /> Crear cuenta
            </button>
          </>
        )}
      </div>

      {/* Hero Section y Badge de Servidor */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '6px 14px', borderRadius: '20px', fontSize: '0.875rem' }}>
          <Radio size={16} color="var(--accent)" />
          <span>Resonance Jam — Sincronización en Tiempo Real</span>
        </div>

        <button
          onClick={() => setIsServerModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            border: '1px solid var(--accent)',
            color: 'var(--text-main)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          <HardDrive size={14} color="var(--accent)" />
          <span>Música y Configuración Servidor</span>
          <Settings size={13} style={{ opacity: 0.7 }} />
        </button>
      </div>

      <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '16px', background: 'linear-gradient(135deg, #ffffff 40%, var(--accent) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Escucha música en sincronía con tus amigos
      </h1>

      <p style={{ color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '640px', margin: '0 auto 36px', lineHeight: 1.6 }}>
        Crea salas privadas o públicas, comparte el enlace de invitación, vota para saltar canciones y chatea en vivo con latencia ultra baja.
      </p>

      {/* Control de Nombre de Usuario */}
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

      {/* Acciones Principales */}
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

      {/* Tarjetas de Características */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', textAlign: 'left', marginBottom: '60px' }}>
        <div className="card">
          <Disc size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '6px' }}>Desfase &lt; 200 ms</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Sincronización milimétrica impulsada por WebSockets nativos con C# SignalR para que todos escuchten la misma nota al mismo tiempo.
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

      {/* Módulos de Canciones y Playlists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '40px', textAlign: 'left' }}>
        <section>
          <HomeSongs />
        </section>

        <section>
          <SongSearch />
        </section>

        <section>
          <CreatePlaylistForm />
        </section>
      </div>

      {/* Modales */}
      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRoomCreated={handleRoomCreated}
      />

      <ServerConfigModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
}
