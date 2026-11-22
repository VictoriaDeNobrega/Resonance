import React, { useEffect, useState } from 'react';
import {
  Play, Heart, Star, Clock, Disc3, ListMusic, Users, Send,
  Radio, Plus, AlertCircle
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  SideDrawer, CoverArtwork, StatusBadge, SkeletonLoader,
  formatDuration, formatRelativeDate
} from './CapaZeroUI';

/**
 * Ficha Técnica Completa de Canción y Reseñas 1-5 Estrellas (HU 2.2)
 * - GET /api/songs/{id}?userId=...
 * - POST /api/songs/{id}/favorite
 * - POST /api/songs/{id}/reviews
 */
export default function SongDetailDrawer({
  songId,
  onClose,
  user,
  activeRoom,
  userPlaylists = [],
  onPlaySong,
  onToggleFavorite,
  onAddSongToRoom,
  onAddSongToPlaylist,
  onSongMutated,
  onNotify
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');

  const loadDetail = async () => {
    if (!songId) return;
    setLoading(true);
    try {
      const data = await apiClient.getSongById(songId, user?.id);
      setDetail(data);
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (songId) {
      loadDetail();
      setReviewText('');
      setReviewError('');
      setRating(5);
    } else {
      setDetail(null);
    }
  }, [songId, user?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    const content = reviewText.trim();
    if (content.length < 2) {
      setReviewError('Escribe al menos 2 caracteres para publicar tu reseña.');
      return;
    }
    setReviewError('');
    setSubmittingReview(true);
    try {
      await apiClient.addReview(songId, {
        userId: user.id,
        userName: user.name,
        rating,
        content
      });
      setReviewText('');
      onNotify?.('Reseña publicada correctamente.', 'success');
      await loadDetail();
      onSongMutated?.();
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleFavorite = async () => {
    if (!detail) return;
    await onToggleFavorite?.(detail.id);
    await loadDetail();
  };

  const handleAddToPlaylist = async () => {
    if (!selectedPlaylistId || !detail) return;
    await onAddSongToPlaylist?.(selectedPlaylistId, detail.id);
    setSelectedPlaylistId('');
    await loadDetail();
  };

  return (
    <SideDrawer
      isOpen={Boolean(songId)}
      onClose={onClose}
      title="Ficha Técnica de Pista"
      subtitle="Detalles, métricas y reseñas de oyentes (HU 2.2)"
    >
      {loading && !detail ? (
        <SkeletonLoader variant="list" count={5} />
      ) : detail ? (
        <>
          {/* Encabezado de portada + metadatos */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <CoverArtwork src={resolveCoverUrl(detail)} alt={detail.title} size={92} radius={14} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <StatusBadge variant="accent">{detail.genre}</StatusBadge>
              <h3 style={{ fontSize: '1.22rem', fontWeight: 800, marginTop: 6, lineHeight: 1.2 }}>
                {detail.title}
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {detail.artist}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Disc3 size={13} /> {detail.album || 'Single'}
                </span>
                <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} /> {formatDuration(detail.durationInSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* Botones de acción rápida */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => onPlaySong?.(detail)}
            >
              <Play size={15} fill="#fff" /> Reproducir
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleFavorite}
            >
              <Heart
                size={15}
                fill={detail.isFavorite ? '#8b5cf6' : 'none'}
                color={detail.isFavorite ? '#a78bfa' : 'currentColor'}
              />
              {detail.isFavorite ? 'Favorita' : 'Favorito'} ({detail.favoriteCount})
            </button>
            {activeRoom && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => onAddSongToRoom?.(detail)}
              >
                <Radio size={15} /> Cola Jam
              </button>
            )}
          </div>

          {/* Métricas relacionales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {[
              { label: 'Plays', value: detail.playCount },
              { label: 'Rating', value: detail.averageRating ? detail.averageRating.toFixed(1) : '—' },
              { label: 'Playlists', value: detail.playlistsContainingCount, icon: ListMusic },
              { label: 'Comun.', value: detail.communitiesContainingCount, icon: Users }
            ].map((m) => (
              <div
                key={m.label}
                style={{
                  padding: '10px 6px',
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center'
                }}
              >
                <div className="mono" style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{m.label}</div>
              </div>
            ))}
          </div>

          {detail.description && (
            <div className="panel-card" style={{ padding: 14, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {detail.description}
              {detail.uploadedByName && (
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Publicado por <strong>{detail.uploadedByName}</strong>
                </div>
              )}
            </div>
          )}

          {/* Agregar a una playlist propia */}
          {userPlaylists.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                className="field-select"
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                aria-label="Seleccionar playlist"
              >
                <option value="">Agregar a una de mis playlists...</option>
                {userPlaylists.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary btn-sm"
                disabled={!selectedPlaylistId}
                onClick={handleAddToPlaylist}
              >
                <Plus size={15} />
              </button>
            </div>
          )}

          {/* Formulario de nueva reseña (1 a 5 estrellas) */}
          <form onSubmit={handleSubmitReview} className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Calificar y reseñar</span>
              <div style={{ display: 'flex', gap: 4 }} role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= (hoverRating || rating);
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      aria-label={`${star} estrellas`}
                      style={{ padding: 2 }}
                    >
                      <Star
                        size={19}
                        strokeWidth={1.75}
                        color={active ? '#f59e0b' : '#4b5563'}
                        fill={active ? '#f59e0b' : 'none'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <textarea
              className={`field-textarea ${reviewError ? 'has-error' : ''}`}
              rows={3}
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Comparte tu opinión sobre producción, ritmo o experiencia en sala..."
            />
            {reviewError && (
              <span className="field-error">
                <AlertCircle size={13} /> {reviewError}
              </span>
            )}
            <button type="submit" className="btn-primary btn-sm" disabled={submittingReview}>
              <Send size={14} /> {submittingReview ? 'Publicando...' : 'Publicar Reseña'}
            </button>
          </form>

          {/* Listado de reseñas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
              Reseñas ({detail.reviews?.length || 0})
            </div>
            {detail.reviews && detail.reviews.length > 0 ? (
              detail.reviews.map((rev) => (
                <div
                  key={rev.id}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.86rem' }}>{rev.userName}</span>
                    <span style={{ display: 'inline-flex', gap: 2 }}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          color={s <= rev.rating ? '#f59e0b' : '#374151'}
                          fill={s <= rev.rating ? '#f59e0b' : 'none'}
                        />
                      ))}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {rev.content}
                  </p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {formatRelativeDate(rev.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                Sé el primero en calificar esta canción.
              </p>
            )}
          </div>
        </>
      ) : null}
    </SideDrawer>
  );
}
