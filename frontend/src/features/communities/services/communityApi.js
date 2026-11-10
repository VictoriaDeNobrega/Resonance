import { apiRequest } from '../../../api/axiosClient';

// Clave de almacenamiento local para persistencia y modo de desarrollo resiliente
const LOCAL_STORAGE_KEY = 'resonance_communities_data';

// Datos iniciales de demostración para explorar de inmediato
const SEED_COMMUNITIES = [
  {
    id: 'c101-genre-indie-rock',
    name: 'Indie & Alternative Wave',
    normalizedName: 'indie & alternative wave',
    description: 'Comunidad dedicada a los mejores lanzamientos de Indie Rock, Post-Punk Revival y Dream Pop. Comparte tus descubrimientos semanales.',
    categoryType: 'Genre',
    categoryValue: 'Indie Rock',
    creatorId: 'Victoria_Dev',
    creatorName: 'Victoria De Nóbrega',
    bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    memberCount: 142,
    createdAt: '2026-11-01T14:30:00Z',
    updatedAt: '2026-11-08T18:20:00Z',
    playlists: [
      {
        id: 'p-1',
        communityId: 'c101-genre-indie-rock',
        playlistId: 'pl-indie-essentials-2026',
        playlistTitle: 'Indie Rock Essentials 2026',
        description: 'Las mejores pistas indie del momento seleccionadas por la comunidad.',
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
        songCount: 24,
        addedBy: 'Victoria_Dev',
        addedAt: '2026-11-02T10:00:00Z'
      },
      {
        id: 'p-2',
        communityId: 'c101-genre-indie-rock',
        playlistId: 'pl-midnight-post-punk',
        playlistTitle: 'Midnight Post-Punk Echoes',
        description: 'Vibras oscuras, bajos profundos y guitarras melancólicas.',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
        songCount: 18,
        addedBy: 'Victoria_Dev',
        addedAt: '2026-11-04T12:00:00Z'
      }
    ]
  },
  {
    id: 'c102-artist-daft-punk',
    name: 'Daft Punk Alive Tribute',
    normalizedName: 'daft punk alive tribute',
    description: 'El templo definitivo para los fanáticos del dúo robótico francés. Homenaje a Homework, Discovery, Human After All y RAM.',
    categoryType: 'Artist',
    categoryValue: 'Daft Punk',
    creatorId: 'Victoria_Dev',
    creatorName: 'Victoria De Nóbrega',
    bannerUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=1200&q=80',
    memberCount: 285,
    createdAt: '2026-11-03T16:00:00Z',
    updatedAt: '2026-11-07T21:00:00Z',
    playlists: [
      {
        id: 'p-3',
        communityId: 'c102-artist-daft-punk',
        playlistId: 'pl-alive-experience',
        playlistTitle: 'Alive 2007 Sets & Rare Mixes',
        description: 'Mashups legendarios y versiones en vivo de la pirámide.',
        coverUrl: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
        songCount: 16,
        addedBy: 'Victoria_Dev',
        addedAt: '2026-11-03T18:00:00Z'
      }
    ]
  },
  {
    id: 'c103-genre-synthwave',
    name: 'Neon Synthwave & Retrowave',
    normalizedName: 'neon synthwave & retrowave',
    description: 'Sonidos retro-futuristas de los 80s con sintetizadores analógicos, ritmos electro y estética cyberpunk.',
    categoryType: 'Genre',
    categoryValue: 'Synthwave',
    creatorId: 'Gabriel_Castro',
    creatorName: 'Gabriel Castro',
    bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
    memberCount: 98,
    createdAt: '2026-11-05T09:15:00Z',
    updatedAt: '2026-11-05T09:15:00Z',
    playlists: []
  }
];

function getStoredCommunities() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SEED_COMMUNITIES));
      return SEED_COMMUNITIES;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[communityApi] Error leyendo de localStorage:', err);
    return SEED_COMMUNITIES;
  }
}

function saveStoredCommunities(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('[communityApi] Error guardando en localStorage:', err);
  }
}

