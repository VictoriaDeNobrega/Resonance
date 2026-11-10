import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  ListMusic,
  Edit3,
  Plus,
  Music2,
  Mic2,
  Calendar,
  ShieldCheck,
  MessageSquare,
  Send,
  AlertCircle,
  Share2,
  Check
} from 'lucide-react';
import { communityApi } from '../services/communityApi';
import PlaylistCard from '../components/PlaylistCard';
import AddPlaylistModal from '../components/AddPlaylistModal';
import EditCommunityModal from '../components/EditCommunityModal';

export default function CommunityDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('playlists'); // 'playlists', 'wall', 'about'

  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPlaylistModalOpen, setIsAddPlaylistModalOpen] = useState(false);

  // Muro de comentarios local
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  // Usuario actual (desde localStorage para compatibilidad con el resto de la app)
  const [currentUserId] = useState(() => localStorage.getItem('resonance_user') || 'Victoria_Dev');

  // Estado de copiado para compartir enlace
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    loadCommunity();
  }, [id]);

  const loadCommunity = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await communityApi.getById(id);
      setCommunity(data);

      // Cargar comentarios iniciales del muro para esta comunidad
      const savedCommentsKey = `resonance_community_comments_${id}`;
      const savedComments = localStorage.getItem(savedCommentsKey);
      if (savedComments) {
        setComments(JSON.parse(savedComments));
      } else {
        const defaultComments = [
          {
            id: 'c-init-1',
            author: data.creatorName || data.creatorId,
            text: `¡Bienvenidos a la comunidad oficial de ${data.name}! Compartan aquí sus playlists y opiniones musicales.`,
            createdAt: data.createdAt
          }
        ];
        setComments(defaultComments);
        localStorage.setItem(savedCommentsKey, JSON.stringify(defaultComments));
      }
    } catch (err) {
      setError(err.message || 'No se pudo cargar la información de la comunidad.');
    } finally {
      setIsLoading(false);
    }
  };

  // Manejo de actualización de datos de la comunidad
  const handleCommunityUpdated = (updated) => {
    setCommunity(updated);
  };

  // Manejo de nueva playlist vinculada
  const handlePlaylistAdded = (newPlaylist) => {
    setCommunity((prev) => ({
      ...prev,
      playlists: [...(prev.playlists || []), newPlaylist],
      updatedAt: new Date().toISOString()
    }));
  };

  // Manejo de eliminación de playlist
  const handleRemovePlaylist = async (playlistId) => {
    if (!window.confirm('¿Seguro que deseas quitar esta playlist de la comunidad?')) return;
    try {
      await communityApi.removePlaylist(community.id, playlistId, currentUserId);
      setCommunity((prev) => ({
        ...prev,
        playlists: prev.playlists.filter((p) => p.playlistId !== playlistId)
      }));
    } catch (err) {
      alert(err.message || 'Error al desvincular la playlist.');
    }
  };

  // Enviar mensaje al muro de la comunidad
  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentItem = {
      id: 'comment-' + Date.now(),
      author: currentUserId,
      text: newComment.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedComments = [commentItem, ...comments];
    setComments(updatedComments);
    setNewComment('');

    const savedCommentsKey = `resonance_community_comments_${id}`;
    localStorage.setItem(savedCommentsKey, JSON.stringify(updatedComments));
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '80px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>Cargando comunidad musical...</p>
      </div>
    );
  }

  if (error || !community) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <div
          role="alert"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#fee2e2',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '20px'
          }}
        >
          <AlertCircle size={28} color="#ef4444" style={{ marginBottom: '8px' }} />
          <h3>Error al cargar comunidad</h3>
          <p>{error || 'No se encontró la comunidad.'}</p>
        </div>
        <Link to="/communities" className="btn-secondary">
          <ArrowLeft size={16} />
          <span>Volver al Directorio de Comunidades</span>
        </Link>
      </div>
    );
  }

  const isCreator =
    community.creatorId &&
    currentUserId &&
    community.creatorId.toLowerCase() === currentUserId.toLowerCase();

  const isArtist = community.categoryType?.toLowerCase() === 'artist';

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      {/* Barra superior de navegación */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Link
          to="/communities"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.9rem',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-main)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          <ArrowLeft size={16} />
          <span>Explorar otras comunidades</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleShare}
            className="btn-secondary"
            title="Copiar enlace de la comunidad"
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            {copiedLink ? <Check size={15} color="var(--success)" /> : <Share2 size={15} />}
            <span>{copiedLink ? '¡Enlace copiado!' : 'Compartir'}</span>
          </button>

          {isCreator && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-secondary"
              style={{
                borderColor: 'var(--accent)',
                color: 'var(--text-main)',
                padding: '8px 14px',
                fontSize: '0.85rem'
              }}
            >
              <Edit3 size={15} color="var(--accent)" />
              <span>Editar Comunidad</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner y Portada Principal */}
      <div
        style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          marginBottom: '32px'
        }}
      >
        <div style={{ height: '240px', width: '100%', position: 'relative', overflow: 'hidden' }}>
          {community.bannerUrl ? (
            <img
              src={community.bannerUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: isArtist
                  ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)'
                  : 'linear-gradient(135deg, #2e1065 0%, #581c87 50%, #7e22ce 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.9
              }}
            >
              {isArtist ? <Mic2 size={64} color="#e0e7ff" /> : <Music2 size={64} color="#fae8ff" />}
            </div>
          )}

          {/* Degradado inferior para legibilidad */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(10, 11, 16, 0.95) 0%, rgba(10, 11, 16, 0.4) 60%, transparent 100%)'
            }}
          />

          {/* Badges superiores */}
          <div style={{ position: 'absolute', top: '16px', left: '20px', display: 'flex', gap: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(10, 11, 16, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: isArtist ? '#a5b4fc' : '#c084fc',
                backdropFilter: 'blur(6px)'
              }}
            >
              {isArtist ? <Mic2 size={13} /> : <Music2 size={13} />}
              <span>{isArtist ? 'Comunidad de Artista' : 'Comunidad de Género'}</span>
            </span>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'rgba(139, 92, 246, 0.25)',
                border: '1px solid var(--accent)',
                borderRadius: '20px',
                padding: '4px 12px',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                backdropFilter: 'blur(6px)'
              }}
            >
              {community.categoryValue}
            </span>
          </div>
        </div>

        {/* Metadatos y Detalles principales */}
        <div style={{ padding: '0 28px 28px', marginTop: '-40px', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '20px'
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  color: 'var(--text-main)',
                  lineHeight: 1.2,
                  marginBottom: '8px'
                }}
              >
                {community.name}
              </h1>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '16px',
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="var(--accent)" />
                  Creador: <strong style={{ color: 'var(--text-main)' }}>{community.creatorName || community.creatorId}</strong>
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={16} color="var(--accent)" />
                  {community.memberCount || 1} miembros
                </span>

                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <ListMusic size={16} color="var(--accent)" />
                  {community.playlists ? community.playlists.length : 0} playlists vinculadas
                </span>
              </div>
            </div>

            {/* Acción de vincular playlist rápida para el creador */}
            {isCreator && (
              <button
                onClick={() => setIsAddPlaylistModalOpen(true)}
                className="btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <Plus size={18} />
                <span>Agregar Playlist</span>
              </button>
            )}
          </div>

          {community.description && (
            <p
              style={{
                marginTop: '18px',
                color: 'var(--text-muted)',
                fontSize: '1rem',
                lineHeight: 1.6,
                maxWidth: '850px'
              }}
            >
              {community.description}
            </p>
          )}
        </div>
      </div>

      {/* Pestañas de Navegación de la Comunidad */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border)',
          marginBottom: '28px'
        }}
      >
        <button
          onClick={() => setActiveTab('playlists')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'playlists' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'playlists' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'playlists' ? 700 : 500,
            padding: '12px 18px',
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ListMusic size={18} color={activeTab === 'playlists' ? 'var(--accent)' : 'currentColor'} />
          <span>Playlists ({community.playlists ? community.playlists.length : 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('wall')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'wall' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'wall' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'wall' ? 700 : 500,
            padding: '12px 18px',
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <MessageSquare size={18} color={activeTab === 'wall' ? 'var(--accent)' : 'currentColor'} />
          <span>Muro de Conversación ({comments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('about')}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'about' ? '2px solid var(--accent)' : '2px solid transparent',
            color: activeTab === 'about' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: activeTab === 'about' ? 700 : 500,
            padding: '12px 18px',
            fontSize: '0.95rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldCheck size={18} color={activeTab === 'about' ? 'var(--accent)' : 'currentColor'} />
          <span>Detalles y Moderación</span>
        </button>
      </div>

      {/* Contenido de Pestaña 1: Playlists Comunitarias */}
      {activeTab === 'playlists' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Catálogo de Playlists Compartidas
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Playlists vinculadas para escuchar en común o descubrir música del {isArtist ? 'artista' : 'género'}.
              </p>
            </div>

            {isCreator && (
              <button
                onClick={() => setIsAddPlaylistModalOpen(true)}
                className="btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                <Plus size={16} />
                <span>Agregar Playlist</span>
              </button>
            )}
          </div>

          {community.playlists && community.playlists.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '20px'
              }}
            >
              {community.playlists.map((pl) => (
                <PlaylistCard
                  key={pl.id || pl.playlistId}
                  playlist={pl}
                  isCreator={isCreator}
                  onRemove={handleRemovePlaylist}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px dashed var(--border)',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center'
              }}
            >
              <ListMusic size={44} color="var(--accent)" style={{ margin: '0 auto 14px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
                Aún no hay playlists vinculadas
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 20px' }}>
                {isCreator
                  ? 'Como creador de la comunidad, puedes agregar la primera playlist pública o de tu autoría para los miembros.'
                  : 'El creador de la comunidad aún no ha vinculado playlists a este espacio.'}
              </p>

              {isCreator && (
                <button
                  onClick={() => setIsAddPlaylistModalOpen(true)}
                  className="btn-primary"
                >
                  <Plus size={16} />
                  <span>Vincular Primera Playlist</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contenido de Pestaña 2: Muro de Comentarios */}
      {activeTab === 'wall' && (
        <div style={{ maxWidth: '780px' }}>
          <form onSubmit={handleAddComment} style={{ marginBottom: '28px' }}>
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px'
              }}
            >
              <label
                htmlFor="community-comment-input"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}
              >
                Publicar en el muro de {community.name}
              </label>
              <textarea
                id="community-comment-input"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Escribe tu recomendación musical, reseña o saludo a la comunidad..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  resize: 'none',
                  marginBottom: '10px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  <Send size={15} />
                  <span>Publicar Mensaje</span>
                </button>
              </div>
            </div>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {comments.map((c) => (
              <div
                key={c.id}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px 20px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: 'white'
                      }}
                    >
                      {c.author.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                        {c.author}
                      </span>
                      {c.author.toLowerCase() === community.creatorId.toLowerCase() && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(139, 92, 246, 0.2)',
                            color: 'var(--accent)',
                            border: '1px solid var(--accent)',
                            padding: '1px 6px',
                            borderRadius: '4px'
                          }}
                        >
                          Creador
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  {c.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contenido de Pestaña 3: Acerca de y Detalles */}
      {activeTab === 'about' && (
        <div style={{ maxWidth: '780px' }}>
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Información de la Comunidad
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Nombre</span>
                <strong style={{ color: 'var(--text-main)' }}>{community.name}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Tipo</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {isArtist ? 'Artista' : 'Género Musical'}: {community.categoryValue}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Creador</span>
                <strong style={{ color: 'var(--text-main)' }}>{community.creatorName || community.creatorId}</strong>
              </div>

              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Fecha de Creación</span>
                <strong style={{ color: 'var(--text-main)' }}>
                  {new Date(community.createdAt).toLocaleDateString()}
                </strong>
              </div>
            </div>

            {community.description && (
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Descripción y Reglas
                </span>
                <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  {community.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modales */}
      <EditCommunityModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        community={community}
        currentUserId={currentUserId}
        onCommunityUpdated={handleCommunityUpdated}
      />

      <AddPlaylistModal
        isOpen={isAddPlaylistModalOpen}
        onClose={() => setIsAddPlaylistModalOpen(false)}
        community={community}
        currentUserId={currentUserId}
        onPlaylistAdded={handlePlaylistAdded}
      />
    </div>
  );
}

