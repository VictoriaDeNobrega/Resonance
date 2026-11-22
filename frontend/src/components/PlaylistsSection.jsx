import React, { useEffect, useState } from 'react';
import {
  ListMusic, Plus, Play, Trash2, Edit3, ArrowUp, ArrowDown,
  Globe, Lock, ArrowLeft, Search, Music2, AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  SegmentedControl, ModalDialog, ConfirmDialog, ToggleSwitch,
  CoverArtwork, StatusBadge, SkeletonLoader, EmptyState, formatDuration
} from './CapaZeroUI';

const COVER_URL_REGEX = /^(https?:\/\/.+|data:image\/.+|\/.+)$/i;

/**
 * Módulo de Playlists Personales y Públicas (HU 1.10, HU 2.9 y HU 2.10)
 * - SegmentedControl: Mis Playlists | Playlists Públicas de Otros Usuarios
 * - Validación cliente de nombre y formato de portada
 * - Detalle in-situ con agregar, quitar, reordenar (PUT /api/playlists/{id}/songs/reorder) y editar
 */
export default function PlaylistsSection({
  user,
  allSongs = [],
  focusedPlaylistId,
  onClearFocusedPlaylist,
  onPlaySong,
  onPlaylistsChanged,
  onNotify
}) {
  const [scope, setScope] = useState('mine'); // 'mine' | 'public'
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [publicSearch, setPublicSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Crear / Editar Playlist
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', coverImageUrl: '', isPublic: true });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Agregar canción a playlist + eliminar playlist
  const [songToAddId, setSongToAddId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadPlaylists = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [mine, pub] = await Promise.all([
        apiClient.getUserPlaylists(user.id),
        apiClient.getPublicPlaylists(user.id, publicSearch.trim() || undefined)
      ]);
      setMyPlaylists(mine || []);
      setPublicPlaylists(pub || []);
      onPlaylistsChanged?.(mine || []);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylists();
  }, [user?.id, publicSearch]);

  const openPlaylistDetail = async (playlistId) => {
    setLoadingDetail(true);
    try {
      const detail = await apiClient.getPlaylistById(playlistId);
      setSelectedPlaylist(detail);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (focusedPlaylistId) {
      openPlaylistDetail(focusedPlaylistId);
      onClearFocusedPlaylist?.();
    }
  }, [focusedPlaylistId]);

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setForm({
      name: '',
      description: '',
      coverImageUrl: allSongs[0]?.coverImageUrl || '',
      isPublic: true
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (pl) => {
    setEditingPlaylist(pl);
    setForm({
      name: pl.name || '',
      description: pl.description || '',
      coverImageUrl: pl.coverImageUrl || '',
      isPublic: Boolean(pl.isPublic)
    });
    setErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      errs.name = 'El nombre de la playlist es obligatorio.';
    } else if (trimmedName.length > 120) {
      errs.name = 'El nombre no puede superar 120 caracteres.';
    }
    const cover = form.coverImageUrl.trim();
    if (cover && !COVER_URL_REGEX.test(cover)) {
      errs.coverImageUrl = 'Formato de portada inválido. Usa una URL http(s)://, data:image/ o ruta relativa /.';
    }
    if (form.description.trim().length > 500) {
      errs.description = 'La descripción no puede superar 500 caracteres.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSavePlaylist = async (e) => {
    e.preventDefault();
    if (!validateForm() || !user?.id) return;
    setSaving(true);
    try {
      if (editingPlaylist) {
        const updated = await apiClient.updatePlaylist(editingPlaylist.id, {
          userId: user.id,
          name: form.name.trim(),
          description: form.description.trim(),
          coverImageUrl: form.coverImageUrl.trim(),
          isPublic: form.isPublic
        });
        setSelectedPlaylist(updated);
        onNotify?.('Detalles de la playlist actualizados.', 'success');
      } else {
        const created = await apiClient.createPlaylist({
          userId: user.id,
          authorName: user.name,
          name: form.name.trim(),
          description: form.description.trim(),
          coverImageUrl: form.coverImageUrl.trim(),
          isPublic: form.isPublic
        });
        setSelectedPlaylist(created);
        onNotify?.(`Playlist "${created.name}" creada correctamente.`, 'success');
      }
      setModalOpen(false);
      await loadPlaylists();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlaylist = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deletePlaylist(deleteTarget.id, user.id);
      onNotify?.(`Playlist "${deleteTarget.name}" eliminada.`, 'info');
      if (selectedPlaylist?.id === deleteTarget.id) {
        setSelectedPlaylist(null);
      }
      setDeleteTarget(null);
      await loadPlaylists();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddSong = async () => {
    if (!selectedPlaylist || !songToAddId) return;
    try {
      const updated = await apiClient.addSongToPlaylist(selectedPlaylist.id, songToAddId, user.id);
      setSelectedPlaylist(updated);
      setSongToAddId('');
      onNotify?.('Canción agregada a la playlist.', 'success');
      loadPlaylists();
    } catch (err) {
      onNotify?.(err.message, 'error');
    }
  };

  const handleRemoveSong = async (songId) => {
    if (!selectedPlaylist) return;
    try {
      const updated = await apiClient.removeSongFromPlaylist(selectedPlaylist.id, songId, user.id);
      setSelectedPlaylist(updated);
      onNotify?.('Canción removida de la playlist.', 'info');
      loadPlaylists();
    } catch (err) {
      onNotify?.(err.message, 'error');
    }
  };

  const handleMoveTrack = async (index, delta) => {
    if (!selectedPlaylist?.songs) return;
    const targetIdx = index + delta;
    if (targetIdx < 0 || targetIdx >= selectedPlaylist.songs.length) return;
    const reordered = [...selectedPlaylist.songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    // Actualización optimista + persistencia atómica en PostgreSQL 16
    setSelectedPlaylist({ ...selectedPlaylist, songs: reordered });
    try {
      const updated = await apiClient.reorderPlaylistSongs(
        selectedPlaylist.id,
        user.id,
        reordered.map((s) => s.songId)
      );
      setSelectedPlaylist(updated);
      onNotify?.('Orden de pistas guardado.', 'success');
    } catch (err) {
      onNotify?.(err.message, 'error');
      openPlaylistDetail(selectedPlaylist.id);
    }
  };

  const toPlayableSong = (item) => ({
    id: item.songId,
    title: item.title,
    artist: item.artist,
    album: item.album,
    genre: item.genre,
    durationInSeconds: item.durationInSeconds,
    audioUrl: item.audioUrl,
    coverImageUrl: item.coverImageUrl,
    playCount: item.playCount
  });

  // ==================== VISTA DETALLE IN-SITU (HU 2.9) ====================
  if (selectedPlaylist) {
    const isOwner = selectedPlaylist.userId === user?.id;
    const playableList = (selectedPlaylist.songs || []).map(toPlayableSong);
    const existingIds = new Set(playableList.map((s) => s.id));
    const availableToAdd = allSongs.filter((s) => !existingIds.has(s.id));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setSelectedPlaylist(null)}>
            <ArrowLeft size={16} /> Volver a Playlists
          </button>
          {isOwner && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn-secondary btn-sm" onClick={() => openEditModal(selectedPlaylist)}>
                <Edit3 size={14} /> Editar Detalles
              </button>
              <button type="button" className="btn-danger btn-sm" onClick={() => setDeleteTarget(selectedPlaylist)}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Cabecera de la Playlist */}
        <div className="panel-card" style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <CoverArtwork src={resolveCoverUrl(selectedPlaylist)} alt={selectedPlaylist.name} size={118} radius={16} />
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <StatusBadge variant={selectedPlaylist.isPublic ? 'success' : 'neutral'} icon={selectedPlaylist.isPublic ? Globe : Lock}>
                {selectedPlaylist.isPublic ? 'Pública' : 'Privada'}
              </StatusBadge>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Por <strong>{selectedPlaylist.authorName}</strong> · {selectedPlaylist.songCount} pistas · {formatDuration(selectedPlaylist.totalDurationSeconds)}
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{selectedPlaylist.name}</h2>
            {selectedPlaylist.description && (
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
                {selectedPlaylist.description}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={playableList.length === 0}
                onClick={() => playableList[0] && onPlaySong?.(playableList[0], playableList)}
              >
                <Play size={15} fill="#fff" /> Reproducir Lista
              </button>
            </div>
          </div>
        </div>

        {/* Barra para agregar canción (solo propietario) */}
        {isOwner && (
          <div className="panel-card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              className="field-select"
              style={{ flex: 1, minWidth: 220 }}
              value={songToAddId}
              onChange={(e) => setSongToAddId(e.target.value)}
              aria-label="Seleccionar canción del catálogo"
            >
              <option value="">Selecciona una canción del catálogo para agregar...</option>
              {availableToAdd.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} — {s.artist} ({s.genre})
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary btn-sm" disabled={!songToAddId} onClick={handleAddSong}>
              <Plus size={15} /> Agregar Pista
            </button>
          </div>
        )}

        {/* Lista ordenada con controles de reordenamiento */}
        {loadingDetail ? (
          <SkeletonLoader variant="list" count={4} />
        ) : playableList.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="Esta playlist todavía no tiene canciones"
            description={isOwner ? 'Usa el selector superior para añadir tus pistas favoritas.' : 'El creador aún no ha agregado canciones.'}
          />
        ) : (
          <div className="panel-card" style={{ padding: 8, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Canción</th>
                  <th>Género</th>
                  <th>Duración</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {selectedPlaylist.songs.map((track, idx) => (
                  <tr key={track.playlistSongId || track.songId}>
                    <td className="mono" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CoverArtwork src={resolveCoverUrl(track)} alt={track.title} size={40} radius={8} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{track.title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{track.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge variant="neutral">{track.genre}</StatusBadge></td>
                    <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatDuration(track.durationInSeconds)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => onPlaySong?.(toPlayableSong(track), playableList)}
                          title="Reproducir"
                        >
                          <Play size={15} />
                        </button>
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === 0}
                              onClick={() => handleMoveTrack(idx, -1)}
                              title="Subir orden"
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              disabled={idx === selectedPlaylist.songs.length - 1}
                              onClick={() => handleMoveTrack(idx, 1)}
                              title="Bajar orden"
                            >
                              <ArrowDown size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => handleRemoveSong(track.songId)}
                              title="Quitar de la playlist"
                            >
                              <Trash2 size={15} color="#fda4af" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {renderPlaylistModals()}
      </div>
    );
  }

  // ==================== DIRECTORIO DE PLAYLISTS (HU 1.10 & HU 2.10) ====================
  const activeList = scope === 'mine' ? myPlaylists : publicPlaylists;

  function renderPlaylistModals() {
    return (
      <>
        <ModalDialog
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingPlaylist ? 'Editar Playlist' : 'Crear Nueva Playlist'}
          subtitle="Validación en cliente de nombre y formato de portada (HU 1.10 / HU 2.9)"
          footer={
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="playlist-form" className="btn-primary btn-sm" disabled={saving}>
                {saving ? 'Guardando...' : editingPlaylist ? 'Guardar Cambios' : 'Crear Playlist'}
              </button>
            </>
          }
        >
          <form id="playlist-form" onSubmit={handleSavePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <CoverArtwork src={form.coverImageUrl} alt="Vista previa" size={72} radius={12} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>Portada personalizada</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Usa una URL http(s), data:image o elige una portada del catálogo.
                </div>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="pl-name">Nombre de la playlist *</label>
              <input
                id="pl-name"
                className={`field-input ${errors.name ? 'has-error' : ''}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Sesiones de Synth-Rock"
                maxLength={120}
              />
              {errors.name && <span className="field-error"><AlertCircle size={13} /> {errors.name}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="pl-desc">Descripción</label>
              <textarea
                id="pl-desc"
                className={`field-textarea ${errors.description ? 'has-error' : ''}`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ambiente, inspiración o propósito de la lista..."
              />
              {errors.description && <span className="field-error"><AlertCircle size={13} /> {errors.description}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="pl-cover">URL de Portada</label>
              <input
                id="pl-cover"
                className={`field-input ${errors.coverImageUrl ? 'has-error' : ''}`}
                value={form.coverImageUrl}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                placeholder="https://..."
              />
              {errors.coverImageUrl && (
                <span className="field-error"><AlertCircle size={13} /> {errors.coverImageUrl}</span>
              )}
            </div>

            <ToggleSwitch
              checked={form.isPublic}
              onChange={(val) => setForm({ ...form, isPublic: val })}
              label={form.isPublic ? 'Playlist Pública' : 'Playlist Privada'}
              description="Las playlists públicas pueden ser descubiertas por otros usuarios (HU 2.10)."
            />
          </form>
        </ModalDialog>

        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeletePlaylist}
          loading={deleting}
          title="Eliminar Playlist"
          message={`¿Deseas eliminar permanentemente la playlist "${deleteTarget?.name}"?`}
          confirmLabel="Eliminar Playlist"
        />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Playlists Musicales</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            Crea, reordena y explora listas públicas de otros oyentes (HU 1.10, 2.9 y 2.10)
          </p>
        </div>
        <button type="button" className="btn-primary btn-sm" onClick={openCreateModal}>
          <Plus size={16} /> Nueva Playlist
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <SegmentedControl
          value={scope}
          onChange={setScope}
          options={[
            { value: 'mine', label: `Mis Playlists (${myPlaylists.length})`, icon: ListMusic },
            { value: 'public', label: `Playlists Públicas (${publicPlaylists.length})`, icon: Globe }
          ]}
        />

        {scope === 'public' && (
          <div className="search-input-wrap" style={{ maxWidth: 280, height: 38 }}>
            <Search size={15} color="#7a84a1" />
            <input
              value={publicSearch}
              onChange={(e) => setPublicSearch(e.target.value)}
              placeholder="Filtrar playlists públicas..."
            />
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonLoader variant="cards" count={4} />
      ) : activeList.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title={scope === 'mine' ? 'Todavía no creas una playlist' : 'No hay playlists públicas coincidentes'}
          description={
            scope === 'mine'
              ? 'Agrupa tus pistas favoritas con portada personalizada y orden a tu medida.'
              : 'Prueba otro término de búsqueda o crea una playlist pública para la comunidad.'
          }
          actionLabel={scope === 'mine' ? 'Crear mi primera Playlist' : undefined}
          onAction={scope === 'mine' ? openCreateModal : undefined}
        />
      ) : (
        <div className="media-grid">
          {activeList.map((pl) => (
            <article
              key={pl.id}
              className="media-card"
              style={{ cursor: 'pointer' }}
              onClick={() => openPlaylistDetail(pl.id)}
            >
              <div className="square-art-wrap">
                <CoverArtwork src={resolveCoverUrl(pl)} alt={pl.name} size="fill" radius={0} />
                <div className="square-art-scrim" />
                <div style={{ position: 'absolute', top: 10, left: 10 }}>
                  <StatusBadge variant={pl.isPublic ? 'success' : 'neutral'} icon={pl.isPublic ? Globe : Lock}>
                    {pl.isPublic ? 'Pública' : 'Privada'}
                  </StatusBadge>
                </div>
                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12 }}>
                  <div className="truncate" style={{ fontWeight: 700, fontSize: '0.96rem' }}>{pl.name}</div>
                  <div className="truncate" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                    {pl.authorName} · {pl.songCount} pistas
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', fontSize: '0.78rem', color: 'var(--text-muted)' }} className="truncate">
                {pl.description || `Duración total ${formatDuration(pl.totalDurationSeconds)}`}
              </div>
            </article>
          ))}
        </div>
      )}

      {renderPlaylistModals()}
    </div>
  );
}
