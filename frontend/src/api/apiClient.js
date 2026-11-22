/**
 * Adaptador HTTP con Failover Automático Activo-Pasivo (Timeout 2500 ms)
 * - Nodo Principal (1): https://movil.res0nance.pp.ua/api
 * - Nodo Secundario (2): https://musica.res0nance.pp.ua/api
 * - Nodo Local / Docker Proxy: /api o http://localhost:5000/api
 */
import { setMusicFailoverState } from './navidromeClient';

export const PRIMARY_NODE_API = 'https://movil.res0nance.pp.ua/api';
export const SECONDARY_NODE_API = 'https://musica.res0nance.pp.ua/api';
export const LOCAL_NODE_API = 'http://localhost:5000/api';
export const FAILOVER_TIMEOUT_MS = 2500;

function detectInitialApiBase() {
  const stored = localStorage.getItem('resonance_api_url');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('res0nance.pp.ua')) {
      return PRIMARY_NODE_API;
    }
    if (window.location.port === '8080' || window.location.port === '80' || window.location.port === '443') {
      return `${window.location.origin}/api`;
    }
  }
  return LOCAL_NODE_API;
}

let activeApiBase = detectInitialApiBase();
let failoverActive = false;

export function getApiBaseUrl() {
  const stored = localStorage.getItem('resonance_api_url');
  if (stored && stored.trim()) {
    return stored.trim().replace(/\/+$/, '');
  }
  return activeApiBase.replace(/\/+$/, '');
}

export function getBackendOrigin(baseUrl = getApiBaseUrl()) {
  const clean = baseUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean.slice(0, -4) : clean;
}

export function isApiFailoverActive() {
  return failoverActive;
}

export function setApiBaseUrl(url) {
  if (!url || !url.trim()) {
    localStorage.removeItem('resonance_api_url');
    activeApiBase = detectInitialApiBase();
    failoverActive = false;
    return activeApiBase;
  }
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem('resonance_api_url', clean);
  activeApiBase = clean;
  failoverActive = clean.includes('musica.res0nance.pp.ua');
  setMusicFailoverState(failoverActive);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resonance-failover-changed', {
      detail: { activeApiBase, failoverActive }
    }));
  }
  return clean;
}

function getFailoverCandidateList() {
  const current = getApiBaseUrl();
  const candidates = [
    current,
    PRIMARY_NODE_API,
    SECONDARY_NODE_API,
    LOCAL_NODE_API
  ];
  if (typeof window !== 'undefined' && window.location?.origin) {
    candidates.push(`${window.location.origin}/api`);
  }
  return [...new Set(candidates.map((c) => c.replace(/\/+$/, '')))];
}

export function getStoredSession() {
  try {
    const token = localStorage.getItem('resonance_token') || '';
    const rawUser = localStorage.getItem('resonance_user');
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { token, user };
  } catch {
    return { token: '', user: null };
  }
}

export function saveSession(token, user) {
  if (token) localStorage.setItem('resonance_token', token);
  if (user) localStorage.setItem('resonance_user', JSON.stringify(user));
}

export function updateStoredUser(user) {
  if (user) localStorage.setItem('resonance_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('resonance_token');
  localStorage.removeItem('resonance_user');
}

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      qs.set(key, String(value));
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

function extractErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  if (payload.message) return payload.message;
  if (payload.error) return payload.error;
  if (payload.errors && typeof payload.errors === 'object') {
    const firstList = Object.values(payload.errors).find((v) => Array.isArray(v) && v.length > 0);
    if (firstList) return firstList[0];
  }
  if (payload.title) return payload.title;
  return fallback;
}

async function fetchWithTimeout(url, fetchOptions, timeoutMs = FAILOVER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(timer);
    return response;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function request(path, options = {}, useRootOrigin = false) {
  const { token, user } = getStoredSession();
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(user?.id ? { 'x-user-id': user.id } : {}),
    ...(options.headers || {})
  };

  const fetchOptions = {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body
  };

  const candidates = getFailoverCandidateList();
  let lastError = null;
  let response = null;

  for (let i = 0; i < candidates.length; i++) {
    const candidateApiBase = candidates[i];
    const base = useRootOrigin ? getBackendOrigin(candidateApiBase) : candidateApiBase;
    const timeoutMs = i === 0 ? FAILOVER_TIMEOUT_MS : FAILOVER_TIMEOUT_MS * 2;

    try {
      const candidateRes = await fetchWithTimeout(`${base}${path}`, fetchOptions, timeoutMs);
      if (candidateRes.status >= 502 && candidateRes.status <= 504 && i < candidates.length - 1) {
        lastError = new Error(`Servidor ${base} respondió HTTP ${candidateRes.status}`);
        continue;
      }

      response = candidateRes;

      if (candidateApiBase !== activeApiBase) {
        activeApiBase = candidateApiBase;
        failoverActive = candidateApiBase.includes('musica.res0nance.pp.ua');
        setMusicFailoverState(failoverActive);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('resonance-failover-changed', {
            detail: { activeApiBase, failoverActive }
          }));
        }
      }
      break;
    } catch (err) {
      lastError = err;
      if (candidateApiBase.includes('movil.res0nance.pp.ua')) {
        setMusicFailoverState(true);
      }
    }
  }

  if (!response) {
    throw new Error(
      `No se pudo conectar al servidor principal (${PRIMARY_NODE_API}) ni al secundario (${SECONDARY_NODE_API}). ${lastError?.message || ''}`.trim()
    );
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : await response.text().catch(() => null);

  if (!response.ok) {
    const err = new Error(extractErrorMessage(data, `Error HTTP ${response.status}`));
    err.status = response.status;
    err.payload = data;
    throw err;
  }

  return data;
}

