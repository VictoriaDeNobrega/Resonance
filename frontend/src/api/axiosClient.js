import { getServerUrl } from '../config/serverConfig';

/**
 * Cliente HTTP estándar compatible con peticiones directas estilo fetch
 */
export async function apiRequest(endpoint, options = {}) {
  const baseUrl = `${getServerUrl()}/api`;
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const storedUser = localStorage.getItem('user');
  let userIdHeader = {};
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.id) userIdHeader['x-user-id'] = parsed.id;
    } catch {}
  }

  const headers = {
    'Content-Type': 'application/json',
    ...userIdHeader,
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const err = new Error(errorData.message || errorData.error || `Error en la solicitud: ${response.status}`);
      err.response = { data: errorData, status: response.status };
      throw err;
    }
    return await response.json();
  } catch (error) {
    console.error(`[API Error] ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Adaptador compatible con la sintaxis de Axios (axiosClient.get, axiosClient.post, etc.)
 * Permite que los componentes de canciones y playlists funcionen sin necesidad de instalar la librería axios externa.
 */
export const axiosClient = {
  async get(endpoint, config = {}) {
    let url = endpoint;
    if (config.params) {
      const queryString = new URLSearchParams(
        Object.entries(config.params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    const data = await apiRequest(url, { method: 'GET', headers: config.headers });
    return { data, status: 200 };
  },

  async post(endpoint, body = {}, config = {}) {
    const data = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: config.headers
    });
    return { data, status: 201 };
  },

  async put(endpoint, body = {}, config = {}) {
    const data = await apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: config.headers
    });
    return { data, status: 200 };
  },

  async delete(endpoint, config = {}) {
    const data = await apiRequest(endpoint, {
      method: 'DELETE',
      headers: config.headers
    });
    return { data, status: 200 };
  }
};

export default axiosClient;
