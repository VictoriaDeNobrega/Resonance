import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Home, Radio, Users, BarChart3, Disc3, Heart, ListMusic,
  User as UserIcon, RefreshCw, LogOut, Search, Bell, Play, Pause,
  Info, ChevronRight, X, Sparkles
} from 'lucide-react';
import { apiClient, clearSession, getStoredSession, updateStoredUser } from '../api/apiClient';
import { signalrClient } from '../api/signalrClient';
import { resolveCoverUrl } from '../api/navidromeClient';
import {
  FilterChips, SegmentedControl, ToastContainer, StatusBadge, CoverArtwork, formatDuration
} from '../components/CapaZeroUI';
import GlobalPlayerBar from '../components/GlobalPlayerBar';
import ProfileDrawer from '../components/ProfileDrawer';
import SongDetailDrawer from '../components/SongDetailDrawer';
import SongsSection from '../components/SongsSection';
import PlaylistsSection from '../components/PlaylistsSection';
import CommunitiesSection from '../components/CommunitiesSection';
import RoomsSection, { LiveRoomPanel } from '../components/RoomsSection';

const VIEW_LABELS = {
  discover: 'Home',
  rooms: 'Salas Jam',
  communities: 'Comunidades',
  stats: 'Estadísticas',
  catalog: 'Catálogo',
  favorites: 'Favoritos',
  playlists: 'Playlists'
};

/**
 * Resalta coincidencias de prefijo en el buscador global (#44 Autocomplete Search — HU 1.3)
 */
function HighlightMatch({ text = '', query = '' }) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: '#c4b5fd' }}>{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </>
  );
}

/**
 * Página 3 de 3: HomePage (Rutas /home y /rooms/:code)
 * Workspace único tipo Spotify ("Listeners") de 4 paneles persistentes (100vw x 100vh):
 * 1. Sidebar Izquierdo (256px)
 * 2. Escenario Central (Sticky Header + #44 Buscador Global + #30 Filter Chips + Sección activa)
 * 3. Panel Contextual Derecho (320px — Top Pistas | Sala Jam Activa + Avatar -> ProfileDrawer)
 * 4. Barra Reproductor Inferior Persistente (88px — GlobalPlayerBar)
 */
