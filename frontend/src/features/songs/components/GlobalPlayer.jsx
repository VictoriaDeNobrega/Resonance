import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  HardDrive,
  Globe
} from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';
import { isForceLocalMode } from '../../../config/serverConfig';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlay,
    seekTo,
    handleNext,
    handlePrev,
    setVolume,
    toggleMute
  } = useAudioPlayer();

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isLocal = isForceLocalMode() || (currentTrack && currentTrack.url?.startsWith('/music/'));

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '76px',
        backgroundColor: 'rgba(18, 20, 30, 0.96)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 90,
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)'
      }}
    >
      {/* 1. Izquierda: Información de la canción actual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px', maxWidth: '320px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-card)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border)'
          }}
        >
          {currentTrack?.coverUrl ? (
            <img
              src={currentTrack.coverUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <Disc3 size={24} color="var(--accent)" />
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: 'var(--text-main)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={currentTrack ? currentTrack.title : 'Selecciona una canción'}
          >
            {currentTrack ? currentTrack.title : 'Resonance Player'}
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{currentTrack ? currentTrack.artist : '11 canciones en carpeta local'}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontSize: '0.65rem',
                backgroundColor: isLocal ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isLocal ? 'var(--accent)' : 'var(--success)',
                padding: '1px 5px',
                borderRadius: '4px'
              }}
            >
              {isLocal ? <HardDrive size={10} /> : <Globe size={10} />}
              {isLocal ? 'Carpeta Local' : 'Servidor'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Centro: Controles de reproducción y barra de progreso */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          flex: '1 1 420px',
          maxWidth: '540px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handlePrev}
            aria-label="Canción anterior"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <SkipBack size={18} />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px var(--accent-glow)',
              transition: 'transform 0.15s ease'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.06)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={handleNext}
            aria-label="Canción siguiente"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '50%'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <SkipForward size={18} />
          </button>
        </div>

        {/* Barra de progreso y tiempos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span style={{ minWidth: '32px', textAlign: 'right' }}>{formatTime(currentTime)}</span>

          <div
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              seekTo(ratio * duration);
            }}
            style={{
              flex: 1,
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'var(--accent)',
                borderRadius: '3px'
              }}
            />
          </div>

          <span style={{ minWidth: '32px' }}>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 3. Derecha: Control de volumen */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '160px', justifyContent: 'flex-end' }}>
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
          style={{
            background: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '4px'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {isMuted || volume === 0 ? <VolumeX size={18} color="var(--danger)" /> : <Volume2 size={18} />}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          aria-label="Volumen de audio"
          style={{
            width: '80px',
            accentColor: 'var(--accent)',
            cursor: 'pointer'
          }}
        />
      </div>
    </div>
  );
}

