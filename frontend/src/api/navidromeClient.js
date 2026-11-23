/**
 * Conector Subsonic / Navidrome con Failover Automático (Timeout 2500 ms):
 * - Servidor Principal (1): https://movil.res0nance.pp.ua (Resonance Móvil)
 * - Servidor Secundario (2): https://musica.res0nance.pp.ua (Música Resonance)
 */

export const PRIMARY_MUSIC_SERVER = 'https://movil.res0nance.pp.ua';
export const SECONDARY_MUSIC_SERVER = 'https://musica.res0nance.pp.ua';
export const MOBILE_MUSIC_SERVER = SECONDARY_MUSIC_SERVER; // Alias compatible
export const FAILOVER_TIMEOUT_MS = 2500;

const SUBSONIC_USER = 'Nidus';
const SUBSONIC_PASS = '115r935m';
const SUBSONIC_VERSION = '1.16.1';
const SUBSONIC_CLIENT = 'Resonance';

let activeMusicServer = PRIMARY_MUSIC_SERVER;
let failoverActivated = false;

export function getActiveMusicServer() {
  return activeMusicServer;
}

export function isMusicFailoverActive() {
  return failoverActivated;
}

export function setMusicFailoverState(useSecondary) {
  failoverActivated = Boolean(useSecondary);
  activeMusicServer = failoverActivated ? SECONDARY_MUSIC_SERVER : PRIMARY_MUSIC_SERVER;
}

function buildAuthParams(includeJson = false) {
  const params = new URLSearchParams({
    u: SUBSONIC_USER,
    p: SUBSONIC_PASS,
    v: SUBSONIC_VERSION,
    c: SUBSONIC_CLIENT
  });
  if (includeJson) {
    params.set('f', 'json');
  }
  return params.toString();
}

export function buildStreamUrl(externalId, host = activeMusicServer) {
  if (!externalId) return '';
  const cleanHost = host.replace(/\/+$/, '');
  return `${cleanHost}/rest/stream.view?id=${encodeURIComponent(externalId)}&${buildAuthParams(false)}`;
}

export function buildCoverArtUrl(coverId, size = 600, host = activeMusicServer) {
  if (!coverId) return '';
  const cleanHost = host.replace(/\/+$/, '');
  return `${cleanHost}/rest/getCoverArt.view?id=${encodeURIComponent(coverId)}&size=${size}&${buildAuthParams(false)}`;
}

export function rewriteToActiveMusicServer(url, forceSecondary = failoverActivated) {
  if (!url) return '';
  // Si se solicita failover forzado hacia el secundario
  if (forceSecondary && url.includes(PRIMARY_MUSIC_SERVER)) {
    return url.replace(PRIMARY_MUSIC_SERVER, SECONDARY_MUSIC_SERVER);
  }
  // Si la pista ya contiene un host válido de Subsonic, no sobreescribirla
  return url;
}

/**
 * Resuelve la URL efectiva de streaming priorizando el origen nativo de la pista
 * y conmutando automáticamente al secundario/alternativo si el failover está activo.
 */
export function resolveSongStreamUrl(song, preferSecondary = failoverActivated) {
  if (!song) return '';
  const raw = song.audioUrl || song.url || '';
  if (raw) {
    if (preferSecondary && raw.includes(PRIMARY_MUSIC_SERVER)) {
      return raw.replace(PRIMARY_MUSIC_SERVER, SECONDARY_MUSIC_SERVER);
    }
    return raw;
  }
  if (song.externalId) {
    return buildStreamUrl(song.externalId, preferSecondary ? SECONDARY_MUSIC_SERVER : PRIMARY_MUSIC_SERVER);
  }
  return '';
}

/**
 * Resuelve la URL de carátula con failover limpio entre movil.res0nance.pp.ua y musica.res0nance.pp.ua.
 */