export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { code: routeRoomCode } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [user, setUser] = useState(() => getStoredSession().user);
  const [activeView, setActiveView] = useState(() => getStoredSession().user?.activeView || 'discover');
  const [selectedGenre, setSelectedGenre] = useState('ALL');

  // Datos de catálogo y playlists
  const [homeData, setHomeData] = useState(null);
  const [loadingHome, setLoadingHome] = useState(true);
  const [userPlaylists, setUserPlaylists] = useState([]);

  // Estado reproductor global persistente (HU 1.4 & HU 2.1)
  const [currentSong, setCurrentSong] = useState(null);
  const [playQueue, setPlayQueue] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [initialSeekMs, setInitialSeekMs] = useState(0);

  // Paneles laterales y foco
  const [profileOpen, setProfileOpen] = useState(false);
  const [detailSongId, setDetailSongId] = useState(null);
  const [rightRailTab, setRightRailTab] = useState('top'); // 'top' | 'room'
  const [focusedPlaylistId, setFocusedPlaylistId] = useState(null);
  const [focusedCommunityId, setFocusedCommunityId] = useState(null);

  // Estado Sala Jam Activa + SignalR (HU 1.6, 1.7, 2.4, 2.5, 2.6)
  const [activeRoom, setActiveRoom] = useState(null);
  const [roomSyncEvent, setRoomSyncEvent] = useState(null);
  const [roomConnStatus, setRoomConnStatus] = useState('disconnected');

  // #44 Autocomplete Global Search (HU 1.3)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const searchShellRef = useRef(null);

  // #22 Toasts
  const [toasts, setToasts] = useState([]);
  const [syncingNavidrome, setSyncingNavidrome] = useState(false);

  const notify = useCallback((message, type = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  // Proteger ruta si no hay sesión activa
  useEffect(() => {
    if (!user?.id) {
      navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}` } });
    }
  }, [user?.id, navigate, location.pathname, location.search]);

  // Cargar catálogo inicial y restaurar última canción de sesión (HU 2.1)
  const refreshCatalog = useCallback(async () => {
    if (!user?.id) return;
    setLoadingHome(true);
    try {
      const [home, myPls] = await Promise.all([
        apiClient.getHomeSongs(user.id),
        apiClient.getUserPlaylists(user.id).catch(() => [])
      ]);
      setHomeData(home);
      setUserPlaylists(myPls || []);

      setCurrentSong((prev) => {
        if (prev) {
          const fresh = (home.allSongs || []).find((s) => s.id === prev.id);
          return fresh || prev;
        }
        if (user.lastPlayedSongId) {
          const restored = (home.allSongs || []).find((s) => s.id === user.lastPlayedSongId);
          if (restored) {
            setInitialSeekMs(user.lastPlaybackPositionMs || 0);
            return restored;
          }
        }
        return home.featuredSong || home.allSongs?.[0] || null;
      });
      setPlayQueue((prev) => (prev.length ? prev : home.allSongs || []));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoadingHome(false);
    }
  }, [user?.id, user?.lastPlayedSongId, user?.lastPlaybackPositionMs, notify]);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  // Cambiar vista y persistir activeView en backend (HU 2.1)
  const handleSelectView = (view) => {
    setActiveView(view);
    if (user?.id) {
      apiClient.updateSessionState(user.id, { activeView: view }).catch(() => {});
    }
  };

  // ==================== BUSCADOR GLOBAL #44 (HU 1.3) ====================
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await apiClient.globalSearch({
          query: q,
          filter: searchFilter,
          userId: user?.id
        });
        if (!cancelled) {
          setSearchResults(res);
          setSearchOpen(true);
        }
      } catch {
        // noop
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, searchFilter, user?.id]);

  // Cerrar dropdown de búsqueda al hacer clic fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (searchShellRef.current && !searchShellRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // ==================== MOTOR SIGNALR SALA JAM (HU 1.7) ====================
  const applyRoomTrackToPlayer = useCallback((roomPayload, triggerSync = true) => {
    if (!roomPayload) return;
    const songUrl = roomPayload.currentSongUrl || roomPayload.songUrl;
    const songTitle = roomPayload.currentSongTitle || roomPayload.songTitle;
    if (!songUrl && !songTitle) return;

    const catalogMatch = (homeData?.allSongs || []).find(
      (s) => s.id === (roomPayload.currentSongId || roomPayload.songId)
    );

    setCurrentSong({
      ...(catalogMatch || {}),
      id: roomPayload.currentSongId || roomPayload.songId || catalogMatch?.id || null,
      title: songTitle || catalogMatch?.title || 'Pista en Sala',
      artist: roomPayload.currentSongArtist || roomPayload.songArtist || catalogMatch?.artist || 'Resonance',
      coverImageUrl: roomPayload.currentSongCoverUrl || roomPayload.songCoverUrl || catalogMatch?.coverImageUrl || '',
      audioUrl: songUrl || catalogMatch?.audioUrl || ''
    });

    if (triggerSync) {
      setRoomSyncEvent({
        songId: roomPayload.currentSongId || roomPayload.songId,
        currentTimeMs: roomPayload.currentTimeMs || 0,
        isPlaying: Boolean(roomPayload.isPlaying),
        serverTimestampUtcMs: roomPayload.serverTimestampUtcMs || Date.now(),
        _nonce: Date.now()
      });
    }
  }, [homeData?.allSongs]);

  useEffect(() => {
    const unsubStatus = signalrClient.onRoomStatusChange(setRoomConnStatus);

    const unsubs = [
      signalrClient.onRoomEvent('RoomJoined', (room) => {
        setActiveRoom(room);
        setRightRailTab('room');
        applyRoomTrackToPlayer(room, true);
      }),
      signalrClient.onRoomEvent('ListenerCountUpdated', ({ roomCode, listenerCount, maxCapacity }) => {
        setActiveRoom((prev) =>
          prev && prev.code === roomCode ? { ...prev, listenerCount, maxCapacity } : prev
        );
      }),
      signalrClient.onRoomEvent('UserJoined', ({ userName }) => {
        notify(`${userName} se unió a la sala Jam.`, 'info');
      }),
      signalrClient.onRoomEvent('UserLeft', ({ userName }) => {
        notify(`${userName} salió de la sala.`, 'info');
      }),
      signalrClient.onRoomEvent('PlaybackStateUpdated', (syncDto) => {
        applyRoomTrackToPlayer(syncDto, true);
        setActiveRoom((prev) =>
          prev
            ? {
                ...prev,
                currentSongId: syncDto.songId ?? prev.currentSongId,
                currentSongTitle: syncDto.songTitle ?? prev.currentSongTitle,
                currentSongArtist: syncDto.songArtist ?? prev.currentSongArtist,
                currentSongCoverUrl: syncDto.songCoverUrl ?? prev.currentSongCoverUrl,
                currentSongUrl: syncDto.songUrl ?? prev.currentSongUrl,
                currentTimeMs: syncDto.currentTimeMs,
                isPlaying: syncDto.isPlaying
              }
            : prev
        );
      }),
      signalrClient.onRoomEvent('QueueUpdated', (queue) => {
        setActiveRoom((prev) => (prev ? { ...prev, queue: queue || [], queueCount: (queue || []).length } : prev));
      }),
      signalrClient.onRoomEvent('SkipVoteUpdated', ({ currentVotes, votesRequired }) => {
        setActiveRoom((prev) =>
          prev ? { ...prev, skipVoteCount: currentVotes, skipVotesRequired: votesRequired } : prev
        );
      }),
      signalrClient.onRoomEvent('TrackSkipped', (updatedRoom) => {
        setActiveRoom(updatedRoom);
        applyRoomTrackToPlayer(updatedRoom, true);
        notify('¡Votación completada! Saltando a la siguiente pista de la cola.', 'success');
      }),
      signalrClient.onRoomEvent('ReceiveChatMessage', (msg) => {
        setActiveRoom((prev) => {
          if (!prev) return prev;
          if (prev.messages?.some((m) => m.id === msg.id)) return prev;
          return { ...prev, messages: [...(prev.messages || []), msg] };
        });
      }),
      signalrClient.onRoomEvent('RoomClosed', ({ message }) => {
        setActiveRoom(null);
        setRoomSyncEvent(null);
        setRightRailTab('top');
        notify(message || 'La sala ha sido cerrada por su anfitrión.', 'warning');
      }),
      signalrClient.onRoomEvent('RoomError', ({ message }) => {
        notify(message || 'Error en la sala sincronizada.', 'error');
      })
    ];

    return () => {
      unsubStatus();
      unsubs.forEach((u) => u());
    };
  }, [applyRoomTrackToPlayer, notify]);

  // Refresco periódico de tiempo <= 200 ms mientras se está en sala
  useEffect(() => {
    if (!activeRoom?.code) return;
    const interval = setInterval(() => {
      signalrClient.requestTimeSync(activeRoom.code).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeRoom?.code]);

  const handleJoinRoom = useCallback(async (code, accessKey = null, preloadedRoom = null) => {
    if (!user?.id || !code) return;
    const normalized = code.trim().toUpperCase();
    try {
      const roomDetail = preloadedRoom
        || await apiClient.joinRoom(normalized, {
          userId: user.id,
          userName: user.name,
          accessKey: accessKey || null
        });
      setActiveRoom(roomDetail);
      setRightRailTab('room');
      applyRoomTrackToPlayer(roomDetail, true);
      signalrClient.joinRoom(normalized, user.id, user.name, accessKey).catch(() => {});
      notify(`Conectado a la sala ${roomDetail.title} (${roomDetail.code}).`, 'success');
      return roomDetail;
    } catch (err) {
      notify(err.message, 'error');
      throw err;
    }
  }, [user?.id, user?.name, applyRoomTrackToPlayer, notify]);

  // Auto-unirse si el usuario entra por enlace de invitación /rooms/:code o /home?room=CODE
  useEffect(() => {
    const invitedCode = routeRoomCode || searchParams.get('room');
    if (invitedCode && user?.id && activeRoom?.code !== invitedCode.toUpperCase()) {
      setActiveView('rooms');
      handleJoinRoom(invitedCode).catch(() => {
        // Si es privada y requiere PIN, RoomsSection permite introducirla
      });
      if (searchParams.get('room')) {
        searchParams.delete('room');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [routeRoomCode, searchParams, user?.id]);

  const handleLeaveRoom = async () => {
    if (!activeRoom) return;
    const code = activeRoom.code;
    try {
      await signalrClient.leaveRoom(code);
      await apiClient.leaveRoom(code, user.id);
    } catch {
      // noop
    }
    setActiveRoom(null);
    setRoomSyncEvent(null);
    setRightRailTab('top');
    notify(`Saliste de la sala ${code}.`, 'info');
  };

  // ==================== ACCIONES DE REPRODUCCIÓN Y FAVORITOS ====================
  const handlePlaySong = (song, queueList = null) => {
    if (!song) return;
    if (queueList && queueList.length) {
      setPlayQueue(queueList);
    }
    if (currentSong?.id && currentSong.id === song.id) {
      setIsPlaying((prev) => !prev);
      return;
    }
    setInitialSeekMs(0);
    setCurrentSong(song);
    setIsPlaying(true);

    // Si es host de sala activa, sincronizar la nueva pista a toda la sala
    if (activeRoom && activeRoom.hostId === user?.id) {
      const dto = {
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
        songCoverUrl: resolveCoverUrl(song),
        songUrl: song.audioUrl,
        currentTimeMs: 0,
        isPlaying: true,
        serverTimestampUtcMs: Date.now()
      };
      signalrClient.syncPlaybackState(activeRoom.code, dto).catch(() => {
        apiClient.syncPlayback(activeRoom.code, dto).catch(() => {});
      });
    }
  };

  const handlePlayNext = (useShuffle = false) => {
    const list = playQueue.length ? playQueue : homeData?.allSongs || [];
    if (!list.length) return;
    const idx = list.findIndex((s) => s.id === currentSong?.id);
    const nextIdx = useShuffle
      ? Math.floor(Math.random() * list.length)
      : (idx + 1) % list.length;
    handlePlaySong(list[nextIdx], list);
  };

  const handlePlayPrev = () => {
    const list = playQueue.length ? playQueue : homeData?.allSongs || [];
    if (!list.length) return;
    const idx = list.findIndex((s) => s.id === currentSong?.id);
    const prevIdx = idx <= 0 ? list.length - 1 : idx - 1;
    handlePlaySong(list[prevIdx], list);
  };

  const handleToggleFavorite = async (songId) => {
    if (!user?.id || !songId) return;
    try {
      const res = await apiClient.toggleFavorite(songId, user.id);
      setHomeData((prev) => {
        if (!prev) return prev;
        const patch = (arr) =>
          (arr || []).map((s) =>
            s.id === songId ? { ...s, isFavorite: res.isFavorite, favoriteCount: res.favoriteCount } : s
          );
        return {
          ...prev,
          featuredSong:
            prev.featuredSong?.id === songId
              ? { ...prev.featuredSong, isFavorite: res.isFavorite, favoriteCount: res.favoriteCount }
              : prev.featuredSong,
          trendingSongs: patch(prev.trendingSongs),
          recentSongs: patch(prev.recentSongs),
          allSongs: patch(prev.allSongs)
        };
      });
      setCurrentSong((prev) =>
        prev?.id === songId ? { ...prev, isFavorite: res.isFavorite, favoriteCount: res.favoriteCount } : prev
      );
      notify(res.isFavorite ? 'Agregada a tus Favoritos.' : 'Removida de Favoritos.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleAddSongToRoom = async (song) => {
    if (!activeRoom || !song) return;
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
      await signalrClient.addSongToQueue(activeRoom.code, dto);
      setRightRailTab('room');
      notify(`"${song.title}" añadida a la cola de ${activeRoom.code}.`, 'success');
    } catch {
      try {
        const updated = await apiClient.addSongToQueue(activeRoom.code, dto);
        setActiveRoom(updated);
        setRightRailTab('room');
        notify(`"${song.title}" añadida a la cola.`, 'success');
      } catch (err) {
        notify(err.message, 'error');
      }
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    try {
      await apiClient.addSongToPlaylist(playlistId, songId, user.id);
      notify('Canción añadida a la playlist.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleQuickSyncNavidrome = async () => {
    setSyncingNavidrome(true);
    try {
      const res = await apiClient.syncMusicServer('primary');
      notify(res.message || 'Catálogo sincronizado desde res0nance.pp.ua', res.success ? 'success' : 'warning');
      await refreshCatalog();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSyncingNavidrome(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (user?.id) await apiClient.logout(user.id);
    } catch {
      // noop
    }
    await signalrClient.disconnectAll();
    clearSession();
    setUser(null);
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const topTracks = homeData?.trendingSongs || homeData?.allSongs?.slice(0, 8) || [];
  const totalSearchHits = searchResults
    ? (searchResults.songs?.length || 0)
      + (searchResults.playlists?.length || 0)
      + (searchResults.communities?.length || 0)
      + (searchResults.users?.length || 0)
    : 0;

  return (
    <div className="workspace-shell">
      {/* ==================== 1. SIDEBAR IZQUIERDO (256px) ==================== */}
      <aside className="workspace-sidebar" aria-label="Navegación principal">
        <div style={{ padding: '4px 10px 8px' }}>
          <div className="brand-mark">
            <span className="brand-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <div>
              <div style={{ lineHeight: 1.1 }}>RESONANCE</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
                From Around The World
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="nav-section-label">DISCOVER</div>
          <nav className="nav-list">
            {[
              { id: 'discover', label: 'Home', icon: Home },
              { id: 'rooms', label: 'Salas Jam', icon: Radio, badge: activeRoom ? activeRoom.code : null },
              { id: 'communities', label: 'Comunidades', icon: Users }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleSelectView(item.id)}
              >
                <item.icon size={18} strokeWidth={1.75} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge && <StatusBadge variant="success" dot>{item.badge}</StatusBadge>}
              </button>
            ))}
          </nav>
        </div>

        <div>
          <div className="nav-section-label">LIBRARY</div>
          <nav className="nav-list">
            {[
              { id: 'stats', label: 'Estadísticas', icon: BarChart3 },
              { id: 'catalog', label: 'Catálogo', icon: Disc3 },
              { id: 'favorites', label: 'Favoritos', icon: Heart },
              { id: 'playlists', label: 'Playlists', icon: ListMusic }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => handleSelectView(item.id)}
              >
                <item.icon size={18} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
          <div className="nav-section-label">GENERAL</div>
          <nav className="nav-list">
            <button type="button" className="nav-item" onClick={() => setProfileOpen(true)}>
              <UserIcon size={18} strokeWidth={1.75} />
              <span>Mi Perfil</span>
            </button>
            <button type="button" className="nav-item" onClick={handleQuickSyncNavidrome} disabled={syncingNavidrome}>
              <RefreshCw size={18} strokeWidth={1.75} />
              <span>{syncingNavidrome ? 'Sincronizando...' : 'Sincronizar Servidor'}</span>
            </button>
            <button type="button" className="nav-item" onClick={handleLogout} style={{ color: '#fda4af' }}>
              <LogOut size={18} strokeWidth={1.75} />
              <span>Cerrar Sesión</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* ==================== 2. ESCENARIO CENTRAL (1fr) ==================== */}
      <main className="workspace-main">
        {/* #16 STICKY HEADER + #19 BREADCRUMBS + #44 AUTOCOMPLETE GLOBAL SEARCH */}
        <header className="workspace-header">
          <div style={{ minWidth: 0 }}>
            <div className="breadcrumbs" aria-label="Ruta actual">
              <span>Resonance</span>
              <ChevronRight size={13} />
              <strong>{VIEW_LABELS[activeView] || 'Home'}</strong>
              {activeRoom && (
                <>
                  <ChevronRight size={13} />
                  <span className="mono" style={{ color: 'var(--accent-bright)' }}>{activeRoom.code}</span>
                </>
              )}
            </div>
            <h1 className="truncate" style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ¡Hola, {user.name}!
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ¿Qué música quieres escuchar en sincronía hoy?
            </p>
          </div>

          {/* #44 AUTOCOMPLETE SEARCH (HU 1.3) */}
          <div className="search-shell" ref={searchShellRef}>
            <div className="search-input-wrap">
              <Search size={17} color="#7a84a1" />
              <input
                type="search"
                value={searchQuery}
                onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canciones, playlists, usuarios o comunidades..."
                aria-label="Buscador global"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-icon"
                  style={{ width: 26, height: 26 }}
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                    setSearchOpen(false);
                  }}
                  aria-label="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {searchOpen && searchQuery.trim() && (
              <div className="search-dropdown" role="listbox" aria-label="Resultados de búsqueda global">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { id: 'all', label: 'Todos' },
                      { id: 'songs', label: 'Canciones' },
                      { id: 'playlists', label: 'Playlists' },
                      { id: 'communities', label: 'Comunidades' },
                      { id: 'users', label: 'Usuarios' }
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`filter-chip ${searchFilter === f.id ? 'active' : ''}`}
                        style={{ padding: '4px 10px', fontSize: '0.73rem' }}
                        onClick={() => setSearchFilter(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {searchLoading ? 'Buscando...' : `${totalSearchHits} resultados`}
                  </span>
                </div>

                {!searchLoading && totalSearchHits === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '12px 4px', textAlign: 'center' }}>
                    Sin coincidencias que inicien por "{searchQuery}".
                  </p>
                ) : (
                  <>
                    {/* Canciones */}
                    {searchResults?.songs?.length > 0 && (
                      <div>
                        <div className="nav-section-label" style={{ padding: '0 4px' }}>CANCIONES</div>
                        {searchResults.songs.slice(0, 6).map((song) => (
                          <button
                            key={song.id}
                            type="button"
                            className="search-result-row"
                            onClick={() => {
                              handlePlaySong(song, searchResults.songs);
                              setSearchOpen(false);
                            }}
                          >
                            <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size={36} radius={8} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                                <HighlightMatch text={song.title} query={searchQuery} />
                              </div>
                              <div className="truncate" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                <HighlightMatch text={song.artist} query={searchQuery} /> · {song.genre}
                              </div>
                            </div>
                            <Play size={14} color="#a78bfa" />
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Playlists */}
                    {searchResults?.playlists?.length > 0 && (
                      <div>
                        <div className="nav-section-label" style={{ padding: '0 4px' }}>PLAYLISTS</div>
                        {searchResults.playlists.slice(0, 4).map((pl) => (
                          <button
                            key={pl.id}
                            type="button"
                            className="search-result-row"
                            onClick={() => {
                              setFocusedPlaylistId(pl.id);
                              handleSelectView('playlists');
                              setSearchOpen(false);
                            }}
                          >
                            <CoverArtwork src={resolveCoverUrl(pl)} alt={pl.name} size={36} radius={8} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                                <HighlightMatch text={pl.name} query={searchQuery} />
                              </div>
                              <div className="truncate" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                Por {pl.authorName} · {pl.songCount} pistas
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Comunidades */}
                    {searchResults?.communities?.length > 0 && (
                      <div>
                        <div className="nav-section-label" style={{ padding: '0 4px' }}>COMUNIDADES</div>
                        {searchResults.communities.slice(0, 4).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="search-result-row"
                            onClick={() => {
                              setFocusedCommunityId(c.id);
                              handleSelectView('communities');
                              setSearchOpen(false);
                            }}
                          >
                            <CoverArtwork src={resolveCoverUrl(c)} alt={c.name} size={36} radius={8} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600, fontSize: '0.86rem' }}>
                                <HighlightMatch text={c.name} query={searchQuery} />
                              </div>
                              <div className="truncate" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {c.categoryValue} · {c.memberCount} miembros
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Usuarios */}
                    {searchResults?.users?.length > 0 && (
                      <div>
                        <div className="nav-section-label" style={{ padding: '0 4px' }}>USUARIOS</div>
                        {searchResults.users.slice(0, 4).map((u) => (
                          <div key={u.id} className="search-result-row" style={{ cursor: 'default' }}>
                            <img
                              src={u.avatarUrl || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(u.name)}`}
                              alt={u.name}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="truncate" style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                <HighlightMatch text={u.name} query={searchQuery} />
                              </div>
                              <div className="truncate" style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                {u.publicPlaylistsCount} playlists públicas
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {/* CONTENIDO ACTIVO IN-SITU */}
        <div className="workspace-content">
          {/* #30 Filter Chips de Géneros Musicales */}
          {(activeView === 'discover' || activeView === 'catalog' || activeView === 'favorites') && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                SHORTCUTS · GÉNEROS
              </div>
              <FilterChips
                options={homeData?.genres || []}
                selected={selectedGenre}
                onSelect={setSelectedGenre}
                allLabel="Todos"
              />
            </div>
          )}

          {(activeView === 'discover' || activeView === 'catalog' || activeView === 'favorites' || activeView === 'stats') && (
            <SongsSection
              mode={activeView}
              user={user}
              homeData={homeData}
              selectedGenre={selectedGenre}
              loading={loadingHome}
              currentSong={currentSong}
              isPlaying={isPlaying}
              activeRoom={activeRoom}
              onPlaySong={handlePlaySong}
              onToggleFavorite={handleToggleFavorite}
              onOpenSongDetail={setDetailSongId}
              onAddSongToRoom={handleAddSongToRoom}
              onRefreshCatalog={refreshCatalog}
              onNotify={notify}
            />
          )}

          {activeView === 'playlists' && (
            <PlaylistsSection
              user={user}
              allSongs={homeData?.allSongs || []}
              focusedPlaylistId={focusedPlaylistId}
              onClearFocusedPlaylist={() => setFocusedPlaylistId(null)}
              onPlaySong={handlePlaySong}
              onPlaylistsChanged={setUserPlaylists}
              onNotify={notify}
            />
          )}

          {activeView === 'communities' && (
            <CommunitiesSection
              user={user}
              allSongs={homeData?.allSongs || []}
              userPlaylists={userPlaylists}
              focusedCommunityId={focusedCommunityId}
              onClearFocusedCommunity={() => setFocusedCommunityId(null)}
              onPlaySong={handlePlaySong}
              onOpenPlaylist={(plId) => {
                setFocusedPlaylistId(plId);
                handleSelectView('playlists');
              }}
              onNotify={notify}
            />
          )}

          {activeView === 'rooms' && (
            <RoomsSection
              user={user}
              allSongs={homeData?.allSongs || []}
              activeRoom={activeRoom}
              onJoinRoom={handleJoinRoom}
              onOpenActiveRoomPanel={() => setRightRailTab('room')}
              onNotify={notify}
            />
          )}
        </div>
      </main>

      {/* ==================== 3. PANEL CONTEXTUAL DERECHO (320px) ==================== */}
      <aside className="workspace-rail" aria-label="Panel contextual derecho">
        {/* Cabecera: Campana con #29 StatusBadge + Avatar que abre ProfileDrawer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <StatusBadge variant={activeRoom ? 'success' : 'accent'} dot pulse={Boolean(activeRoom)} icon={Sparkles}>
            {activeRoom ? `En Vivo · ${activeRoom.code}` : 'Hi-Fi Ready'}
          </StatusBadge>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              className="btn-icon"
              style={{ position: 'relative' }}
              onClick={() => notify(`PostgreSQL 16 + Navidrome sincronizados (${homeData?.totalSongs ?? 0} pistas).`, 'info')}
              aria-label="Notificaciones del sistema"
              title="Estado de Resonance"
            >
              <Bell size={17} strokeWidth={1.75} />
              <span
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 7,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: activeRoom ? '#10b981' : '#8b5cf6'
                }}
              />
            </button>

            <button
              type="button"
              onClick={() => setProfileOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 2, borderRadius: 999 }}
              title="Abrir Mi Perfil (HU 1.2)"
              aria-label="Abrir perfil de usuario"
            >
              <img
                src={user.avatarUrl || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid var(--accent-light)'
                }}
              />
            </button>
          </div>
        </div>

        {/* #43 Segmented Control: Top Pistas | Sala Jam Activa */}
        <SegmentedControl
          fullWidth
          value={rightRailTab}
          onChange={setRightRailTab}
          options={[
            { value: 'top', label: 'Top Pistas' },
            { value: 'room', label: activeRoom ? `Sala ${activeRoom.code}` : 'Sala Jam' }
          ]}
        />

        {rightRailTab === 'top' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                TOP TRACKS
              </span>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {topTracks.length} pistas
              </span>
            </div>

            <div className="rail-scroll">
              {topTracks.map((song) => {
                const isCurrent = currentSong?.id === song.id;
                return (
                  <div
                    key={song.id}
                    className={`top-track-item ${isCurrent ? 'playing' : ''}`}
                  >
                    <div
                      style={{ position: 'relative', cursor: 'pointer' }}
                      onClick={() => handlePlaySong(song, topTracks)}
                    >
                      <CoverArtwork src={resolveCoverUrl(song)} alt={song.title} size={44} radius={10} />
                    </div>
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => handlePlaySong(song, topTracks)}
                    >
                      <div className="truncate" style={{ fontSize: '0.86rem', fontWeight: 700, color: isCurrent ? '#ddd6fe' : '#fff' }}>
                        {song.title}
                      </div>
                      <div className="truncate" style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                        {song.artist} · {formatDuration(song.durationInSeconds)}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: 30, height: 30 }}
                      onClick={() => handlePlaySong(song, topTracks)}
                      aria-label={isCurrent && isPlaying ? 'Pausar' : 'Reproducir'}
                    >
                      {isCurrent && isPlaying ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      style={{ width: 28, height: 28 }}
                      onClick={() => setDetailSongId(song.id)}
                      aria-label="Ficha técnica"
                    >
                      <Info size={14} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-secondary btn-sm"
              style={{ width: '100%', borderRadius: 999, justifyContent: 'space-between', padding: '0 16px' }}
              onClick={() => handleSelectView('catalog')}
            >
              <span>Ver Catálogo Completo</span>
              <ChevronRight size={15} />
            </button>
          </>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <LiveRoomPanel
              user={user}
              room={activeRoom}
              allSongs={homeData?.allSongs || []}
              connectionStatus={roomConnStatus}
              onLeaveRoom={handleLeaveRoom}
              onRoomClosed={(msg) => {
                setActiveRoom(null);
                setRoomSyncEvent(null);
                setRightRailTab('top');
                notify(msg, 'info');
              }}
              onRoomUpdated={setActiveRoom}
              onNotify={notify}
            />
          </div>
        )}
      </aside>

      {/* ==================== 4. REPRODUCTOR INFERIOR PERSISTENTE (88px) ==================== */}
      <GlobalPlayerBar
        user={user}
        currentSong={currentSong}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        initialSeekMs={initialSeekMs}
        onPlayNext={handlePlayNext}
        onPlayPrev={handlePlayPrev}
        onToggleFavorite={handleToggleFavorite}
        onOpenSongDetail={setDetailSongId}
        activeRoom={activeRoom}
        roomSyncEvent={roomSyncEvent}
        roomConnectionStatus={roomConnStatus}
        onOpenActiveRoomPanel={() => setRightRailTab('room')}
        onNotify={notify}
      />

      {/* ==================== DRAWERS Y TOASTS CAPA ZERO ==================== */}
      <ProfileDrawer
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={user}
        onUserUpdated={(updated) => {
          setUser(updated);
          updateStoredUser(updated);
        }}
        onCatalogSynced={refreshCatalog}
        onNotify={notify}
      />

      <SongDetailDrawer
        songId={detailSongId}
        onClose={() => setDetailSongId(null)}
        user={user}
        activeRoom={activeRoom}
        userPlaylists={userPlaylists}
        onPlaySong={(song) => handlePlaySong(song, homeData?.allSongs || [])}
        onToggleFavorite={handleToggleFavorite}
        onAddSongToRoom={handleAddSongToRoom}
        onAddSongToPlaylist={handleAddSongToPlaylist}
        onSongMutated={refreshCatalog}
        onNotify={notify}
      />

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
