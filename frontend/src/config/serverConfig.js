// Configuración dinámica de conexión al servidor y fallback de música local

const STORAGE_SERVER_URL = 'resonance_server_url';
const STORAGE_FORCE_LOCAL = 'resonance_force_local_mode';
export const DEFAULT_SERVER_URL = 'http://localhost:5000';

/**
 * Obtener la URL del servidor backend configurada actualmente
 */
export function getServerUrl() {
  const custom = localStorage.getItem(STORAGE_SERVER_URL);
  if (custom) return custom.replace(/\/+$/, '');
  return (import.meta.env.VITE_API_URL || DEFAULT_SERVER_URL).replace(/\/+$/, '');
}

/**
 * Guardar una nueva URL de servidor
 */
export function setServerUrl(newUrl) {
  if (!newUrl || !newUrl.trim()) {
    localStorage.removeItem(STORAGE_SERVER_URL);
  } else {
    let clean = newUrl.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `http://${clean}`;
    }
    localStorage.setItem(STORAGE_SERVER_URL, clean);
  }
  window.dispatchEvent(new Event('resonance-server-config-changed'));
}

/**
 * Comprobar si el usuario forzó el modo local
 */
export function isForceLocalMode() {
  return localStorage.getItem(STORAGE_FORCE_LOCAL) === 'true';
}

export function setForceLocalMode(forced) {
  localStorage.setItem(STORAGE_FORCE_LOCAL, forced ? 'true' : 'false');
  window.dispatchEvent(new Event('resonance-server-config-changed'));
}

/**
 * Probar conexión con el servidor especificado
 */
export async function testServerConnection(urlToTest) {
  const target = (urlToTest || getServerUrl()).replace(/\/+$/, '');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Intentar consultar swagger o endpoint base
    const response = await fetch(`${target}/api/rooms`, {
      method: 'GET',
      signal: controller.signal
    }).catch(async () => {
      // Intentar ping a la raíz
      return await fetch(`${target}/`, { method: 'GET', signal: controller.signal });
    });

    clearTimeout(timeoutId);
    return response && (response.status < 500 || response.status === 404 || response.ok);
  } catch {
    return false;
  }
}

/**
 * Resuelve una URL de audio:
 * - Si es una URL absoluta (http:// o https://), la retorna intacta.
 * - Si es una ruta relativa (/music/Aimless.mp3), la sirve desde el frontend local o desde el servidor.
 */
export function resolveAudioUrl(urlOrPath) {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('blob:')) {
    return urlOrPath;
  }
  // Ruta local servida por Vite (desde /public/music/...)
  return urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
}
