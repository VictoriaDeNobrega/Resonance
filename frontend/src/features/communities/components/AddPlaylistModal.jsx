import React, { useState } from 'react';
import { X, Plus, AlertCircle, CheckCircle2, Loader2, Music, Sparkles } from 'lucide-react';
import { communityApi } from '../services/communityApi';

// Catálogo de playlists de ejemplo de la plataforma (visibilidad pública / creadas por usuarios)
// para vincular fácilmente sin implementar la lógica interna de playlists de Jesús Medina
const AVAILABLE_PLATFORM_PLAYLISTS = [
  {
    playlistId: 'pl-synth-classics',
    playlistTitle: 'Synthwave & Cyberpunk Anthems',
    description: 'Los mejores temas de Kavinsky, Perturbator, Carpenter Brut y The Midnight.',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
    songCount: 32
  },
  {
    playlistId: 'pl-indie-chill',
    playlistTitle: 'Indie Afternoon Chill',
    description: 'Sonidos acústicos y melodías suaves para concentrarse y relajarse.',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
    songCount: 20
  },
  {
    playlistId: 'pl-rock-legends',
    playlistTitle: 'Classic & Modern Rock Legends',
    description: 'Guitarras potentes desde Led Zeppelin hasta Arctic Monkeys y Muse.',
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=600&q=80',
    songCount: 45
  },
  {
    playlistId: 'pl-electronic-club',
    playlistTitle: 'French House & Club Resonance',
    description: 'Grooves envolventes con influencias disco y house francés.',
    coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    songCount: 28
  }
];

export default function AddPlaylistModal({
  isOpen,
  onClose,
  community,
  currentUserId,
  onPlaylistAdded
}) {
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customId, setCustomId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [customSongCount, setCustomSongCount] = useState(10);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Comprobar si una playlist ya está vinculada en la comunidad
  const isAlreadyLinked = (plId) => {
    if (!community || !community.playlists) return false;
    return community.playlists.some(
      (p) => String(p.playlistId).toLowerCase() === String(plId).toLowerCase()
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    let playlistToLink = null;

    if (isCustomMode) {
      if (!customId.trim()) {
        setErrorMessage('El identificador de la playlist no puede estar vacío.');
        return;
      }
      if (!customTitle.trim()) {
        setErrorMessage('El título de la playlist no puede estar vacío.');
        return;
      }

      playlistToLink = {
        playlistId: customId.trim(),
        playlistTitle: customTitle.trim(),
        description: customDescription.trim(),
        coverUrl: customCoverUrl.trim() || null,
        songCount: parseInt(customSongCount, 10) || 0
      };
    } else {
      if (!selectedPlaylist) {
        setErrorMessage('Por favor, selecciona una playlist de la lista para vincular.');
        return;
      }
      playlistToLink = selectedPlaylist;
    }

    // Criterio de Aceptación Escenario 4: Intento de agregar una playlist ya vinculada
    if (isAlreadyLinked(playlistToLink.playlistId)) {
      setErrorMessage('Esta playlist ya está agregada a la comunidad.');
      return;
    }

    try {
      setIsLoading(true); // Feedback visual inmediato (bloquea clics múltiples)
      const linked = await communityApi.addPlaylist(
        community.id,
        playlistToLink,
        currentUserId
      );

      setSuccessMessage('¡Playlist vinculada exitosamente a la comunidad!');
      setTimeout(() => {
        onPlaylistAdded(linked);
        onClose();
      }, 700);
    } catch (err) {
      // Manejo de error de negocio (ej. duplicados o no autorizado)
      setErrorMessage(err.message || 'Error al vincular la playlist a la comunidad.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-playlist-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Header del Modal */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <Plus size={20} />
            </div>
            <div>
              <h2 id="add-playlist-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Agregar Playlist a la Comunidad
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Espacio: <span style={{ color: 'var(--accent)' }}>{community?.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido del Modal con Scroll */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px' }}>
          {/* Mensaje de Error Accesible WCAG 2.1 AA (Alto contraste) */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fee2e2',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                fontWeight: 500
              }}
            >
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mensaje de Éxito */}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                color: '#d1fae5',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                fontWeight: 500
              }}
            >
              <CheckCircle2 size={18} color="#10b981" style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Pestañas de Selección (Catálogo público vs Entrada manual) */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '18px',
              backgroundColor: 'var(--bg-secondary)',
              padding: '4px',
              borderRadius: '8px'
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(false);
                setErrorMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: !isCustomMode ? 600 : 400,
                backgroundColor: !isCustomMode ? 'var(--bg-card)' : 'transparent',
                color: !isCustomMode ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: !isCustomMode ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              Playlists Disponibles
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
                setErrorMessage('');
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: isCustomMode ? 600 : 400,
                backgroundColor: isCustomMode ? 'var(--bg-card)' : 'transparent',
                color: isCustomMode ? 'var(--text-main)' : 'var(--text-muted)',
                boxShadow: isCustomMode ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
              }}
            >
              Ingresar ID / Manual
            </button>
          </div>

          {!isCustomMode ? (
            <div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Selecciona una playlist pública para vincularla al catálogo de la comunidad:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {AVAILABLE_PLATFORM_PLAYLISTS.map((pl) => {
                  const alreadyLinked = isAlreadyLinked(pl.playlistId);
                  const isSelected = selectedPlaylist?.playlistId === pl.playlistId;

                  return (
                    <div
                      key={pl.playlistId}
                      onClick={() => {
                        setSelectedPlaylist(pl);
                        setErrorMessage('');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: isSelected
                          ? '2px solid var(--accent)'
                          : '1px solid var(--border)',
                        backgroundColor: isSelected
                          ? 'rgba(139, 92, 246, 0.1)'
                          : 'var(--bg-secondary)',
                        cursor: 'pointer',
                        opacity: alreadyLinked ? 0.6 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <img
                        src={pl.coverUrl}
                        alt=""
                        style={{ width: '48px', height: '48px', borderRadius: '6px', objectFit: 'cover' }}
                      />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--text-main)' }}>
                            {pl.playlistTitle}
                          </span>
                          {alreadyLinked && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                padding: '2px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              Ya vinculada
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            fontSize: '0.775rem',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {pl.description}
                        </p>
                      </div>

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {pl.songCount} pistas
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  htmlFor="custom-playlist-id"
                  style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
                >
                  Identificador / Código de Playlist <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="custom-playlist-id"
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="ej. pl-favoritos-rock-2026"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="custom-playlist-title"
                  style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
                >
                  Título de la Playlist <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="custom-playlist-title"
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="ej. Sesiones Acústicas en Vivo"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="custom-playlist-desc"
                  style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
                >
                  Descripción de la Playlist (opcional)
                </label>
                <textarea
                  id="custom-playlist-desc"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  rows={2}
                  placeholder="Breve reseña musical de la lista..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '12px' }}>
                <div>
                  <label
                    htmlFor="custom-playlist-cover"
                    style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
                  >
                    URL Portada (opcional)
                  </label>
                  <input
                    id="custom-playlist-cover"
                    type="url"
                    value={customCoverUrl}
                    onChange={(e) => setCustomCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div>
                  <label
                    htmlFor="custom-playlist-count"
                    style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
                  >
                    Canciones
                  </label>
                  <input
                    id="custom-playlist-count"
                    type="number"
                    min="1"
                    value={customSongCount}
                    onChange={(e) => setCustomSongCount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer del Modal con Acciones y Spinner */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Vinculando playlist...</span>
                </>
              ) : (
                <>
                  <Plus size={16} />
                  <span>Confirmar Vinculación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

