import React, { useEffect, useState } from 'react';
import {
  Users, Plus, Edit3, Trash2, ArrowLeft, MessageSquare, ListMusic,
  Music2, Play, Shield, Send, UserPlus, UserMinus, AlertCircle, Search
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { signalrClient } from '../api/signalrClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  TabsBar, ModalDialog, ConfirmDialog, CoverArtwork, StatusBadge,
  SkeletonLoader, EmptyState, formatDuration, formatRelativeDate
} from './CapaZeroUI';

/**
 * Módulo de Comunidades, Chat en Vivo y Moderación de Dueño (HU 1.8, 1.9, 2.7 y 2.8)
 * - Validaciones WCAG literales exactas del Brief v2.4:
 *   "El campo Nombre no puede estar vacío."
 *   "El campo Género no puede estar vacío."
 *   "Esta playlist ya está agregada a la comunidad."
 */
export default function CommunitiesSection({
  user,
  allSongs = [],
  userPlaylists = [],
  focusedCommunityId,
  onClearFocusedCommunity,
  onPlaySong,
  onOpenPlaylist,
  onNotify
}) {
  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('media'); // 'media' | 'chat' | 'members'
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Crear / Editar Comunidad
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCommunity, setEditingCommunity] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryType: 'Genre',
    categoryValue: '',
    coverImageUrl: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Gestión multimedia (HU 1.9 & HU 2.8)
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [selectedSongId, setSelectedSongId] = useState('');
  const [mediaError, setMediaError] = useState('');

  // Chat de Comunidad en tiempo real (HU 2.7 & HU 2.8)
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getCommunities({
        search: search.trim() || undefined,
        userId: user?.id
      });
      setCommunities(list || []);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunities();
  }, [search, user?.id]);

  const openCommunityDetail = async (communityId) => {
    setLoadingDetail(true);
    setMediaError('');
    try {
      const data = await apiClient.getCommunityById(communityId, user?.id);
      setDetail(data);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (focusedCommunityId) {
      openCommunityDetail(focusedCommunityId);
      onClearFocusedCommunity?.();
    }
  }, [focusedCommunityId]);

  // Suscripción SignalR CommunityHub (/hubs/community)
  useEffect(() => {
    if (!detail?.id) return;
    const communityId = detail.id;
    let active = true;

    signalrClient.joinCommunityChat(communityId).catch(() => {});

    const unsubNew = signalrClient.onCommunityEvent('ReceiveCommunityComment', (comment) => {
      if (!active || comment.communityId !== communityId) return;
      setDetail((prev) => {
        if (!prev || prev.id !== communityId) return prev;
        if (prev.comments.some((c) => c.id === comment.id)) return prev;
        return {
          ...prev,
          commentCount: prev.commentCount + 1,
          comments: [comment, ...prev.comments]
        };
      });
    });

    const unsubDel = signalrClient.onCommunityEvent('CommunityCommentDeleted', ({ communityId: cid, commentId }) => {
      if (!active || cid !== communityId) return;
      setDetail((prev) => {
        if (!prev || prev.id !== communityId) return prev;
        return {
          ...prev,
          commentCount: Math.max(0, prev.commentCount - 1),
          comments: prev.comments.filter((c) => c.id !== commentId)
        };
      });
    });

    return () => {
      active = false;
      unsubNew();
      unsubDel();
      signalrClient.leaveCommunityChat(communityId).catch(() => {});
    };
  }, [detail?.id]);

  const openCreateModal = () => {
    setEditingCommunity(null);
    setForm({
      name: '',
      description: '',
      categoryType: 'Genre',
      categoryValue: '',
      coverImageUrl: allSongs[0]?.coverImageUrl || ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setEditingCommunity(c);
    setForm({
      name: c.name || '',
      description: c.description || '',
      categoryType: c.categoryType || 'Genre',
      categoryValue: c.categoryValue || '',
      coverImageUrl: c.coverImageUrl || ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateCommunityForm = () => {
    const errs = {};
    if (!form.name.trim()) {
      errs.name = 'El campo Nombre no puede estar vacío.';
    }
    if (!form.categoryValue.trim()) {
      errs.categoryValue = 'El campo Género no puede estar vacío.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCommunity = async (e) => {
    e.preventDefault();
    if (!validateCommunityForm() || !user?.id) return;
    setSaving(true);
    try {
      if (editingCommunity) {
        const updated = await apiClient.updateCommunity(editingCommunity.id, {
          userId: user.id,
          name: form.name.trim(),
          description: form.description.trim(),
          categoryType: form.categoryType,
          categoryValue: form.categoryValue.trim(),
          coverImageUrl: form.coverImageUrl.trim()
        });
        setDetail(updated);
        onNotify?.('Comunidad actualizada correctamente.', 'success');
      } else {
        const created = await apiClient.createCommunity({
          name: form.name.trim(),
          description: form.description.trim(),
          categoryType: form.categoryType,
          categoryValue: form.categoryValue.trim(),
          coverImageUrl: form.coverImageUrl.trim(),
          creatorId: user.id,
          creatorName: user.name
        });
        setDetail(created);
        setActiveTab('media');
        onNotify?.(`Comunidad "${created.name}" fundada.`, 'success');
      }
      setModalOpen(false);
      await loadCommunities();
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCommunity = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteCommunity(deleteTarget.id, user.id);
      onNotify?.(`Comunidad "${deleteTarget.name}" eliminada.`, 'info');
      if (detail?.id === deleteTarget.id) setDetail(null);
      setDeleteTarget(null);
      await loadCommunities();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleJoinToggle = async () => {
    if (!detail || !user?.id) return;
    try {
      const updated = detail.isMember
        ? await apiClient.leaveCommunity(detail.id, user.id)
        : await apiClient.joinCommunity(detail.id, { userId: user.id, userName: user.name });
      setDetail(updated);
      onNotify?.(detail.isMember ? 'Has salido de la comunidad.' : `Te uniste a ${detail.name}.`, 'success');
      loadCommunities();
    } catch (err) {
      onNotify?.(err.message, 'error');
    }
  };

  const handleAddPlaylist = async () => {
    if (!detail || !selectedPlaylistId) return;
    setMediaError('');
    if ((detail.playlists || []).some((p) => p.playlistId === selectedPlaylistId)) {
      setMediaError('Esta playlist ya está agregada a la comunidad.');
      return;
    }
    try {
      await apiClient.addPlaylistToCommunity(detail.id, {
        playlistId: selectedPlaylistId,
        addedByUserId: user.id
      });
      setSelectedPlaylistId('');
      onNotify?.('Playlist agregada a la comunidad.', 'success');
      await openCommunityDetail(detail.id);
    } catch (err) {
      setMediaError(err.message);
    }
  };

  const handleRemovePlaylist = async (playlistId) => {
    if (!detail) return;
    try {
      await apiClient.removePlaylistFromCommunity(detail.id, playlistId, user.id);
      onNotify?.('Playlist removida de la comunidad.', 'info');
      await openCommunityDetail(detail.id);
    } catch (err) {
      onNotify?.(err.message, 'error');
    }
  };

  const handleAddSong = async () => {
    if (!detail || !selectedSongId) return;
    setMediaError('');
    try {
      await apiClient.addSongToCommunity(detail.id, {
        songId: selectedSongId,
        addedByUserId: user.id
      });
      setSelectedSongId('');
      onNotify?.('Canción agregada a la comunidad.', 'success');
      await openCommunityDetail(detail.id);
    } catch (err) {
      setMediaError(err.message);
    }
  };

  const handleRemoveSong = async (songId) => {
    if (!detail) return;
    try {
      await apiClient.removeSongFromCommunity(detail.id, songId, user.id);
      onNotify?.('Canción removida de la comunidad.', 'info');
      await openCommunityDetail(detail.id);
    } catch (err) {
      onNotify?.(err.message, 'error');
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    const content = commentText.trim();
    if (!content || !detail) return;
    setSendingComment(true);
    const dto = { authorId: user.id, authorName: user.name, content };
    try {
      await signalrClient.sendCommunityComment(detail.id, dto);
      setCommentText('');
    } catch {
      try {
        const created = await apiClient.addCommunityComment(detail.id, dto);
        setDetail((prev) =>
          prev && !prev.comments.some((c) => c.id === created.id)
            ? { ...prev, commentCount: prev.commentCount + 1, comments: [created, ...prev.comments] }
            : prev
        );
        setCommentText('');
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    } finally {
      setSendingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!detail) return;
    try {
      await signalrClient.deleteCommunityComment(detail.id, commentId, user.id);
      onNotify?.('Comentario moderado y eliminado.', 'info');
    } catch {
      try {
        await apiClient.deleteCommunityComment(detail.id, commentId, user.id);
        setDetail((prev) => ({
          ...prev,
          commentCount: Math.max(0, prev.commentCount - 1),
          comments: prev.comments.filter((c) => c.id !== commentId)
        }));
        onNotify?.('Comentario eliminado.', 'info');
      } catch (err) {
        onNotify?.(err.message, 'error');
      }
    }
  };

  function renderModals() {
    return (
      <>
        <ModalDialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingCommunity ? 'Editar Comunidad' : 'Fundar Nueva Comunidad'}
          subtitle="Validaciones WCAG del Brief v2.4 (HU 1.8)"
          footer={
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="community-form" className="btn-primary btn-sm" disabled={saving}>
                {saving ? 'Guardando...' : editingCommunity ? 'Guardar Cambios' : 'Crear Comunidad'}
              </button>
            </>
          }
        >
          <form id="community-form" onSubmit={handleSaveCommunity} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {formErrors.submit && (
              <div className="alert-banner error" role="alert">
                <AlertCircle size={16} />
                <span>{formErrors.submit}</span>
              </div>
            )}

            <div className="field-group">
              <label className="field-label" htmlFor="comm-name">Nombre de la comunidad *</label>
              <input
                id="comm-name"
                className={`field-input ${formErrors.name ? 'has-error' : ''}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Synth-Rock Caracas"
              />
              {formErrors.name && (
                <span className="field-error" role="alert">
                  <AlertCircle size={13} /> {formErrors.name}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
              <div className="field-group">
                <label className="field-label" htmlFor="comm-type">Enfoque</label>
                <select
                  id="comm-type"
                  className="field-select"
                  value={form.categoryType}
                  onChange={(e) => setForm({ ...form, categoryType: e.target.value })}
                >
                  <option value="Genre">Género</option>
                  <option value="Artist">Artista</option>
                </select>
              </div>
              <div className="field-group">
                <label className="field-label" htmlFor="comm-cat">Género / Artista *</label>
                <input
                  id="comm-cat"
                  className={`field-input ${formErrors.categoryValue ? 'has-error' : ''}`}
                  value={form.categoryValue}
                  onChange={(e) => setForm({ ...form, categoryValue: e.target.value })}
                  placeholder="Ej. Electronic Rock"
                />
                {formErrors.categoryValue && (
                  <span className="field-error" role="alert">
                    <AlertCircle size={13} /> {formErrors.categoryValue}
                  </span>
                )}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="comm-desc">Descripción</label>
              <textarea
                id="comm-desc"
                className="field-textarea"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Reglas de convivencia y temática musical..."
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="comm-cover">URL de Portada</label>
              <input
                id="comm-cover"
                className="field-input"
                value={form.coverImageUrl}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </form>
        </ModalDialog>

        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteCommunity}
          loading={deleting}
          title="Eliminar Comunidad"
          message={`¿Confirmas la eliminación de "${deleteTarget?.name}" junto con su muro y contenido vinculado?`}
          confirmLabel="Eliminar Comunidad"
        />
      </>
    );
  }

  // ==================== VISTA DETALLE IN-SITU ====================
  if (detail) {
    const isOwner = detail.isCreator || detail.creatorId === user?.id;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setDetail(null)}>
            <ArrowLeft size={16} /> Todas las Comunidades
          </button>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!isOwner && (
              <button
                type="button"
                className={detail.isMember ? 'btn-secondary btn-sm' : 'btn-primary btn-sm'}
                onClick={handleJoinToggle}
              >
                {detail.isMember ? <UserMinus size={15} /> : <UserPlus size={15} />}
                {detail.isMember ? 'Salir de Comunidad' : 'Unirme a Comunidad'}
              </button>
            )}
            {isOwner && (
              <>
                <StatusBadge variant="accent" icon={Shield}>Modo Dueño / Moderador</StatusBadge>
                <button type="button" className="btn-secondary btn-sm" onClick={() => openEditModal(detail)}>
                  <Edit3 size={14} /> Editar
                </button>
                <button type="button" className="btn-danger btn-sm" onClick={() => setDeleteTarget(detail)}>
                  <Trash2 size={14} /> Eliminar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Banner de la Comunidad */}
        <div className="panel-card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <CoverArtwork src={resolveCoverUrl(detail)} alt={detail.name} size={108} radius={16} />
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge variant="accent">
                {detail.categoryType === 'Artist' ? 'Artista' : 'Género'}: {detail.categoryValue}
              </StatusBadge>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Fundada por <strong>{detail.creatorName}</strong> · {detail.memberCount} miembros
              </span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>{detail.name}</h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 660 }}>
              {detail.description || 'Espacio colaborativo para descubrir música y debatir en vivo.'}
            </p>
          </div>
        </div>

        {/* #28 TabsBar */}
        <TabsBar
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'media', label: 'Playlists y Canciones', icon: ListMusic, count: (detail.playlists?.length || 0) + (detail.songs?.length || 0) },
            { id: 'chat', label: 'Portal de Chat en Vivo', icon: MessageSquare, count: detail.comments?.length || 0 },
            { id: 'members', label: 'Miembros', icon: Users, count: detail.members?.length || 0 }
          ]}
        />

        {loadingDetail ? (
          <SkeletonLoader variant="list" count={4} />
        ) : activeTab === 'media' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {mediaError && (
              <div className="alert-banner error" role="alert">
                <AlertCircle size={16} />
                <span>{mediaError}</span>
              </div>
            )}

            {/* Controles del Dueño para agregar playlists y canciones (HU 1.9) */}
            {isOwner && (
              <div className="panel-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="field-select"
                    value={selectedPlaylistId}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
                    aria-label="Seleccionar playlist para agregar"
                  >
                    <option value="">Agregar playlist personal...</option>
                    {userPlaylists.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-primary btn-sm" disabled={!selectedPlaylistId} onClick={handleAddPlaylist}>
                    <Plus size={15} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    className="field-select"
                    value={selectedSongId}
                    onChange={(e) => setSelectedSongId(e.target.value)}
                    aria-label="Seleccionar canción individual"
                  >
                    <option value="">Destacar canción individual...</option>
                    {allSongs.map((s) => (
                      <option key={s.id} value={s.id}>{s.title} — {s.artist}</option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary btn-sm" disabled={!selectedSongId} onClick={handleAddSong}>
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Playlists vinculadas */}
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: 10 }}>
                Playlists Difundidas ({detail.playlists?.length || 0})
              </h3>
              {detail.playlists?.length ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {detail.playlists.map((pl) => (
                    <div
                      key={pl.id}
                      className="panel-card"
                      style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <CoverArtwork src={resolveCoverUrl(pl)} alt={pl.playlistTitle} size={52} radius={10} />
                      <div
                        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                        onClick={() => onOpenPlaylist?.(pl.playlistId)}
                      >
                        <div className="truncate" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                          {pl.playlistTitle}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {pl.authorName} · {pl.songCount} canciones
                        </div>
                      </div>
                      {isOwner && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemovePlaylist(pl.playlistId)}
                          title="Quitar playlist de la comunidad (Moderación)"
                        >
                          <Trash2 size={15} color="#fda4af" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No hay playlists vinculadas aún.</p>
              )}
            </div>

            {/* Canciones destacadas */}
            <div>
              <h3 style={{ fontSize: '0.96rem', fontWeight: 700, marginBottom: 10 }}>
                Canciones Destacadas ({detail.songs?.length || 0})
              </h3>
              {detail.songs?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {detail.songs.map((song) => (
                    <div
                      key={song.id}
                      className="panel-card"
                      style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size={44} radius={8} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 700, fontSize: '0.9rem' }}>{song.title}</div>
                        <div className="truncate" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {song.artist} · {song.genre} · {formatDuration(song.durationInSeconds)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() =>
                          onPlaySong?.({
                            id: song.songId,
                            title: song.title,
                            artist: song.artist,
                            album: song.album,
                            genre: song.genre,
                            durationInSeconds: song.durationInSeconds,
                            audioUrl: song.audioUrl,
                            coverImageUrl: song.coverImageUrl
                          })
                        }
                        title="Reproducir"
                      >
                        <Play size={15} />
                      </button>
                      {isOwner && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleRemoveSong(song.songId)}
                          title="Eliminar canción de la comunidad (Moderación)"
                        >
                          <Trash2 size={15} color="#fda4af" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No hay canciones destacadas aún.</p>
              )}
            </div>
          </div>
        ) : activeTab === 'chat' ? (
          /* TAB 2: PORTAL DE CHAT EN VIVO (HU 2.7 & HU 2.8) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <form onSubmit={handleSendComment} className="panel-card" style={{ display: 'flex', gap: 10 }}>
              <input
                className="field-input"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe un comentario en el muro en tiempo real..."
                maxLength={1000}
              />
              <button type="submit" className="btn-primary btn-sm" disabled={sendingComment || !commentText.trim()}>
                <Send size={15} /> Publicar
              </button>
            </form>

            {detail.comments?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {detail.comments.map((c) => {
                  const canDelete = isOwner || c.authorId === user?.id;
                  return (
                    <div
                      key={c.id}
                      className="panel-card"
                      style={{ padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.authorName}</span>
                          {c.isOwnerComment && <StatusBadge variant="accent" icon={Shield}>Dueño</StatusBadge>}
                          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {formatRelativeDate(c.createdAt)}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.55 }}>
                          {c.content}
                        </p>
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => handleDeleteComment(c.id)}
                          title={isOwner && c.authorId !== user?.id ? 'Moderar y eliminar comentario de visitante' : 'Eliminar mi comentario'}
                        >
                          <Trash2 size={15} color="#fda4af" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={MessageSquare}
                title="El portal de chat está esperando el primer mensaje"
                description="Inicia la conversación con los demás miembros de esta comunidad."
              />
            )}
          </div>
        ) : (
          /* TAB 3: MIEMBROS */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {(detail.members || []).map((m) => (
              <div key={m.userId} className="panel-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: 'var(--accent-bright)'
                  }}
                >
                  {(m.userName || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="truncate" style={{ fontWeight: 700, fontSize: '0.88rem' }}>{m.userName}</div>
                  <div style={{ marginTop: 3 }}>
                    {m.isCreator ? (
                      <StatusBadge variant="accent" icon={Shield}>Fundador</StatusBadge>
                    ) : (
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Miembro</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {renderModals()}
      </div>
    );
  }

  // ==================== DIRECTORIO DE COMUNIDADES ====================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Comunidades Musicales</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Únete por género o artista, comparte playlists y debate en vivo (HU 1.8, 1.9, 2.7 y 2.8)
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> Crear Comunidad
        </button>
      </div>

      <div className="search-input-wrap" style={{ maxWidth: 340, height: 40 }}>
        <Search size={15} color="#7a84a1" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar comunidad por nombre o género..."
        />
      </div>

      {loading ? (
        <SkeletonLoader variant="cards" count={4} />
      ) : communities.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No se encontraron comunidades"
          description="Funda la primera comunidad sobre tu género o banda favorita."
          actionLabel="Crear Comunidad"
          onAction={openCreateModal}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {communities.map((comm) => (
            <article
              key={comm.id}
              className="media-card"
              style={{ padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 14 }}
              onClick={() => openCommunityDetail(comm.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <CoverArtwork src={resolveCoverUrl(comm)} alt={comm.name} size={58} radius={12} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <StatusBadge variant="accent">{comm.categoryValue}</StatusBadge>
                  <h3 className="truncate" style={{ fontSize: '1rem', fontWeight: 700, marginTop: 5 }}>
                    {comm.name}
                  </h3>
                </div>
              </div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5, minHeight: 40 }}>
                {comm.description || 'Comunidad activa de oyentes Resonance.'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                <span>{comm.memberCount} miembros · {comm.commentCount} comentarios</span>
                {comm.isCreator ? (
                  <StatusBadge variant="accent">Dueño</StatusBadge>
                ) : comm.isMember ? (
                  <StatusBadge variant="success">Miembro</StatusBadge>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      {renderModals()}
    </div>
  );
}