export const communityApi = {
  /**
   * Obtener todas las comunidades con filtros opcionales de búsqueda y categoría
   */
  async getAll(search = '', categoryType = '') {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryType) params.append('categoryType', categoryType);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return await apiRequest(`/communities${queryStr}`, { method: 'GET' });
    } catch {
      // Fallback local resiliente
      let list = getStoredCommunities();
      if (categoryType) {
        list = list.filter((c) => c.categoryType.toLowerCase() === categoryType.toLowerCase());
      }
      if (search) {
        const q = search.trim().toLowerCase();
        list = list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.categoryValue.toLowerCase().includes(q) ||
            (c.description && c.description.toLowerCase().includes(q))
        );
      }
      return list;
    }
  },

  /**
   * Obtener una comunidad por su ID
   */
  async getById(id) {
    try {
      return await apiRequest(`/communities/${id}`, { method: 'GET' });
    } catch {
      const list = getStoredCommunities();
      const found = list.find((c) => String(c.id) === String(id));
      if (!found) {
        throw new Error('La comunidad solicitada no existe.');
      }
      return found;
    }
  },

  /**
   * Verificar si un nombre ya está tomado (para feedback en tiempo real)
   */
  async checkName(name, excludeId = null) {
    try {
      const params = new URLSearchParams({ name });
      if (excludeId) params.append('excludeId', excludeId);
      const res = await apiRequest(`/communities/check-name?${params.toString()}`, { method: 'GET' });
      return res.available;
    } catch {
      const list = getStoredCommunities();
      const normalized = name.trim().toLowerCase();
      const exists = list.some(
        (c) => c.normalizedName === normalized && String(c.id) !== String(excludeId)
      );
      return !exists;
    }
  },

  /**
   * Crear una nueva comunidad
   */
  async create(data) {
    try {
      return await apiRequest('/communities', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (err) {
      // Si el error fue un 400 del backend (nombre duplicado, etc.), relanzar el mensaje del servidor
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      // Fallback local
      const list = getStoredCommunities();
      const normalized = data.name.trim().toLowerCase();
      if (list.some((c) => c.normalizedName === normalized)) {
        throw new Error(`Ya existe una comunidad con el nombre '${data.name}'. Por favor elige otro nombre.`);
      }

      const newCommunity = {
        id: 'c-' + Date.now(),
        name: data.name.trim(),
        normalizedName: normalized,
        description: data.description ? data.description.trim() : '',
        categoryType: data.categoryType || 'Genre',
        categoryValue: data.categoryValue.trim(),
        creatorId: data.creatorId,
        creatorName: data.creatorName || data.creatorId,
        bannerUrl: data.bannerUrl || null,
        memberCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        playlists: []
      };

      list.unshift(newCommunity);
      saveStoredCommunities(list);
      return newCommunity;
    }
  },

  /**
   * Actualizar una comunidad (Escenario 1 y 2)
   */
  async update(id, data, userId) {
    try {
      return await apiRequest(`/communities/${id}`, {
        method: 'PUT',
        headers: {
          'X-User-Id': userId
        },
        body: JSON.stringify(data)
      });
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      // Fallback local
      const list = getStoredCommunities();
      const index = list.findIndex((c) => String(c.id) === String(id));
      if (index === -1) {
        throw new Error('La comunidad especificada no existe.');
      }

      const current = list[index];
      // Verificación de creador
      if (current.creatorId.toLowerCase() !== userId.toLowerCase()) {
        throw new Error('Solo el creador de la comunidad tiene permisos para realizar esta acción.');
      }

      // Validar campos obligatorios
      if (!data.name || !data.name.trim()) {
        throw new Error('El campo Nombre no puede estar vacío.');
      }
      if (!data.categoryValue || !data.categoryValue.trim()) {
        throw new Error('El campo Género/Artista no puede estar vacío.');
      }

      // Validar duplicados de nombre excluyendo la actual
      const normalized = data.name.trim().toLowerCase();
      const duplicate = list.some(
        (c) => c.normalizedName === normalized && String(c.id) !== String(id)
      );
      if (duplicate) {
        throw new Error(`Ya existe una comunidad con el nombre '${data.name}'. Por favor elige otro nombre.`);
      }

      const updated = {
        ...current,
        name: data.name.trim(),
        normalizedName: normalized,
        description: data.description ? data.description.trim() : '',
        categoryType: data.categoryType || current.categoryType,
        categoryValue: data.categoryValue.trim(),
        bannerUrl: data.bannerUrl || current.bannerUrl,
        updatedAt: new Date().toISOString()
      };

      list[index] = updated;
      saveStoredCommunities(list);
      return updated;
    }
  },

  /**
   * Vincular una playlist a la comunidad (Escenarios 3 y 4)
   */
  async addPlaylist(communityId, playlistData, userId) {
    try {
      return await apiRequest(`/communities/${communityId}/playlists`, {
        method: 'POST',
        headers: {
          'X-User-Id': userId
        },
        body: JSON.stringify(playlistData)
      });
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      // Fallback local
      const list = getStoredCommunities();
      const community = list.find((c) => String(c.id) === String(communityId));
      if (!community) {
        throw new Error('La comunidad especificada no existe.');
      }

      if (community.creatorId.toLowerCase() !== userId.toLowerCase()) {
        throw new Error('Solo el creador de la comunidad tiene permisos para agregar playlists.');
      }

      // Criterio de Aceptación Escenario 4: Intento de agregar una playlist ya vinculada
      const alreadyLinked = community.playlists.some(
        (p) => String(p.playlistId).toLowerCase() === String(playlistData.playlistId).toLowerCase()
      );
      if (alreadyLinked) {
        throw new Error('Esta playlist ya está agregada a la comunidad.');
      }

      const newPlaylistLink = {
        id: 'cp-' + Date.now(),
        communityId,
        playlistId: playlistData.playlistId,
        playlistTitle: playlistData.playlistTitle.trim(),
        description: playlistData.description ? playlistData.description.trim() : '',
        coverUrl: playlistData.coverUrl || null,
        songCount: playlistData.songCount || 0,
        addedBy: userId,
        addedAt: new Date().toISOString()
      };

      community.playlists.push(newPlaylistLink);
      community.updatedAt = new Date().toISOString();
      saveStoredCommunities(list);
      return newPlaylistLink;
    }
  },

  /**
   * Desvincular una playlist de la comunidad
   */
  async removePlaylist(communityId, playlistId, userId) {
    try {
      return await apiRequest(`/communities/${communityId}/playlists/${playlistId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': userId
        }
      });
    } catch (err) {
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      const list = getStoredCommunities();
      const community = list.find((c) => String(c.id) === String(communityId));
      if (!community) return false;

      if (community.creatorId.toLowerCase() !== userId.toLowerCase()) {
        throw new Error('Solo el creador tiene permisos para desvincular playlists.');
      }

      community.playlists = community.playlists.filter(
        (p) => String(p.playlistId) !== String(playlistId)
      );
      community.updatedAt = new Date().toISOString();
      saveStoredCommunities(list);
      return true;
    }
  }
};

