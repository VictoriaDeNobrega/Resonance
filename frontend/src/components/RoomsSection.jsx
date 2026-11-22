import React, { useEffect, useRef, useState } from 'react';
import {
  Radio, Plus, Lock, Globe, Copy, Check, Users, ThumbsUp, SkipForward,
  Trash2, Send, LogOut, Power, Music2, MessageSquare, AlertCircle, KeyRound
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { signalrClient } from '../api/signalrClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  AvatarStack, StatusBadge, ModalDialog, ConfirmDialog, ToggleSwitch,
  SegmentedControl, CoverArtwork, SkeletonLoader, EmptyState, formatRelativeDate
} from './CapaZeroUI';

/**
 * Panel Interactivo de Sala Jam Activa (para el Panel Contextual Derecho de HomePage)
 * HU 1.7, HU 2.4, HU 2.5 y HU 2.6:
 * - Cola compartida con votación por canción y eliminación exclusiva por Host
 * - Votación grupal Vote Skip
 * - Chat de texto en tiempo real (sin voz/video)
 * - Botón copiar enlace de invitación y cierre/eliminación por creador
 */
export function LiveRoomPanel({
  user,
  room,
  allSongs = [],
  connectionStatus,
  onLeaveRoom,
  onRoomClosed,
  onRoomUpdated,
  onNotify
}) {
  const [subTab, setSubTab] = useState('queue'); // 'queue' | 'chat'
  const [songToAddId, setSongToAddId] = useState('');
  const [chatText, setChatText] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [closeModalMode, setCloseModalMode] = useState(null); // 'close' | 'delete' | null
  const [processingClose, setProcessingClose] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (subTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [room?.messages?.length, subTab]);

  if (!room) {
    return (
      <EmptyState
        icon={Radio}
        title="Sin Sala Jam activa"
        description="Únete o crea una sala en la sección Salas Jam para sincronizar música <= 200 ms."
      />
    );
  }

  const isHost = room.hostId === user?.id;
  const inviteUrl = `${window.location.origin}/rooms/${room.code}`;
  const skipProgress = room.skipVotesRequired > 0
    ? Math.min(100, (room.skipVoteCount / room.skipVotesRequired) * 100)
    : 0;

  const handleCopyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      onNotify?.(`Enlace de sala ${room.code} copiado al portapapeles.`, 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      onNotify?.(`Comparte este código: ${room.code}`, 'info');
    }
  };

  const handleAddQueueSong = async () => {
    if (!songToAddId) return;
    const song = allSongs.find((s) => s.id === songToAddId);
    if (!song) return;
    const dto = {
      songId: song.id,
      title: song.title,
      artist: song.artist,
      url: song.audioUrl,
      coverUrl: song.coverImageUrl,
      durationSeconds: song.durationInSeconds,
      requestedBy: user.name
    };
    try {
      await signalrClient.addSongToQueue(room.code, dto);
      setSongToAddId('');
      onNotify?.(`"${song.title}" añadida a la cola Jam.`, 'success');
    } catch {
      try {
        const updated = await apiClient.addSongToQueue(room.code, dto);
        onRoomUpdated?.(updated);
        setSongToAddId('');
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  const handleVoteSong = async (roomSongId) => {
    try {
      await signalrClient.voteQueueSong(room.code, roomSongId, user.id);
    } catch {
      try {
        const updated = await apiClient.voteQueueSong(room.code, roomSongId, user.id);
        onRoomUpdated?.(updated);
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  const handleRemoveQueueSong = async (roomSongId) => {
    try {
      await signalrClient.removeSongFromQueue(room.code, roomSongId, user.id);
      onNotify?.('Pista eliminada de la cola.', 'info');
    } catch {
      try {
        const updated = await apiClient.removeSongFromQueue(room.code, roomSongId, user.id);
        onRoomUpdated?.(updated);
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  const handleCastSkipVote = async () => {
    try {
      await signalrClient.castSkipVote(room.code, user.id);
    } catch {
      try {
        const res = await apiClient.castSkipVote(room.code, user.id);
        if (res.updatedRoom) onRoomUpdated?.(res.updatedRoom);
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  const handleSendChat = async (e) => {
    e.preventDefault();
    const content = chatText.trim();
    if (!content) return;
    const dto = { senderId: user.id, senderName: user.name, content };
    try {
      await signalrClient.sendChatMessage(room.code, dto);
      setChatText('');
    } catch {
      try {
        const msg = await apiClient.sendRoomMessage(room.code, dto);
        onRoomUpdated?.((prev) =>
          prev && !prev.messages.some((m) => m.id === msg.id)
            ? { ...prev, messages: [...prev.messages, msg] }
            : prev
        );
        setChatText('');
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  const handleConfirmCloseOrDelete = async () => {
    setProcessingClose(true);
    try {
      if (closeModalMode === 'delete') {
        await apiClient.deleteRoom(room.code, user.id);
      } else {
        await apiClient.closeRoom(room.code, user.id);
      }
      setCloseModalMode(null);
      onRoomClosed?.(closeModalMode === 'delete' ? 'Sala eliminada.' : 'Sala cerrada.');
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setProcessingClose(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Cabecera de Sala */}
      <div
        style={{
          padding: 12,
          borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(124,58,237,0.18), rgba(20,24,42,0.92))',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <StatusBadge
            variant={connectionStatus === 'connected' ? 'success' : 'warning'}
            dot
            pulse={connectionStatus === 'connected'}
          >
            {connectionStatus === 'connected' ? 'Sincronizado <=200ms' : 'Reconectando...'}
          </StatusBadge>
          <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--accent-bright)', fontWeight: 700 }}>
            {room.code}
          </span>
        </div>

        <div className="truncate" style={{ fontWeight: 800, fontSize: '0.96rem' }}>{room.title}</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <span>Host: <strong>{room.hostName}</strong></span>
          <span className="mono">{room.listenerCount}/{room.maxCapacity} oyentes</span>
        </div>

        {room.isPrivate && room.accessKey && (
          <div style={{ fontSize: '0.74rem', color: '#fcd34d', display: 'flex', alignItems: 'center', gap: 6 }}>
            <KeyRound size={13} /> PIN Privado: <strong className="mono">{room.accessKey}</strong>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          <button type="button" className="btn-secondary btn-sm" style={{ flex: 1, minHeight: 30, fontSize: '0.75rem' }} onClick={handleCopyInvite}>
            {copiedLink ? <Check size={13} /> : <Copy size={13} />}
            {copiedLink ? 'Copiado' : 'Invitar'}
          </button>
          <button type="button" className="btn-ghost btn-sm" style={{ minHeight: 30, fontSize: '0.75rem' }} onClick={onLeaveRoom} title="Salir de la sala">
            <LogOut size={13} /> Salir
          </button>
          {isHost && (
            <>
              <button type="button" className="btn-ghost btn-sm" style={{ minHeight: 30, fontSize: '0.75rem', color: '#fcd34d' }} onClick={() => setCloseModalMode('close')} title="Cerrar sesión de sala">
                <Power size={13} />
              </button>
              <button type="button" className="btn-ghost btn-sm" style={{ minHeight: 30, fontSize: '0.75rem', color: '#fda4af' }} onClick={() => setCloseModalMode('delete')} title="Eliminar sala">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Votación grupal Vote Skip (HU 2.5) */}
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: 7
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Vote Skip ({room.skipVoteCount || 0}/{room.skipVotesRequired || 1})
          </span>
          <button type="button" className="btn-secondary btn-sm" style={{ minHeight: 28, padding: '0 10px', fontSize: '0.74rem' }} onClick={handleCastSkipVote}>
            <SkipForward size={13} /> Saltar
          </button>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ width: `${skipProgress}%`, height: '100%', background: 'var(--accent-light)', transition: 'width 0.25s ease' }} />
        </div>
      </div>

      {/* Selector Cola / Chat */}
      <SegmentedControl
        fullWidth
        value={subTab}
        onChange={setSubTab}
        options={[
          { value: 'queue', label: `Cola (${room.queue?.length || 0})`, icon: Music2 },
          { value: 'chat', label: `Chat (${room.messages?.length || 0})`, icon: MessageSquare }
        ]}
      />

      {subTab === 'queue' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
          {/* Agregar canción a la cola */}
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              className="field-select"
              style={{ fontSize: '0.78rem', padding: '7px 10px' }}
              value={songToAddId}
              onChange={(e) => setSongToAddId(e.target.value)}
              aria-label="Elegir pista para agregar a la cola"
            >
              <option value="">+ Añadir pista a la cola...</option>
              {allSongs.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>
              ))}
            </select>
            <button type="button" className="btn-primary btn-sm" style={{ minHeight: 34, padding: '0 10px' }} disabled={!songToAddId} onClick={handleAddQueueSong}>
              <Plus size={14} />
            </button>
          </div>

          <div className="rail-scroll">
            {(room.queue || []).length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                Cola vacía. Agrega una pista arriba para que la sala vote.
              </p>
            ) : (
              room.queue.map((item) => {
                const voted = (item.voterIds || []).includes(user?.id);
                return (
                  <div key={item.id} className="top-track-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <CoverArtwork src={resolveCoverUrl(item)} alt={item.title} size={38} radius={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="truncate" style={{ fontSize: '0.82rem', fontWeight: 700 }}>{item.title}</div>
                      <div className="truncate" style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>
                        {item.artist} · {item.requestedBy}
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`btn-icon ${voted ? 'active' : ''}`}
                      style={{ width: 'auto', padding: '0 8px', height: 28, gap: 4, fontSize: '0.74rem' }}
                      onClick={() => handleVoteSong(item.id)}
                      title="Votar canción en cola"
                    >
                      <ThumbsUp size={12} />
                      <span className="mono">{item.voteCount}</span>
                    </button>
                    {isHost && (
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ width: 28, height: 28 }}
                        onClick={() => handleRemoveQueueSong(item.id)}
                        title="Eliminar canción de la cola (Host)"
                      >
                        <Trash2 size={13} color="#fda4af" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* CHAT DE TEXTO EN TIEMPO REAL (HU 2.6 — Sin llamadas de voz ni video) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Chat de texto en vivo · Sin voz/video (estabilidad Hi-Fi)
          </div>

          <div className="rail-scroll">
            {(room.messages || []).length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
                Saluda a la sala para romper el hielo.
              </p>
            ) : (
              room.messages.map((m) => {
                const mine = m.senderId === user?.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: mine ? 'var(--accent-soft)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${mine ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      fontSize: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 3 }}>
                      <strong style={{ fontSize: '0.74rem', color: mine ? '#ddd6fe' : '#fff' }}>{m.senderName}</strong>
                      <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{formatRelativeDate(m.sentAt)}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}>{m.content}</div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendChat} style={{ display: 'flex', gap: 6 }}>
            <input
              className="field-input"
              style={{ fontSize: '0.8rem', padding: '8px 10px' }}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Escribe un mensaje..."
              maxLength={1000}
            />
            <button type="submit" className="btn-primary btn-sm" style={{ minHeight: 36, padding: '0 12px' }} disabled={!chatText.trim()}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(closeModalMode)}
        onClose={() => setCloseModalMode(null)}
        onConfirm={handleConfirmCloseOrDelete}
        loading={processingClose}
        title={closeModalMode === 'delete' ? 'Eliminar Sala Jam' : 'Cerrar Sesión de Sala'}
        message={
          closeModalMode === 'delete'
            ? `¿Seguro que deseas eliminar permanentemente la sala "${room.title}" (${room.code})?`
            : `¿Deseas cerrar la sala "${room.title}"? Todos los oyentes conectados serán notificados.`
        }
        confirmLabel={closeModalMode === 'delete' ? 'Eliminar Sala' : 'Cerrar Sala'}
      />
    </div>
  );
}

/**
 * Directorio y Creación de Salas Jam Sincronizadas (HU 1.6, 1.7, 2.4, 2.5 y 2.6)
 */
export default function RoomsSection({
  user,
  allSongs = [],
  activeRoom,
  onJoinRoom,
  onOpenActiveRoomPanel,
  onNotify
}) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinCodeInput, setJoinCodeInput] = useState('');

  // Modal Crear Sala (HU 1.6)
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    genre: 'Alternative Rock',
    isPrivate: false,
    accessKey: '',
    maxCapacity: 50,
    initialSongId: ''
  });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);
  const [createdBanner, setCreatedBanner] = useState(null);

  // Modal PIN para Sala Privada
  const [pinRoomTarget, setPinRoomTarget] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [joiningPin, setJoiningPin] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getActiveRooms();
      setRooms(list || []);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [activeRoom?.code]);

  const validateCreate = () => {
    const errs = {};
    const title = createForm.title.trim();
    if (title.length < 3 || title.length > 50) {
      errs.title = 'El título de la sala debe tener entre 3 y 50 caracteres.';
    }
    const cap = Number(createForm.maxCapacity);
    if (!Number.isInteger(cap) || cap < 2 || cap > 50) {
      errs.maxCapacity = 'El aforo permitido es de 2 a 50 usuarios simultáneos.';
    }
    if (createForm.isPrivate && createForm.accessKey.trim() && !/^\d{6}$/.test(createForm.accessKey.trim())) {
      errs.accessKey = 'La clave privada debe contener exactamente 6 dígitos numéricos (o déjala vacía para autogenerarla).';
    }
    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!validateCreate() || !user?.id) return;
    setCreating(true);
    try {
      const created = await apiClient.createRoom({
        title: createForm.title.trim(),
        genre: createForm.genre.trim() || 'General',
        isPrivate: createForm.isPrivate,
        accessKey: createForm.isPrivate && createForm.accessKey.trim() ? createForm.accessKey.trim() : null,
        maxCapacity: Number(createForm.maxCapacity) || 50,
        hostId: user.id,
        hostName: user.name,
        initialSongId: createForm.initialSongId || allSongs[0]?.id || null
      });
      setCreateOpen(false);
      setCreatedBanner({
        code: created.code,
        title: created.title,
        accessKey: created.accessKey,
        inviteLink: `${window.location.origin}/rooms/${created.code}`
      });
      await onJoinRoom?.(created.code, created.accessKey, created);
      await loadRooms();
    } catch (err) {
      setCreateErrors({ submit: err.message });
    } finally {
      setCreating(false);
    }
  };

  const handleRoomCardJoin = async (room) => {
    if (room.isPrivate && room.hostId !== user?.id) {
      setPinRoomTarget(room);
      setPinValue('');
      setPinError('');
      return;
    }
    await onJoinRoom?.(room.code, null);
  };

  const handleSubmitPin = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pinValue.trim())) {
      setPinError('Ingresa la clave numérica de exactamente 6 dígitos.');
      return;
    }
    setJoiningPin(true);
    setPinError('');
    try {
      await onJoinRoom?.(pinRoomTarget.code, pinValue.trim());
      setPinRoomTarget(null);
    } catch (err) {
      setPinError(err.message);
    } finally {
      setJoiningPin(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) return;
    const known = rooms.find((r) => r.code.toUpperCase() === code);
    if (known?.isPrivate && known.hostId !== user?.id) {
      setPinRoomTarget(known);
      setPinValue('');
      setPinError('');
      return;
    }
    await onJoinRoom?.(code, null);
    setJoinCodeInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Salas Jam en Tiempo Real</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Escucha sincronizada con SignalR &lt;= 200 ms, cola democrática y hasta 50 oyentes por sala (HU 1.6 y 1.7)
          </p>
        </div>
        <button
          type="button"
          className="btn-primary btn-sm"
          onClick={() => {
            setCreateForm({
              title: '',
              genre: 'Alternative Rock',
              isPrivate: false,
              accessKey: '',
              maxCapacity: 50,
              initialSongId: allSongs[0]?.id || ''
            });
            setCreateErrors({});
            setCreateOpen(true);
          }}
        >
          <Plus size={16} /> Crear Sala Jam
        </button>
      </div>

      {/* Banner instantáneo de link de invitación (< 2s — HU 1.6) */}
      {createdBanner && (
        <div className="alert-banner success" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <strong>Sala "{createdBanner.title}" activa ({createdBanner.code})</strong>
            <div className="mono" style={{ fontSize: '0.78rem', marginTop: 2 }}>
              Link: {createdBanner.inviteLink}
              {createdBanner.accessKey ? ` · PIN: ${createdBanner.accessKey}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(createdBanner.inviteLink).catch(() => {});
                onNotify?.('Link de invitación copiado.', 'success');
              }}
            >
              <Copy size={14} /> Copiar Link
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setCreatedBanner(null)}>
              Ocultar
            </button>
          </div>
        </div>
      )}

      {/* Unirse por código directo */}
      <form onSubmit={handleJoinByCode} className="panel-card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="field-input mono"
          style={{ flex: 1, minWidth: 200, textTransform: 'uppercase' }}
          value={joinCodeInput}
          onChange={(e) => setJoinCodeInput(e.target.value)}
          placeholder="Ingresa un código de sala (ej. RES-2026)..."
        />
        <button type="submit" className="btn-secondary btn-sm" disabled={!joinCodeInput.trim()}>
          <Radio size={15} /> Entrar por Código
        </button>
        {activeRoom && (
          <button type="button" className="btn-primary btn-sm" onClick={onOpenActiveRoomPanel}>
            Ver Sala Activa ({activeRoom.code})
          </button>
        )}
      </form>

      {/* Grid de salas activas */}
      {loading ? (
        <SkeletonLoader variant="cards" count={3} />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No hay salas Jam activas en este momento"
          description="Crea una sala pública o privada con PIN de 6 dígitos e invita a tus amigos en segundos."
          actionLabel="Crear Sala Jam"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {rooms.map((room) => {
            const isCurrent = activeRoom?.code === room.code;
            const fakeAttendees = [room.hostName, 'Oyente A', 'Oyente B', 'Oyente C'].slice(0, Math.max(1, Math.min(4, room.listenerCount)));
            return (
              <article
                key={room.id}
                className="media-card"
                style={{
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  borderColor: isCurrent ? 'var(--accent-light)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <StatusBadge variant={room.isPrivate ? 'warning' : 'success'} icon={room.isPrivate ? Lock : Globe}>
                    {room.isPrivate ? 'Privada (PIN)' : 'Pública'}
                  </StatusBadge>
                  <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--accent-bright)', fontWeight: 700 }}>
                    {room.code}
                  </span>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800 }}>{room.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Anfitrión: <strong>{room.hostName}</strong> · {room.genre}
                  </p>
                </div>

                {/* Pista sonando actualmente */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 10,
                    borderRadius: 12,
                    background: 'rgba(9, 11, 20, 0.6)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <CoverArtwork src={resolveCoverUrl({ coverUrl: room.currentSongCoverUrl })} alt={room.currentSongTitle || 'Pista'} size={42} radius={8} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="truncate" style={{ fontSize: '0.84rem', fontWeight: 700 }}>
                      {room.currentSongTitle || 'Esperando pista...'}
                    </div>
                    <div className="truncate" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {room.currentSongArtist || 'Cola lista'} · {room.queueCount} en cola
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 'auto' }}>
                  <AvatarStack names={fakeAttendees} badgeText={`${room.listenerCount}/${room.maxCapacity}`} />
                  <button
                    type="button"
                    className={isCurrent ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                    onClick={() => (isCurrent ? onOpenActiveRoomPanel?.() : handleRoomCardJoin(room))}
                  >
                    {isCurrent ? 'En Sala' : room.isPrivate && room.hostId !== user?.id ? 'Ingresar PIN' : 'Unirme'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Crear Sala Jam (HU 1.6) */}
      <ModalDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear Nueva Sala Jam"
        subtitle="Sincronización SignalR <= 200 ms · Máximo 50 usuarios simultáneos"
        footer={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setCreateOpen(false)}>
              Cancelar
            </button>
            <button type="submit" form="create-room-form" className="btn-primary btn-sm" disabled={creating}>
              {creating ? 'Creando sala...' : 'Crear y Entrar'}
            </button>
          </>
        }
      >
        <form id="create-room-form" onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {createErrors.submit && (
            <div className="alert-banner error" role="alert">
              <AlertCircle size={16} />
              <span>{createErrors.submit}</span>
            </div>
          )}

          <div className="field-group">
            <label className="field-label" htmlFor="rm-title">Nombre de la sala (3 a 50 caracteres) *</label>
            <input
              id="rm-title"
              className={`field-input ${createErrors.title ? 'has-error' : ''}`}
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              placeholder="Ej. After Hours Synth Jam"
              maxLength={50}
            />
            {createErrors.title && <span className="field-error"><AlertCircle size={13} /> {createErrors.title}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="rm-genre">Género musical</label>
              <input
                id="rm-genre"
                className="field-input"
                value={createForm.genre}
                onChange={(e) => setCreateForm({ ...createForm, genre: e.target.value })}
                placeholder="Alternative Rock"
              />
            </div>
            <div className="field-group">
              <label className="field-label" htmlFor="rm-cap">Aforo (2–50)</label>
              <input
                id="rm-cap"
                type="number"
                min={2}
                max={50}
                className={`field-input mono ${createErrors.maxCapacity ? 'has-error' : ''}`}
                value={createForm.maxCapacity}
                onChange={(e) => setCreateForm({ ...createForm, maxCapacity: e.target.value })}
              />
            </div>
          </div>
          {createErrors.maxCapacity && <span className="field-error"><AlertCircle size={13} /> {createErrors.maxCapacity}</span>}

          <div className="field-group">
            <label className="field-label" htmlFor="rm-song">Canción inicial</label>
            <select
              id="rm-song"
              className="field-select"
              value={createForm.initialSongId}
              onChange={(e) => setCreateForm({ ...createForm, initialSongId: e.target.value })}
            >
              <option value="">Sin canción inicial</option>
              {allSongs.map((s) => (
                <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>
              ))}
            </select>
          </div>

          <ToggleSwitch
            checked={createForm.isPrivate}
            onChange={(val) => setCreateForm({ ...createForm, isPrivate: val })}
            label={createForm.isPrivate ? 'Sala Privada con PIN de 6 dígitos' : 'Sala Pública Abierta'}
            description="Si activas privacidad, los invitados necesitarán la clave de 6 dígitos."
          />

          {createForm.isPrivate && (
            <div className="field-group">
              <label className="field-label" htmlFor="rm-pin">Clave de 6 dígitos (opcional: autogenerada si se omite)</label>
              <input
                id="rm-pin"
                className={`field-input mono ${createErrors.accessKey ? 'has-error' : ''}`}
                value={createForm.accessKey}
                onChange={(e) => setCreateForm({ ...createForm, accessKey: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="Ej. 123456"
                maxLength={6}
              />
              {createErrors.accessKey && <span className="field-error"><AlertCircle size={13} /> {createErrors.accessKey}</span>}
            </div>
          )}
        </form>
      </ModalDialog>

      {/* Modal PIN para entrar a sala privada */}
      <ModalDialog
        isOpen={Boolean(pinRoomTarget)}
        onClose={() => setPinRoomTarget(null)}
        title={`Sala Privada · ${pinRoomTarget?.title || ''}`}
        subtitle={`Código ${pinRoomTarget?.code || ''} — Ingresa la clave numérica de 6 dígitos`}
        footer={
          <>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setPinRoomTarget(null)}>
              Cancelar
            </button>
            <button type="submit" form="pin-join-form" className="btn-primary btn-sm" disabled={joiningPin}>
              {joiningPin ? 'Verificando...' : 'Entrar a la Sala'}
            </button>
          </>
        }
      >
        <form id="pin-join-form" onSubmit={handleSubmitPin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="join-pin">Clave de acceso (6 dígitos)</label>
            <input
              id="join-pin"
              className={`field-input mono ${pinError ? 'has-error' : ''}`}
              style={{ fontSize: '1.25rem', letterSpacing: '0.35em', textAlign: 'center' }}
              value={pinValue}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              autoFocus
            />
            {pinError && <span className="field-error"><AlertCircle size={13} /> {pinError}</span>}
          </div>
          <p className="field-hint">
            Demo: la sala semilla privada <strong>RES-7741</strong> usa el PIN <strong className="mono">123456</strong>.
          </p>
        </form>
      </ModalDialog>
    </div>
  );
}
