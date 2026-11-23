import React, { useEffect, useRef, useState } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart,
  Repeat, Shuffle, Radio, Wifi, Info, RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { resolveSongStreamUrl, getFallbackStreamUrl, resolveCoverUrl } from '../api/navidromeClient';
import { signalrClient, computeCompensatedTimeSec } from '../api/signalrClient';
import { CoverArtwork, StatusBadge, formatDuration } from './CapaZeroUI';

/**
 * Barra Reproductor Inferior Persistente (HU 1.4, HU 1.7 y HU 2.1)
 * - Streaming continuo desde musica.res0nance.pp.ua con fallback automático a movil.res0nance.pp.ua
 * - Sincronización SignalR <= 200 ms cuando hay una sala Jam activa
 * - Registro de reproducciones y persistencia periódica en /api/auth/session-state/{id}
 */
export default function GlobalPlayerBar({
  user,
  currentSong,
  isPlaying,
  setIsPlaying,
  initialSeekMs = 0,
  onPlayNext,
  onPlayPrev,
  onToggleFavorite,
  onOpenSongDetail,
  activeRoom,
  roomSyncEvent,
  roomConnectionStatus,
  onOpenActiveRoomPanel,
  onNotify
}) {
  const audioRef = useRef(null);
  const lastRegisteredSongIdRef = useRef(null);
  const applyingRemoteSyncRef = useRef(false);
  const lastSavedStateTsRef = useRef(0);

  const [streamUrl, setStreamUrl] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const v = Number(user?.preferredVolume);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 0.8;
  });
  const [muted, setMuted] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [heartPop, setHeartPop] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [driftMs, setDriftMs] = useState(null);

  const isHostOrSolo = !activeRoom || activeRoom.hostId === user?.id;

  // Resolver URL de streaming al cambiar de canción
  useEffect(() => {
    if (!currentSong) {
      setStreamUrl('');
      setCurrentTime(0);
      setDuration(0);
      return;
    }
    setUsedFallback(false);
    const resolved = resolveSongStreamUrl(currentSong);
    setStreamUrl(resolved);
    setDuration(currentSong.durationInSeconds || 0);
    setAudioLoading(Boolean(resolved));

    // Registrar reproducción en PostgreSQL 16 (una vez por selección)
    if (currentSong.id && lastRegisteredSongIdRef.current !== currentSong.id) {
      lastRegisteredSongIdRef.current = currentSong.id;
      apiClient.registerPlay(currentSong.id, user?.id).catch(() => {
        // Error silencioso si es pista externa sin UUID de catálogo
      });
    }
  }, [currentSong?.id, currentSong?.audioUrl, user?.id]);

  // Aplicar seek inicial guardado en sesión (HU 2.1)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !initialSeekMs || initialSeekMs <= 0) return;
    const applySeek = () => {
      if (Number.isFinite(audio.duration) && initialSeekMs / 1000 < audio.duration) {
        audio.currentTime = initialSeekMs / 1000;
        setCurrentTime(initialSeekMs / 1000);
      }
    };
    if (audio.readyState >= 1) {
      applySeek();
    } else {
      audio.addEventListener('loadedmetadata', applySeek, { once: true });
    }
  }, [initialSeekMs, streamUrl]);

  // Sincronizar play/pause con elemento HTML5 <audio>
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !streamUrl) return;
    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((err) => {
          // Ignorar AbortError cuando cambia src/carga un nuevo stream; solo pausar si el navegador bloquea autoplay
          if (err?.name === 'AbortError') return;
          if (err?.name === 'NotAllowedError') {
            setIsPlaying(false);
          }
        });
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, streamUrl, setIsPlaying]);

  // Aplicar volumen y mute
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  // Aplicar eventos de sincronización SignalR <= 200 ms (HU 1.7)
  useEffect(() => {
    if (!roomSyncEvent || !activeRoom) return;
    const audio = audioRef.current;
    if (!audio) return;

    const { targetSec, latencyMs } = computeCompensatedTimeSec(roomSyncEvent);
    applyingRemoteSyncRef.current = true;

    const deltaMs = Math.round(Math.abs((audio.currentTime || 0) - targetSec) * 1000);
    setDriftMs(Math.min(deltaMs, latencyMs || deltaMs));

    if (deltaMs > 200) {
      try {
        audio.currentTime = targetSec;
        setCurrentTime(targetSec);
      } catch {
        // Se aplicará al cargar metadatos
      }
    }

    setIsPlaying(Boolean(roomSyncEvent.isPlaying));
    setTimeout(() => {
      applyingRemoteSyncRef.current = false;
    }, 250);
  }, [roomSyncEvent, activeRoom, setIsPlaying]);

  // Persistencia periódica de estado de sesión en PostgreSQL (HU 2.1)
  const persistSessionState = (positionMs, nextVolume) => {
    if (!user?.id) return;
    const now = Date.now();
    if (now - lastSavedStateTsRef.current < 8000) return;
    lastSavedStateTsRef.current = now;
    apiClient.updateSessionState(user.id, {
      lastPlayedSongId: currentSong?.id || null,
      lastPlaybackPositionMs: Math.round(positionMs),
      preferredVolume: nextVolume ?? volume
    }).catch(() => {});
  };

  // Emitir sincronización de sala cuando el anfitrión controla play/pause/seek
  const broadcastRoomSync = async (nextIsPlaying, nextTimeSec) => {
    if (!activeRoom || !isHostOrSolo || applyingRemoteSyncRef.current) return;
    const dto = {
      songId: currentSong?.id || null,
      songTitle: currentSong?.title || '',
      songArtist: currentSong?.artist || '',
      songCoverUrl: resolveCoverUrl(currentSong),
      songUrl: resolveSongStreamUrl(currentSong),
      currentTimeMs: Math.round((nextTimeSec ?? currentTime) * 1000),
      isPlaying: nextIsPlaying,
      serverTimestampUtcMs: Date.now()
    };
    try {
      await signalrClient.syncPlaybackState(activeRoom.code, dto);
    } catch {
      apiClient.syncPlayback(activeRoom.code, dto).catch(() => {});
    }
  };

  const handleTogglePlay = () => {
    if (!currentSong) return;
    const next = !isPlaying;
    // Desbloquear reproducción sincrónicamente dentro del gesto del usuario (clave en navegadores móviles)
    if (next && audioRef.current && streamUrl) {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(next);
    if (activeRoom && isHostOrSolo) {
      broadcastRoomSync(next, audioRef.current?.currentTime || currentTime);
    }
  };

  const handleSeek = (e) => {
    const nextSec = Number(e.target.value);
    setCurrentTime(nextSec);
    if (audioRef.current) {
      audioRef.current.currentTime = nextSec;
    }
    if (activeRoom && isHostOrSolo) {
      broadcastRoomSync(isPlaying, nextSec);
    }
    persistSessionState(nextSec * 1000, volume);
  };

  const handleVolumeChange = (e) => {
    const nextVol = Number(e.target.value);
    setVolume(nextVol);
    if (muted && nextVol > 0) setMuted(false);
    persistSessionState(currentTime * 1000, nextVol);
  };

  const handleAudioError = () => {
    setAudioLoading(false);
    if (!usedFallback && streamUrl) {
      const altUrl = getFallbackStreamUrl(streamUrl);
      if (altUrl && altUrl !== streamUrl) {
        setUsedFallback(true);
        setStreamUrl(altUrl);
        const targetServer = altUrl.includes('musica.res0nance.pp.ua')
          ? 'musica.res0nance.pp.ua (Secundario)'
          : 'movil.res0nance.pp.ua (Principal)';
        onNotify?.(`Conmutando stream a ${targetServer}`, 'warning');
        return;
      }
    }
    if (streamUrl) {
      setIsPlaying(false);
      onNotify?.('No se pudo cargar el stream de audio de esta pista.', 'error');
    }
  };

  const handleFavoriteClick = () => {
    if (!currentSong?.id) return;
    setHeartPop(true);
    setTimeout(() => setHeartPop(false), 380);
    onToggleFavorite?.(currentSong.id);
  };

  const safeDuration = duration || currentSong?.durationInSeconds || 0;
  const progressPct = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0;

  return (
    <footer className="workspace-player" aria-label="Reproductor global persistente">
      <audio
        ref={audioRef}
        src={streamUrl || undefined}
        preload="metadata"
        playsInline
        onLoadedMetadata={(e) => {
          setAudioLoading(false);
          if (Number.isFinite(e.currentTarget.duration)) {
            setDuration(e.currentTarget.duration);
          }
          if (isPlaying) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onCanPlay={(e) => {
          setAudioLoading(false);
          if (isPlaying && e.currentTarget.paused) {
            e.currentTarget.play().catch(() => {});
          }
        }}
        onTimeUpdate={(e) => {
          const sec = e.currentTarget.currentTime || 0;
          setCurrentTime(sec);
          persistSessionState(sec * 1000, volume);
        }}
        onEnded={() => {
          if (repeat && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
            return;
          }
          onPlayNext?.(shuffle);
        }}
        onError={handleAudioError}
      />

      {/* Columna 1: Información de pista actual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        <CoverArtwork
          src={resolveCoverUrl(currentSong)}
          alt={currentSong?.title || 'Sin pista'}
          size={52}
          radius={10}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="truncate"
              style={{ fontWeight: 700, fontSize: '0.92rem', textAlign: 'left' }}
              onClick={() => currentSong?.id && onOpenSongDetail?.(currentSong.id)}
              title="Ver ficha técnica y reseñas"
            >
              {currentSong ? currentSong.title : 'Selecciona una canción'}
            </button>
            {audioLoading && <RefreshCw size={13} className="status-dot pulse" color="#a78bfa" />}
          </div>
          <div className="truncate" style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {currentSong
              ? `${currentSong.artist}${currentSong.album ? ` · ${currentSong.album}` : ''}`
              : 'Streaming Hi-Fi · movil.res0nance.pp.ua'}
          </div>
        </div>

        {currentSong && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              className={`btn-icon ${currentSong.isFavorite ? 'active' : ''} ${heartPop ? 'heart-pop' : ''}`}
              onClick={handleFavoriteClick}
              aria-label={currentSong.isFavorite ? 'Quitar de favoritos' : 'Marcar como favorita'}
              title="Favorito"
            >
              <Heart
                size={17}
                strokeWidth={1.8}
                fill={currentSong.isFavorite ? '#8b5cf6' : 'none'}
              />
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => onOpenSongDetail?.(currentSong.id)}
              aria-label="Abrir ficha técnica y reseñas"
              title="Ficha técnica y reseñas"
            >
              <Info size={16} strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>

      {/* Columna 2: Controles de reproducción + Scrubber */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            className={`btn-icon ${shuffle ? 'active' : ''}`}
            onClick={() => setShuffle((s) => !s)}
            aria-label="Reproducción aleatoria"
            title="Aleatorio"
            disabled={Boolean(activeRoom)}
          >
            <Shuffle size={15} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => onPlayPrev?.()}
            aria-label="Canción anterior"
            disabled={!currentSong || (Boolean(activeRoom) && !isHostOrSolo)}
          >
            <SkipBack size={18} strokeWidth={1.9} />
          </button>

          <button
            type="button"
            className="play-fab"
            onClick={handleTogglePlay}
            disabled={!currentSong || (Boolean(activeRoom) && !isHostOrSolo)}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying ? <Pause size={19} fill="#fff" /> : <Play size={19} fill="#fff" style={{ marginLeft: 2 }} />}
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => onPlayNext?.(shuffle)}
            aria-label="Siguiente canción"
            disabled={!currentSong || (Boolean(activeRoom) && !isHostOrSolo)}
          >
            <SkipForward size={18} strokeWidth={1.9} />
          </button>

          <button
            type="button"
            className={`btn-icon ${repeat ? 'active' : ''}`}
            onClick={() => setRepeat((r) => !r)}
            aria-label="Repetir pista"
            title="Repetir"
            disabled={Boolean(activeRoom)}
          >
            <Repeat size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', maxWidth: 520 }}>
          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 38, textAlign: 'right' }}>
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            className="range-slider"
            min={0}
            max={Math.max(1, Math.floor(safeDuration))}
            step={1}
            value={Math.min(Math.floor(currentTime), Math.max(1, Math.floor(safeDuration)))}
            onChange={handleSeek}
            disabled={!currentSong || (Boolean(activeRoom) && !isHostOrSolo)}
            aria-label="Progreso de reproducción"
            style={{
              flex: 1,
              background: `linear-gradient(90deg, #8b5cf6 ${progressPct}%, rgba(255,255,255,0.14) ${progressPct}%)`
            }}
          />
          <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 38 }}>
            {formatDuration(safeDuration)}
          </span>
        </div>
      </div>

      {/* Columna 3: Estado de Sala Jam / Fallback + Control de Volumen */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
        {activeRoom ? (
          <button
            type="button"
            onClick={onOpenActiveRoomPanel}
            title="Ver Sala Jam activa"
            style={{ display: 'inline-flex', alignItems: 'center' }}
          >
            <StatusBadge
              variant={roomConnectionStatus === 'connected' ? 'success' : 'warning'}
              dot
              pulse={roomConnectionStatus === 'connected'}
              icon={Radio}
            >
              {activeRoom.code}
              {driftMs !== null ? ` · Δ${driftMs}ms` : ''}
            </StatusBadge>
          </button>
        ) : (
          <StatusBadge variant={streamUrl.includes('musica.res0nance.pp.ua') ? 'neutral' : 'warning'} icon={Wifi}>
            {streamUrl.includes('musica.res0nance.pp.ua') ? 'musica.res0nance' : 'movil.res0nance'}
          </StatusBadge>
        )}

        <button
          type="button"
          className="btn-icon"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        >
          {muted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
        </button>

        <input
          type="range"
          className="range-slider"
          min={0}
          max={1}
          step={0.02}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          aria-label="Volumen"
          style={{
            width: 92,
            background: `linear-gradient(90deg, #8b5cf6 ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.14) ${(muted ? 0 : volume) * 100}%)`
          }}
        />
      </div>
    </footer>
  );
}
