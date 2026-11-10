import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { LOCAL_TRACKS } from '../data/localTracks';
import { resolveAudioUrl } from '../../../config/serverConfig';

const AudioPlayerContext = createContext(null);

export function AudioPlayerProvider({ children }) {
  const audioRef = useRef(new Audio());
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playlist, setPlaylist] = useState(LOCAL_TRACKS);

  // Inicializar volumen y listeners de audio
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleNext();
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
    };
  }, []);

  const playTrack = (track, newPlaylist = null) => {
    if (!track) return;
    const audio = audioRef.current;

    if (newPlaylist && Array.isArray(newPlaylist)) {
      setPlaylist(newPlaylist);
    }

    const resolvedUrl = resolveAudioUrl(track.url);

    // Si es la misma canción, solo alternar play/pause
    if (currentTrack && currentTrack.id === track.id) {
      if (audio.paused) {
        audio.play().catch((err) => console.warn('Error reproduciendo audio:', err));
      } else {
        audio.pause();
      }
      return;
    }

    setCurrentTrack(track);
    audio.src = resolvedUrl;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Reproducción bloqueada por políticas de audio del navegador:', err);
      });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!currentTrack) {
      // Si no hay ninguna seleccionada, reproducir la primera de la carpeta local
      if (playlist.length > 0) {
        playTrack(playlist[0]);
      }
      return;
    }

    if (audio.paused) {
      audio.play().catch((err) => console.warn(err));
    } else {
      audio.pause();
    }
  };

  const seekTo = (seconds) => {
    const audio = audioRef.current;
    if (audio && isFinite(seconds)) {
      audio.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const handleNext = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    playTrack(playlist[nextIndex]);
  };

  const handlePrev = () => {
    if (!currentTrack || playlist.length === 0) return;
    const audio = audioRef.current;
    // Si ya pasaron más de 3 segundos, reiniciar la canción actual
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    playTrack(playlist[prevIndex]);
  };

  const setVolume = (val) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolumeState(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    if (clamped > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  return (
    <AudioPlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        playlist,
        playTrack,
        togglePlay,
        seekTo,
        handleNext,
        handlePrev,
        setVolume,
        toggleMute
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer debe usarse dentro de un AudioPlayerProvider');
  }
  return context;
}
