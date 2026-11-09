import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Users, Share2, Play, Pause, Music2, Check, Radio, LogOut, Disc
} from 'lucide-react';
import { roomApi } from '../services/roomApi';
import { useRoomSync } from '../hooks/useRoomSync';
import RoomChat from '../components/RoomChat';
import QueueList from '../components/QueueList';
import VoteSkipButton from '../components/VoteSkipButton';

export default function RoomView() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [roomData, setRoomData] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem('resonance_user') || 'Oyente_' + Math.floor(Math.random() * 1000));
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(true);

  const audioRef = useRef(null);

  const {
    isConnected,
    onlineUsersCount,
    messages,
    queue,
    playbackState,
    setPlaybackState,
    voteSkipStatus,
    emitPlaybackSync,
    emitSendMessage,
    emitAddToQueue,
    emitVoteSkip
  } = useRoomSync(code, currentUser);

  useEffect(() => {
    async function fetchRoom() {
      try {
        setLoading(true);
        const data = await roomApi.getRoomByCode(code);
        setRoomData(data);
        if (data.currentSongUrl) {
          setPlaybackState((prev) => ({
            ...prev,
            songUrl: data.currentSongUrl,
            songTitle: data.currentSongTitle,
            songArtist: data.currentSongArtist,
            currentTimeMs: data.currentTimeMs,
            isPlaying: data.isPlaying
          }));
        }
      } catch (err) {
        alert(err.message || 'Sala no encontrada');
        navigate('/');
      } finally {
        setLoading(false);
      }
    }

    if (code) fetchRoom();
  }, [code, navigate, setPlaybackState]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const targetSeconds = playbackState.currentTimeMs / 1000;
    if (Math.abs(audio.currentTime - targetSeconds) > 0.2) {
      audio.currentTime = targetSeconds;
    }

    if (playbackState.isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!playbackState.isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [playbackState]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const nextIsPlaying = !playbackState.isPlaying;

    emitPlaybackSync({
      songUrl: playbackState.songUrl,
      songTitle: playbackState.songTitle,
      songArtist: playbackState.songArtist,
      currentTimeMs: Math.round(audio.currentTime * 1000),
      isPlaying: nextIsPlaying
    });

    setPlaybackState((prev) => ({ ...prev, isPlaying: nextIsPlaying }));
  };

  const handleCopyLink = () => {
    const inviteUrl = window.location.href;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCloseRoom = async () => {
    if (!window.confirm('¿Estás seguro de que deseas cerrar la sesión de la sala?')) return;
    try {
      await roomApi.closeRoom(code, currentUser);
      alert('La sala ha sido cerrada exitosamente.');
      navigate('/');
    } catch (err) {
      alert('Error al cerrar la sala: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Conectando a la sala de música...</p>
      </div>
    );
  }

  const isHost = roomData?.hostId === currentUser;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {playbackState.songUrl && (
        <audio
          ref={audioRef}
          src={playbackState.songUrl}
          onTimeUpdate={() => {
            if (isHost && audioRef.current) {
              const currentMs = Math.round(audioRef.current.currentTime * 1000);
              if (currentMs % 5000 < 250) {
                emitPlaybackSync({
                  currentTimeMs: currentMs,
                  isPlaying: !audioRef.current.paused
                });
              }
            }
          }}
        />
      )}

      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: isConnected ? 'var(--success)' : 'var(--danger)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
              <Radio size={12} /> {isConnected ? 'EN VIVO' : 'CONECTANDO...'}
            </span>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Código: <strong>{roomData?.code}</strong></span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>{roomData?.title}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Anfitrión: {roomData?.hostId}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.875rem', backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px' }}>
            <Users size={16} color="var(--accent)" />
            <span>{onlineUsersCount} oyente(s)</span>
          </div>

          <button onClick={handleCopyLink} className="btn-secondary">
            {copiedLink ? <Check size={16} color="var(--success)" /> : <Share2 size={16} />}
            <span>{copiedLink ? '¡Link Copiado!' : 'Invitar Amigos'}</span>
          </button>

          {isHost && (
            <button onClick={handleCloseRoom} className="btn-secondary" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)' }}>
              <LogOut size={16} /> Cerrar Sala
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'linear-gradient(135deg, #181a28 0%, #1c142b 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
            <Disc size={44} color="var(--accent)" style={{ animation: playbackState.isPlaying ? 'spin 4s linear infinite' : 'none' }} />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Sonando Ahora en Jam</span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '2px 0' }}>
              {playbackState.songTitle || 'Ninguna canción seleccionada'}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {playbackState.songArtist || 'Añade una canción a la cola para iniciar'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={togglePlayPause}
              disabled={!playbackState.songUrl}
              className="btn-primary"
              style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, justifyContent: 'center' }}
              title={playbackState.isPlaying ? 'Pausar para todos' : 'Reproducir para todos'}
            >
              {playbackState.isPlaying ? <Pause size={22} /> : <Play size={22} style={{ marginLeft: '2px' }} />}
            </button>

            <VoteSkipButton
              voteStatus={voteSkipStatus}
              onVoteSkip={emitVoteSkip}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <QueueList
          queue={queue}
          onAddToQueue={emitAddToQueue}
        />

        <RoomChat
          messages={messages}
          onSendMessage={emitSendMessage}
          currentUsername={currentUser}
        />
      </div>
    </div>
  );
}