export function resolveCoverUrl(song, preferSecondary = failoverActivated) {
  if (!song) return '';
  const raw = song.coverImageUrl || song.coverUrl || '';
  if (raw) {
    if (preferSecondary && raw.includes(PRIMARY_MUSIC_SERVER)) {
      return raw.replace(PRIMARY_MUSIC_SERVER, SECONDARY_MUSIC_SERVER);
    }
    return raw;
  }
  if (song.externalId) {
    return buildCoverArtUrl(song.externalId, 600, preferSecondary ? SECONDARY_MUSIC_SERVER : PRIMARY_MUSIC_SERVER);
  }
  return '';
}

/**
 * Conmuta una URL de stream/carátula del Principal (movil) al Secundario (musica) o viceversa.
 */
export function getFallbackStreamUrl(url) {
  if (!url) return '';
  if (url.includes(PRIMARY_MUSIC_SERVER)) {
    setMusicFailoverState(true);
    return url.replace(PRIMARY_MUSIC_SERVER, SECONDARY_MUSIC_SERVER);
  }
  if (url.includes(SECONDARY_MUSIC_SERVER)) {
    return url.replace(SECONDARY_MUSIC_SERVER, PRIMARY_MUSIC_SERVER);
  }
  return url;
}

export function isSubsonicResonanceUrl(url) {
  if (!url) return false;
  return url.includes('res0nance.pp.ua');
}

export async function pingSubsonicServer(host = PRIMARY_MUSIC_SERVER, timeoutMs = FAILOVER_TIMEOUT_MS) {
  const cleanHost = host.replace(/\/+$/, '');
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${cleanHost}/rest/ping.view?${buildAuthParams(true)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - started);
    if (!res.ok) {
      return { online: false, host: cleanHost, latencyMs, error: `HTTP ${res.status}` };
    }
    const json = await res.json();
    const sub = json['subsonic-response'];
    const isOk = sub?.status === 'ok';
    return {
      online: isOk,
      host: cleanHost,
      latencyMs,
      serverType: sub?.type || 'navidrome',
      serverVersion: sub?.serverVersion || SUBSONIC_VERSION
    };
  } catch (err) {
    clearTimeout(timer);
    const latencyMs = Math.round(performance.now() - started);
    return {
      online: false,
      host: cleanHost,
      latencyMs,
      error: err?.name === 'AbortError' ? `Timeout > ${timeoutMs}ms` : err.message
    };
  }
}

/**
 * Verifica el Servidor Principal (movil.res0nance.pp.ua) con timeout de 2.5s;
 * si no responde a tiempo, activa automáticamente el Secundario (musica.res0nance.pp.ua).
 */
export async function ensureMusicServerFailover() {
  const primaryPing = await pingSubsonicServer(PRIMARY_MUSIC_SERVER, FAILOVER_TIMEOUT_MS);
  if (primaryPing.online && primaryPing.latencyMs <= FAILOVER_TIMEOUT_MS) {
    setMusicFailoverState(false);
    return { activeHost: PRIMARY_MUSIC_SERVER, failover: false, primary: primaryPing };
  }

  const secondaryPing = await pingSubsonicServer(SECONDARY_MUSIC_SERVER, FAILOVER_TIMEOUT_MS * 2);
  if (secondaryPing.online) {
    setMusicFailoverState(true);
    return { activeHost: SECONDARY_MUSIC_SERVER, failover: true, primary: primaryPing, secondary: secondaryPing };
  }

  return { activeHost: activeMusicServer, failover: failoverActivated, primary: primaryPing, secondary: secondaryPing };
}

export const navidromeClient = {
  PRIMARY_MUSIC_SERVER,
  SECONDARY_MUSIC_SERVER,
  MOBILE_MUSIC_SERVER,
  FAILOVER_TIMEOUT_MS,
  getActiveMusicServer,
  isMusicFailoverActive,
  setMusicFailoverState,
  buildStreamUrl,
  buildCoverArtUrl,
  resolveSongStreamUrl,
  resolveCoverUrl,
  getFallbackStreamUrl,
  isSubsonicResonanceUrl,
  pingSubsonicServer,
  ensureMusicServerFailover
};

export default navidromeClient;