export const apiClient = {
  PRIMARY_NODE_API,
  SECONDARY_NODE_API,
  LOCAL_NODE_API,
  FAILOVER_TIMEOUT_MS,
  getApiBaseUrl,
  getBackendOrigin,
  setApiBaseUrl,
  isApiFailoverActive,

  // ==================== HEALTH & CLUSTER SYNC ====================
  getHealth: () => request('/health', { method: 'GET' }, true),
  getClusterStatus: () => request('/songs/cluster-status', { method: 'GET' }),
  triggerClusterSync: () => request('/songs/cluster-sync', { method: 'POST' }),

  // ==================== AUTH (/api/auth) ====================
  register: (dto) => request('/auth/register', { method: 'POST', body: dto }),
  confirmAccount: (dto) => request('/auth/confirm', { method: 'POST', body: dto }),
  login: (dto) => request('/auth/login', { method: 'POST', body: dto }),
  logout: (userId) => request(`/auth/logout/${userId}`, { method: 'POST' }),
  getProfile: (userId) => request(`/auth/profile/${userId}`, { method: 'GET' }),
  updateProfile: (userId, dto) => request(`/auth/update/${userId}`, { method: 'PUT', body: dto }),
  updateSessionState: (userId, dto) => request(`/auth/session-state/${userId}`, { method: 'PUT', body: dto }),
  searchUsers: (query = '', limit = 20) =>
    request(`/auth/users/search${buildQuery({ query, limit })}`, { method: 'GET' }),

  // ==================== SONGS, STATS, SEARCH & SUBSONIC (/api/songs) ====================
  getHomeSongs: (userId) => request(`/songs/home${buildQuery({ userId })}`, { method: 'GET' }),
  globalSearch: ({ query = '', genre, artist, filter = 'all', userId } = {}) =>
    request(`/songs/global-search${buildQuery({ query, genre, artist, filter, userId })}`, { method: 'GET' }),
  searchSongs: ({ query, genre, artist, page = 1, pageSize = 20, userId } = {}) =>
    request(`/songs/search${buildQuery({ query, genre, artist, page, pageSize, userId })}`, { method: 'GET' }),
  getGlobalStats: (userId) => request(`/songs/stats${buildQuery({ userId })}`, { method: 'GET' }),
  getServerStatus: () => request('/songs/server-status', { method: 'GET' }),
  syncMusicServer: (source = 'primary') =>
    request(`/songs/sync-server${buildQuery({ source })}`, { method: 'POST' }),
  getUserFavorites: (userId) => request(`/songs/favorites/${userId}`, { method: 'GET' }),
  getSongById: (songId, userId) => request(`/songs/${songId}${buildQuery({ userId })}`, { method: 'GET' }),
  getSongStats: (songId) => request(`/songs/${songId}/stats`, { method: 'GET' }),
  createSong: (dto) => request('/songs', { method: 'POST', body: dto }),
  updateSong: (songId, dto) => request(`/songs/${songId}`, { method: 'PUT', body: dto }),
  deleteSong: (songId) => request(`/songs/${songId}`, { method: 'DELETE' }),
  registerPlay: (songId, userId) =>
    request(`/songs/${songId}/play`, { method: 'POST', body: { userId: userId || null } }),
  toggleFavorite: (songId, userId) =>
    request(`/songs/${songId}/favorite`, { method: 'POST', body: { userId } }),
  getReviews: (songId) => request(`/songs/${songId}/reviews`, { method: 'GET' }),
  addReview: (songId, dto) => request(`/songs/${songId}/reviews`, { method: 'POST', body: dto }),

  // ==================== PLAYLISTS (/api/playlists) ====================
  createPlaylist: (dto) => request('/playlists', { method: 'POST', body: dto }),
  getUserPlaylists: (userId) => request(`/playlists/user/${userId}`, { method: 'GET' }),
  getPublicPlaylists: (excludeUserId, search) =>
    request(`/playlists/public${buildQuery({ excludeUserId, search })}`, { method: 'GET' }),
  getPlaylistById: (playlistId) => request(`/playlists/${playlistId}`, { method: 'GET' }),
  updatePlaylist: (playlistId, dto) => request(`/playlists/${playlistId}`, { method: 'PUT', body: dto }),
  deletePlaylist: (playlistId, requesterId) =>
    request(`/playlists/${playlistId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),
  addSongToPlaylist: (playlistId, songId, userId) =>
    request(`/playlists/${playlistId}/songs/${songId}${buildQuery({ requesterId: userId })}`, { method: 'POST' }),
  removeSongFromPlaylist: (playlistId, songId, userId) =>
    request(`/playlists/${playlistId}/songs/${songId}${buildQuery({ requesterId: userId })}`, { method: 'DELETE' }),
  reorderPlaylistSongs: (playlistId, userId, songIds) =>
    request(`/playlists/${playlistId}/songs/reorder`, { method: 'PUT', body: { userId, songIds } }),

  // ==================== COMMUNITIES (/api/communities) ====================
  getCommunities: ({ search, categoryType, categoryValue, userId } = {}) =>
    request(`/communities${buildQuery({ search, categoryType, categoryValue, userId })}`, { method: 'GET' }),
  getCommunityById: (communityId, userId) =>
    request(`/communities/${communityId}${buildQuery({ userId })}`, { method: 'GET' }),
  createCommunity: (dto) => request('/communities', { method: 'POST', body: dto }),
  updateCommunity: (communityId, dto) => request(`/communities/${communityId}`, { method: 'PUT', body: dto }),
  deleteCommunity: (communityId, requesterId) =>
    request(`/communities/${communityId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),
  joinCommunity: (communityId, dto) => request(`/communities/${communityId}/join`, { method: 'POST', body: dto }),
  leaveCommunity: (communityId, userId) =>
    request(`/communities/${communityId}/leave${buildQuery({ userId })}`, { method: 'POST' }),
  addPlaylistToCommunity: (communityId, dto) =>
    request(`/communities/${communityId}/playlists`, { method: 'POST', body: dto }),
  removePlaylistFromCommunity: (communityId, playlistId, requesterId) =>
    request(`/communities/${communityId}/playlists/${playlistId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),
  addSongToCommunity: (communityId, dto) =>
    request(`/communities/${communityId}/songs`, { method: 'POST', body: dto }),
  removeSongFromCommunity: (communityId, songId, requesterId) =>
    request(`/communities/${communityId}/songs/${songId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),
  getCommunityComments: (communityId) => request(`/communities/${communityId}/comments`, { method: 'GET' }),
  addCommunityComment: (communityId, dto) =>
    request(`/communities/${communityId}/comments`, { method: 'POST', body: dto }),
  deleteCommunityComment: (communityId, commentId, requesterId) =>
    request(`/communities/${communityId}/comments/${commentId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),

  // ==================== ROOMS (/api/rooms) ====================
  getActiveRooms: (genre, search) => request(`/rooms${buildQuery({ genre, search })}`, { method: 'GET' }),
  getRoomByCode: (code) => request(`/rooms/${encodeURIComponent(code)}`, { method: 'GET' }),
  createRoom: (dto) => request('/rooms', { method: 'POST', body: dto }),
  joinRoom: (code, dto) => request(`/rooms/${encodeURIComponent(code)}/join`, { method: 'POST', body: dto }),
  leaveRoom: (code, userId) =>
    request(`/rooms/${encodeURIComponent(code)}/leave${buildQuery({ userId })}`, { method: 'POST' }),
  syncPlayback: (code, dto) => request(`/rooms/${encodeURIComponent(code)}/playback`, { method: 'PUT', body: dto }),
  addSongToQueue: (code, dto) => request(`/rooms/${encodeURIComponent(code)}/queue`, { method: 'POST', body: dto }),
  removeSongFromQueue: (code, roomSongId, requesterId) =>
    request(`/rooms/${encodeURIComponent(code)}/queue/${roomSongId}${buildQuery({ requesterId })}`, { method: 'DELETE' }),
  voteQueueSong: (code, roomSongId, userId) =>
    request(`/rooms/${encodeURIComponent(code)}/queue/${roomSongId}/vote`, { method: 'POST', body: { userId } }),
  castSkipVote: (code, userId) =>
    request(`/rooms/${encodeURIComponent(code)}/skip-vote`, { method: 'POST', body: { userId } }),
  getRoomMessages: (code, limit = 100) =>
    request(`/rooms/${encodeURIComponent(code)}/messages${buildQuery({ limit })}`, { method: 'GET' }),
  sendRoomMessage: (code, dto) =>
    request(`/rooms/${encodeURIComponent(code)}/messages`, { method: 'POST', body: dto }),
  closeRoom: (code, requesterId) =>
    request(`/rooms/${encodeURIComponent(code)}/close${buildQuery({ requesterId })}`, { method: 'POST' }),
  deleteRoom: (code, requesterId) =>
    request(`/rooms/${encodeURIComponent(code)}${buildQuery({ requesterId })}`, { method: 'DELETE' })
};

export default apiClient;
