import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Music,
  Play,
  Pause,
  Disc,
  Search,
  HardDrive,
  Globe,
  Radio,
  Settings,
  Sparkles,
  Clock,
  ListPlus
} from 'lucide-react';
import { songsService } from '../services/songsService';
import { LOCAL_ALBUM_INFO } from '../data/localTracks';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { isForceLocalMode, getServerUrl } from '../../../config/serverConfig';
import ServerConfigModal from '../../../components/ServerConfigModal';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SongsCatalogPage() {
  const [tracks, setTracks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);

  const { currentTrack, isPlaying, playTrack, togglePlay } = useAudioPlayer();

  const isLocal = isForceLocalMode();
  const serverUrl = getServerUrl();

  useEffect(() => {
    loadTracks();

    const handleConfigChange = () => {
      loadTracks();
    };
    window.addEventListener('resonance-server-config-changed', handleConfigChange);
    return () => window.removeEventListener('resonance-server-config-changed', handleConfigChange);
  }, [searchTerm, genreFilter]);

  const loadTracks = async () => {
    try {
      setIsLoading(true);
      const data = await songsService.getAllSongs(searchTerm, genreFilter);
      setTracks(data);
    } catch (err) {
      console.error('Error cargando canciones:', err);
      setTracks(songsService.getLocalTracks());
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayAlbum = () => {
    if (tracks.length > 0) {
      playTrack(tracks[0], tracks);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto 120px', padding: '0 20px' }}>
      {/* Barra superior de navegación y estado de conexión */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '32px',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            <Radio size={15} color="var(--accent)" />
            <span>Salas Jam</span>
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <Link
            to="/communities"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            Comunidades
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            Catálogo Musical
          </span>
        </div>

        {/* Botón de Configuración del Servidor */}
        <button
          onClick={() => setIsServerModalOpen(true)}
          className="btn-secondary"
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {isLocal ? <HardDrive size={14} color="var(--accent)" /> : <Globe size={14} color="var(--success)" />}
          <span>{isLocal ? 'Modo Local (MP3)' : 'Servidor Backend'}</span>
          <Settings size={14} style={{ opacity: 0.6 }} />
        </button>
      </div>

      {/* Hero del Álbum cargado desde la carpeta */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '28px',
          alignItems: 'center',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '32px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '14px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-secondary)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            flexShrink: 0
          }}
        >
          <img
            src={LOCAL_ALBUM_INFO.coverUrl}
            alt="Portada del álbum"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        <div style={{ flex: 1, minWidth: '280px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '10px'
            }}
          >
            <Sparkles size={12} />
            <span>Álbum Local Disponible</span>
          </div>

          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.15, marginBottom: '6px' }}>
            {LOCAL_ALBUM_INFO.title}
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '8px' }}>
            {LOCAL_ALBUM_INFO.artist}
          </p>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
            {LOCAL_ALBUM_INFO.genre} • {LOCAL_ALBUM_INFO.releaseYear} • {LOCAL_TRACKS.length} canciones cargadas directamente de tu carpeta local
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePlayAlbum}
              className="btn-primary"
              style={{ padding: '10px 22px', fontSize: '0.95rem' }}
            >
              <Play size={16} />
              <span>Reproducir Álbum Completo</span>
            </button>

            <button
              onClick={() => setIsServerModalOpen(true)}
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.9rem' }}
            >
              <Settings size={16} />
              <span>Configurar Link del Servidor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Buscador de Pistas */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
          Lista de Canciones ({tracks.length})
        </h2>

        <div style={{ position: 'relative', width: '300px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Buscar en el catálogo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Tabla / Lista de Canciones */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '50px 1fr 200px 90px 80px',
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          <span>#</span>
          <span>Título</span>
          <span>Álbum</span>
          <span style={{ textAlign: 'right' }}><Clock size={13} style={{ display: 'inline' }} /></span>
          <span style={{ textAlign: 'center' }}>Acción</span>
        </div>

        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando pistas de audio...
          </div>
        ) : tracks.length > 0 ? (
          tracks.map((track, idx) => {
            const isThisPlaying = currentTrack?.id === track.id && isPlaying;
            const isSelected = currentTrack?.id === track.id;

            return (
              <div
                key={track.id || idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '50px 1fr 200px 90px 80px',
                  alignItems: 'center',
                  padding: '12px 18px',
                  borderBottom: idx < tracks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  backgroundColor: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'transparent',
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {/* Botón Play / Número */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <button
                    onClick={() => playTrack(track, tracks)}
                    aria-label={`Reproducir ${track.title}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isThisPlaying ? 'var(--accent)' : 'transparent',
                      color: isThisPlaying ? 'white' : 'var(--text-muted)',
                      border: isThisPlaying ? 'none' : '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                      e.currentTarget.style.color = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isThisPlaying) {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }
                    }}
                  >
                    {isThisPlaying ? <Pause size={13} /> : <Play size={13} style={{ marginLeft: '1px' }} />}
                  </button>
                </div>

                {/* Título y Artista */}
                <div style={{ minWidth: 0, paddingRight: '12px' }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.925rem',
                      color: isSelected ? 'var(--accent)' : 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {track.title}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {track.artist}
                  </div>
                </div>

                {/* Álbum */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {track.album}
                </div>

                {/* Duración */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {formatTime(track.durationSeconds)}
                </div>

                {/* Acción: Reproducir */}
                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => playTrack(track, tracks)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                    title="Reproducir ahora"
                  >
                    {isSelected && isPlaying ? 'Pausa' : 'Sonar'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No se encontraron canciones en la biblioteca.
          </div>
        )}
      </div>

      {/* Modal de configuración de servidor */}
      <ServerConfigModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
      />
    </div>
  );
}
