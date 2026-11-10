import { apiRequest } from '../../../api/axiosClient';
import { LOCAL_TRACKS } from '../data/localTracks';
import { isForceLocalMode, resolveAudioUrl } from '../../../config/serverConfig';

export const songsService = {
  /**
   * Obtiene la lista de canciones.
   * Si está en modo servidor y responde, usa el backend.
   * Si el servidor no responde o está en modo local, utiliza las 11 pistas locales de Calva Louise.
   */
  async getAllSongs(search = '', genre = '') {
    if (!isForceLocalMode()) {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (genre) params.append('genre', genre);
        const query = params.toString() ? `?${params.toString()}` : '';
        const serverTracks = await apiRequest(`/songs${query}`, { method: 'GET' });
        if (Array.isArray(serverTracks) && serverTracks.length > 0) {
          return serverTracks.map((t) => ({
            ...t,
            url: resolveAudioUrl(t.url || t.songUrl)
          }));
        }
      } catch {
        // Fallback silencioso a la biblioteca local
      }
    }

    // Filtrado en el catálogo local
    let results = [...LOCAL_TRACKS];

    if (genre) {
      results = results.filter((t) => t.genre.toLowerCase().includes(genre.toLowerCase()));
    }

    if (search) {
      const q = search.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.artist.toLowerCase().includes(q) ||
          t.album.toLowerCase().includes(q)
      );
    }

    return results.map((t) => ({
      ...t,
      url: resolveAudioUrl(t.url)
    }));
  },

  /**
   * Obtiene una canción específica por su ID
   */
  async getSongById(id) {
    if (!isForceLocalMode()) {
      try {
        const t = await apiRequest(`/songs/${id}`, { method: 'GET' });
        if (t) return { ...t, url: resolveAudioUrl(t.url || t.songUrl) };
      } catch {
        // Fallback
      }
    }

    const local = LOCAL_TRACKS.find((t) => t.id === id);
    if (local) {
      return { ...local, url: resolveAudioUrl(local.url) };
    }
    return null;
  },

  /**
   * Devuelve las pistas de la carpeta local directamente
   */
  getLocalTracks() {
    return LOCAL_TRACKS.map((t) => ({
      ...t,
      url: resolveAudioUrl(t.url)
    }));
  }
};

