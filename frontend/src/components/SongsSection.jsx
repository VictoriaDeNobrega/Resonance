import React, { useEffect, useState } from 'react';
import {
  Play, Pause, Heart, Plus, Edit3, Trash2, Info, Radio,
  Star, BarChart3, Music2, TrendingUp, Disc3, AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  CoverArtwork, StatusBadge, ModalDialog, ConfirmDialog,
  SkeletonLoader, EmptyState, CountUp, formatDuration
} from './CapaZeroUI';

const EMPTY_SONG_FORM = {
  title: '',
  artist: '',
  album: '',
  genre: 'Alternative Rock',
  durationInSeconds: 210,
  audioUrl: '',
  coverImageUrl: '',
  description: ''
};

/**
 * Módulo de Canciones, Catálogo CRUD y Estadísticas (HU 1.3, HU 1.5, HU 2.3)
 * Soporta sub-modos: 'discover' | 'catalog' | 'favorites' | 'stats'
 */
export default function SongsSection({
  mode = 'discover',
  user,
  homeData,
  selectedGenre,
  selectedServer = 'movil',
  loading,
  currentSong,
  isPlaying,
  activeRoom,
  onPlaySong,
  onToggleFavorite,
  onOpenSongDetail,
  onAddSongToRoom,
  onRefreshCatalog,
  onNotify
}) {
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Estado Modal CRUD de canciones (HU 1.5)
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState(null);
  const [songForm, setSongForm] = useState(EMPTY_SONG_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [savingSong, setSavingSong] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (mode === 'favorites' && user?.id) {
      setLoadingFavorites(true);
      apiClient.getUserFavorites(user.id)
        .then((list) => setFavorites(list || []))
        .catch((err) => onNotify?.(err.message, 'error'))
        .finally(() => setLoadingFavorites(false));
    }
  }, [mode, user?.id, homeData]);

  useEffect(() => {
    if (mode === 'stats') {
      setLoadingStats(true);
      apiClient.getGlobalStats(user?.id, selectedServer)
        .then((data) => setStats(data))
        .catch((err) => onNotify?.(err.message, 'error'))
        .finally(() => setLoadingStats(false));
    }
  }, [mode, user?.id, selectedServer, homeData]);

  const filterByGenre = (list = []) => {
    if (!selectedGenre || selectedGenre === 'ALL') return list;
    return list.filter((s) => (s.genre || '').toLowerCase() === selectedGenre.toLowerCase());
  };

  const allSongs = filterByGenre(homeData?.allSongs || []);
  const trendingSongs = filterByGenre(homeData?.trendingSongs || []);
  const featuredSong = trendingSongs[0] || allSongs[0] || homeData?.featuredSong || null;

  const openCreateModal = () => {
    setEditingSong(null);
    setSongForm(EMPTY_SONG_FORM);
    setFormErrors({});
    setSongModalOpen(true);
  };

  const openEditModal = (song) => {
    setEditingSong(song);
    setSongForm({
      title: song.title || '',
      artist: song.artist || '',
      album: song.album || '',
      genre: song.genre || '',
      durationInSeconds: song.durationInSeconds || 0,
      audioUrl: song.audioUrl || '',
      coverImageUrl: song.coverImageUrl || '',
      description: song.description || ''
    });
    setFormErrors({});
    setSongModalOpen(true);
  };

  const validateSongForm = () => {
    const errs = {};
    if (!songForm.title.trim()) errs.title = 'El título de la canción es obligatorio.';
    if (!songForm.artist.trim()) errs.artist = 'El artista es obligatorio.';
    if (!songForm.genre.trim()) errs.genre = 'El género es obligatorio.';
    if (!songForm.audioUrl.trim()) {
      errs.audioUrl = 'La URL de audio es obligatoria.';
    } else if (!/^https?:\/\/.+/i.test(songForm.audioUrl.trim())) {
      errs.audioUrl = 'Ingresa una URL de audio válida (http:// o https://).';
    }
    if (Number(songForm.durationInSeconds) < 0 || Number(songForm.durationInSeconds) > 7200) {
      errs.durationInSeconds = 'La duración debe estar entre 0 y 7200 segundos.';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveSong = async (e) => {
    e.preventDefault();
    if (!validateSongForm()) return;
    setSavingSong(true);
    try {
      const payload = {
        title: songForm.title.trim(),
        artist: songForm.artist.trim(),
        album: songForm.album.trim(),
        genre: songForm.genre.trim(),
        durationInSeconds: Number(songForm.durationInSeconds) || 0,
        audioUrl: songForm.audioUrl.trim(),
        coverImageUrl: songForm.coverImageUrl.trim(),
        description: songForm.description.trim(),
        ...(editingSong ? {} : { uploadedById: user?.id || null, uploadedByName: user?.name || 'Resonance' })
      };

      if (editingSong) {
        await apiClient.updateSong(editingSong.id, payload);
        onNotify?.('Canción actualizada correctamente.', 'success');
      } else {
        await apiClient.createSong(payload);
        onNotify?.('Canción agregada al catálogo en PostgreSQL 16.', 'success');
      }
      setSongModalOpen(false);
      await onRefreshCatalog?.();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setSavingSong(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.deleteSong(deleteTarget.id);
      onNotify?.(`"${deleteTarget.title}" eliminada del catálogo.`, 'info');
      setDeleteTarget(null);
      await onRefreshCatalog?.();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ==================== VISTA ESTADÍSTICAS (HU 2.3) ====================
  if (mode === 'stats') {
    if (loadingStats && !stats) return <SkeletonLoader variant="cards" count={4} />;
    if (!stats) {
      return (
        <EmptyState
          icon={BarChart3}
          title="Sin estadísticas disponibles"
          description="Reproduce algunas pistas para comenzar a registrar métricas en PostgreSQL 16."
        />
      );
    }

    const maxGenrePlays = Math.max(1, ...(stats.playsByGenre || []).map((g) => g.totalPlays || 1));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Estadísticas de Reproducción</h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Métricas globales en vivo desde PostgreSQL 16 y Navidrome (HU 2.3)
            </p>
          </div>
          <StatusBadge variant="accent" icon={TrendingUp}>Tiempo Real</StatusBadge>
        </div>

        {/* KPIs con CountUp (#61) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14 }}>
          {[
            { label: 'Total Canciones', value: stats.totalSongs, decimals: 0 },
            { label: 'Reproducciones', value: stats.totalPlays, decimals: 0 },
            { label: 'Favoritos', value: stats.totalFavorites, decimals: 0 },
            { label: 'Reseñas', value: stats.totalReviews, decimals: 0 },
            { label: 'Rating Promedio', value: stats.globalAverageRating, decimals: 2, suffix: ' / 5' }
          ].map((kpi) => (
            <div key={kpi.label} className="panel-card" style={{ padding: 18 }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {kpi.label}
              </div>
              <div className="mono" style={{ fontSize: '1.7rem', fontWeight: 800, marginTop: 6, color: '#fff' }}>
                <CountUp value={kpi.value} decimals={kpi.decimals} suffix={kpi.suffix || ''} />
              </div>
            </div>
          ))}
        </div>

        {/* Géneros y Artistas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Reproducciones por Género</h3>
            {(stats.playsByGenre || []).map((g) => (
              <div key={g.genre} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                  <span style={{ fontWeight: 600 }}>{g.genre}</span>
                  <span className="mono" style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    {g.totalPlays} plays · {g.songCount} pistas
                  </span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(6, (g.totalPlays / maxGenrePlays) * 100)}%`,
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #7c3aed, #a78bfa)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Artistas Más Escuchados</h3>
            {(stats.topArtists || []).map((a, i) => (
              <div
                key={a.artist}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(9, 11, 20, 0.55)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700, width: 22 }}>
                    #{i + 1}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{a.artist}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{a.songCount} pistas</div>
                  </div>
                </div>
                <StatusBadge variant="accent">{a.totalPlays} plays</StatusBadge>
              </div>
            ))}
          </div>
        </div>

        {/* Top Canciones */}
        <div className="panel-card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Ranking Top Pistas</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Canción</th>
                  <th>Género</th>
                  <th>Plays</th>
                  <th>Rating</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(stats.topSongs || []).map((song, idx) => (
                  <tr key={song.id}>
                    <td className="mono" style={{ color: 'var(--accent-bright)', fontWeight: 700 }}>{idx + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size={38} radius={8} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{song.title}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
                        </div>
                      </div>
                    </td>
                    <td><StatusBadge variant="neutral">{song.genre}</StatusBadge></td>
                    <td className="mono">{song.playCount}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.82rem' }}>
                        <Star size={13} color="#f59e0b" fill="#f59e0b" />
                        {song.averageRating ? song.averageRating.toFixed(1) : '—'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button type="button" className="btn-icon" onClick={() => onPlaySong?.(song, stats.topSongs)} title="Reproducir">
                          <Play size={15} />
                        </button>
                        <button type="button" className="btn-icon" onClick={() => onOpenSongDetail?.(song.id)} title="Ficha y reseñas">
                          <Info size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==================== VISTA FAVORITOS ====================
  if (mode === 'favorites') {
    if (loadingFavorites) return <SkeletonLoader variant="cards" count={4} />;
    const list = filterByGenre(favorites);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Tus Canciones Favoritas</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
            {list.length} pistas guardadas en tu biblioteca personal
          </p>
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Aún no tienes canciones favoritas"
            description="Marca el corazón en cualquier pista del catálogo o desde el reproductor para guardarlas aquí."
          />
        ) : (
          <div className="media-grid">
            {list.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <article key={song.id} className="media-card">
                  <div className="square-art-wrap">
                    <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size="fill" radius={0} />
                    <div className="square-art-scrim" />
                    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 700, fontSize: '0.92rem' }}>{song.title}</div>
                        <div className="truncate" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
                      </div>
                      <button
                        type="button"
                        className="play-fab"
                        onClick={() => onPlaySong?.(song, list)}
                        aria-label={`Reproducir ${song.title}`}
                      >
                        {isCurrent && isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" style={{ marginLeft: 2 }} />}
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {formatDuration(song.durationInSeconds)}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button type="button" className="btn-icon active" onClick={() => onToggleFavorite?.(song.id)} title="Quitar favorito">
                        <Heart size={15} fill="#8b5cf6" />
                      </button>
                      <button type="button" className="btn-icon" onClick={() => onOpenSongDetail?.(song.id)} title="Ficha y reseñas">
                        <Info size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==================== VISTA CATÁLOGO CRUD (HU 1.5) ====================
  if (mode === 'catalog') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>Catálogo Musical Completo</h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Gestiona pistas (agregar, editar y eliminar) conectadas a PostgreSQL 16 y Navidrome (HU 1.5)
            </p>
          </div>
          <button type="button" className="btn-primary btn-sm" onClick={openCreateModal}>
            <Plus size={16} /> Agregar Canción
          </button>
        </div>

        {loading ? (
          <SkeletonLoader variant="list" count={6} />
        ) : allSongs.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="No hay canciones para este filtro"
            description="Agrega una pista nueva o limpia el filtro de género activo."
            actionLabel="Agregar Canción"
            onAction={openCreateModal}
          />
        ) : (
          <div className="panel-card" style={{ padding: 8, overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pista</th>
                  <th>Álbum</th>
                  <th>Género</th>
                  <th>Duración</th>
                  <th>Plays</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {allSongs.map((song) => {
                  const isCurrent = currentSong?.id === song.id;
                  return (
                    <tr key={song.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size={42} radius={8} />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: isCurrent ? 'var(--accent-bright)' : '#fff' }}>
                              {song.title}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{song.artist}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{song.album || '—'}</td>
                      <td><StatusBadge variant="neutral">{song.genre}</StatusBadge></td>
                      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {formatDuration(song.durationInSeconds)}
                      </td>
                      <td className="mono" style={{ fontSize: '0.82rem' }}>{song.playCount}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            type="button"
                            className={`btn-icon ${isCurrent && isPlaying ? 'active' : ''}`}
                            onClick={() => onPlaySong?.(song, allSongs)}
                            title="Reproducir"
                          >
                            {isCurrent && isPlaying ? <Pause size={15} /> : <Play size={15} />}
                          </button>
                          <button
                            type="button"
                            className={`btn-icon ${song.isFavorite ? 'active' : ''}`}
                            onClick={() => onToggleFavorite?.(song.id)}
                            title="Favorito"
                          >
                            <Heart size={15} fill={song.isFavorite ? '#8b5cf6' : 'none'} />
                          </button>
                          {activeRoom && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => onAddSongToRoom?.(song)}
                              title="Agregar a la Sala Jam activa"
                            >
                              <Radio size={15} />
                            </button>
                          )}
                          <button type="button" className="btn-icon" onClick={() => onOpenSongDetail?.(song.id)} title="Ficha y reseñas">
                            <Info size={15} />
                          </button>
                          <button type="button" className="btn-icon" onClick={() => openEditModal(song)} title="Editar canción">
                            <Edit3 size={15} />
                          </button>
                          <button type="button" className="btn-icon" onClick={() => setDeleteTarget(song)} title="Eliminar canción">
                            <Trash2 size={15} color="#fda4af" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {renderSongCrudModals()}
      </div>
    );
  }

  // ==================== VISTA HOME / DISCOVER (Estilo reference_ui.png) ====================
  function renderSongCrudModals() {
    return (
      <>
        <ModalDialog
          isOpen={songModalOpen}
          onClose={() => setSongModalOpen(false)}
          title={editingSong ? 'Editar Canción' : 'Agregar Nueva Canción'}
          subtitle="Persistencia directa en PostgreSQL 16 (HU 1.5)"
          wide
          footer={
            <>
              <button type="button" className="btn-secondary btn-sm" onClick={() => setSongModalOpen(false)}>
                Cancelar
              </button>
              <button type="submit" form="song-crud-form" className="btn-primary btn-sm" disabled={savingSong}>
                {savingSong ? 'Guardando...' : editingSong ? 'Guardar Cambios' : 'Crear Canción'}
              </button>
            </>
          }
        >
          <form id="song-crud-form" onSubmit={handleSaveSong} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="field-group">
              <label className="field-label" htmlFor="song-title">Título *</label>
              <input
                id="song-title"
                className={`field-input ${formErrors.title ? 'has-error' : ''}`}
                value={songForm.title}
                onChange={(e) => setSongForm({ ...songForm, title: e.target.value })}
                placeholder="Ej. Impeccable"
              />
              {formErrors.title && <span className="field-error"><AlertCircle size={13} /> {formErrors.title}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="song-artist">Artista *</label>
              <input
                id="song-artist"
                className={`field-input ${formErrors.artist ? 'has-error' : ''}`}
                value={songForm.artist}
                onChange={(e) => setSongForm({ ...songForm, artist: e.target.value })}
                placeholder="Ej. Calva Louise"
              />
              {formErrors.artist && <span className="field-error"><AlertCircle size={13} /> {formErrors.artist}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="song-album">Álbum</label>
              <input
                id="song-album"
                className="field-input"
                value={songForm.album}
                onChange={(e) => setSongForm({ ...songForm, album: e.target.value })}
                placeholder="Ej. Edge of the Abyss"
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="song-genre">Género *</label>
              <input
                id="song-genre"
                className={`field-input ${formErrors.genre ? 'has-error' : ''}`}
                value={songForm.genre}
                onChange={(e) => setSongForm({ ...songForm, genre: e.target.value })}
                placeholder="Ej. Electronic Rock"
              />
              {formErrors.genre && <span className="field-error"><AlertCircle size={13} /> {formErrors.genre}</span>}
            </div>

            <div className="field-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label" htmlFor="song-audio">URL de Stream de Audio *</label>
              <input
                id="song-audio"
                className={`field-input mono ${formErrors.audioUrl ? 'has-error' : ''}`}
                value={songForm.audioUrl}
                onChange={(e) => setSongForm({ ...songForm, audioUrl: e.target.value })}
                placeholder="https://musica.res0nance.pp.ua/rest/stream.view?..."
              />
              {formErrors.audioUrl && <span className="field-error"><AlertCircle size={13} /> {formErrors.audioUrl}</span>}
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="song-cover">URL de Portada</label>
              <input
                id="song-cover"
                className="field-input"
                value={songForm.coverImageUrl}
                onChange={(e) => setSongForm({ ...songForm, coverImageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="song-dur">Duración (segundos)</label>
              <input
                id="song-dur"
                type="number"
                min={0}
                max={7200}
                className={`field-input mono ${formErrors.durationInSeconds ? 'has-error' : ''}`}
                value={songForm.durationInSeconds}
                onChange={(e) => setSongForm({ ...songForm, durationInSeconds: e.target.value })}
              />
              {formErrors.durationInSeconds && (
                <span className="field-error"><AlertCircle size={13} /> {formErrors.durationInSeconds}</span>
              )}
            </div>

            <div className="field-group" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label" htmlFor="song-desc">Descripción</label>
              <textarea
                id="song-desc"
                className="field-textarea"
                value={songForm.description}
                onChange={(e) => setSongForm({ ...songForm, description: e.target.value })}
                placeholder="Notas del lanzamiento o fuente de grabación..."
              />
            </div>
          </form>
        </ModalDialog>

        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          loading={deleting}
          title="Eliminar canción del catálogo"
          message={`¿Seguro que deseas eliminar "${deleteTarget?.title}" de ${deleteTarget?.artist}? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar Canción"
        />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* #10 HERO BANNER TRENDING (exacto al reference_ui.png) */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>
            TRENDING NOW
          </span>
          <button type="button" className="btn-ghost btn-sm" onClick={openCreateModal}>
            <Plus size={15} /> Subir Pista
          </button>
        </div>

        {loading && !featuredSong ? (
          <div className="skeleton" style={{ height: 216, borderRadius: 24 }} />
        ) : featuredSong ? (
          <section className="trending-hero">
            {resolveCoverUrl(featuredSong) && (
              <img src={resolveCoverUrl(featuredSong)} alt={featuredSong.title} className="trending-hero-bg" />
            )}
            <div className="trending-hero-overlay" />
            <div className="trending-hero-content">
              <span style={{ fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--accent-bright)', textTransform: 'uppercase' }}>
                {featuredSong.artist} · {featuredSong.genre}
              </span>
              <h2 style={{ fontSize: 'clamp(1.65rem, 3vw, 2.35rem)', fontWeight: 800, lineHeight: 1.08, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
                {featuredSong.title}
              </h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: 460 }}>
                {featuredSong.album || 'Resonance Hi-Fi Stream'} · {featuredSong.playCount} reproducciones en vivo
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  style={{ borderRadius: 999, padding: '0 22px' }}
                  onClick={() => onPlaySong?.(featuredSong, trendingSongs.length ? trendingSongs : allSongs)}
                >
                  {currentSong?.id === featuredSong.id && isPlaying ? <Pause size={15} fill="#fff" /> : <Play size={15} fill="#fff" />}
                  {currentSong?.id === featuredSong.id && isPlaying ? 'Pausar' : 'Reproducir'}
                </button>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ borderRadius: 999, background: 'rgba(9,11,20,0.6)' }}
                  onClick={() => onOpenSongDetail?.(featuredSong.id)}
                >
                  <Info size={15} /> Ficha y Reseñas
                </button>
                {activeRoom && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm"
                    onClick={() => onAddSongToRoom?.(featuredSong)}
                  >
                    <Radio size={15} /> Enviar a {activeRoom.code}
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          <EmptyState
            icon={Disc3}
            title="Tu catálogo está listo para sonar"
            description="Agrega tu primera canción o sincroniza el servidor Navidrome desde Mi Perfil."
            actionLabel="Agregar Canción"
            onAction={openCreateModal}
          />
        )}
      </div>

      {/* SECCIÓN BEST OF — Grid visual de carátulas cuadradas estilo reference_ui.png */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Catálogo sincronizado ({allSongs.length})
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.03em' }}>BEST OF RESONANCE</h3>
          </div>
          <StatusBadge variant="neutral">{homeData?.totalPlays ?? 0} reproducciones totales</StatusBadge>
        </div>

        {loading ? (
          <SkeletonLoader variant="cards" count={4} />
        ) : allSongs.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="Sin canciones en este género"
            description="Selecciona 'Todos' en los chips superiores para ver todo el catálogo sincronizado."
          />
        ) : (
          <div className="media-grid">
            {allSongs.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              return (
                <article key={song.id} className="media-card">
                  <div className="square-art-wrap">
                    <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size="fill" radius={0} />
                    <div className="square-art-scrim" />

                    {/* Favorito arriba a la derecha */}
                    <button
                      type="button"
                      className={`btn-icon ${song.isFavorite ? 'active' : ''}`}
                      style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(9, 11, 20, 0.72)' }}
                      onClick={() => onToggleFavorite?.(song.id)}
                      aria-label="Favorito"
                    >
                      <Heart size={15} fill={song.isFavorite ? '#8b5cf6' : 'none'} />
                    </button>

                    {/* Texto inferior + botón Play flotante */}
                    <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0, cursor: 'pointer' }} onClick={() => onOpenSongDetail?.(song.id)}>
                        <div className="truncate" style={{ fontWeight: 700, fontSize: '0.92rem' }}>{song.title}</div>
                        <div className="truncate" style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {song.artist} · {formatDuration(song.durationInSeconds)}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="play-fab"
                        onClick={() => onPlaySong?.(song, allSongs)}
                        aria-label={`Reproducir ${song.title}`}
                      >
                        {isCurrent && isPlaying ? <Pause size={16} fill="#fff" /> : <Play size={16} fill="#fff" style={{ marginLeft: 2 }} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span className="truncate" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                      {song.genre} · {song.playCount} plays
                    </span>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {activeRoom && (
                        <button type="button" className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => onAddSongToRoom?.(song)} title="Agregar a Sala Jam">
                          <Radio size={14} />
                        </button>
                      )}
                      <button type="button" className="btn-icon" style={{ width: 30, height: 30 }} onClick={() => onOpenSongDetail?.(song.id)} title="Ver ficha y reseñas">
                        <Info size={14} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {renderSongCrudModals()}
    </div>
  );
}
