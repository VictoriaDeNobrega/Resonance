import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Play, Radio, Users, Server, Lock, ArrowRight, Database, Sparkles, Music2
} from 'lucide-react';
import { apiClient, getStoredSession } from '../api/apiClient';
import { AvatarStack, StatusBadge, CountUp, CoverArtwork } from '../components/CapaZeroUI';
import { resolveCoverUrl } from '../api/navidromeClient';

const DEFAULT_GENRES = [
  'Electronic Rock',
  'Alternative Rock',
  'Rock en Español',
  'Synthwave',
  'Indie Rock',
  'Post-Punk',
  'Soundtrack',
  'Lo-Fi Beats'
];

const TEAM_LISTENERS = [
  'Nidus',
  'Sebastián Pérez',
  'Victoria De Nóbrega',
  'Gabriel Castro',
  'Luis Guerrero',
  'Jesús Medina'
];

/**
 * Página 1 de 3: LandingPage (Ruta /)
 * Fórmula Nivel 100 Capa Zero:
 * - #16 Sticky Header con estado online PostgreSQL 16 + musica.res0nance.pp.ua
 * - #10 Hero Section con titular de beneficio < 8 palabras, #36 Avatar Stack y 1 CTA primario
 * - #56 Marquee de géneros musicales
 * - #01 Bento Grid de 4 tarjetas
 * - Estadísticas en vivo con #61 Count-up
 */
export default function LandingPage() {
  const { user } = getStoredSession();
  const [scrolled, setScrolled] = useState(false);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      apiClient.getGlobalStats(),
      apiClient.getHealth(),
      apiClient.getServerStatus()
    ]).then(([statsRes, healthRes, serverRes]) => {
      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (healthRes.status === 'fulfilled') setHealth(healthRes.value);
      if (serverRes.status === 'fulfilled') setServerStatus(serverRes.value);
    });
  }, []);

  const genres = stats?.playsByGenre?.length
    ? [...stats.playsByGenre.map((g) => g.genre), ...DEFAULT_GENRES.slice(0, 4)]
    : DEFAULT_GENRES;

  const featured = stats?.topSongs?.[0] || null;
  const dbOnline = Boolean(health?.connected);
  const musicOnline = Boolean(serverStatus?.primary?.isOnline || serverStatus?.mobile?.isOnline);

  return (
    <div className="landing-root">
      {/* #16 STICKY HEADER */}
      <header className={`landing-header ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="brand-mark" aria-label="Resonance inicio">
          <span className="brand-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>RESONANCE</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusBadge variant={dbOnline ? 'success' : 'neutral'} dot pulse={dbOnline} icon={Database}>
            {dbOnline ? 'PostgreSQL 16 Online' : 'PostgreSQL 16'}
          </StatusBadge>
          <StatusBadge variant={musicOnline ? 'accent' : 'neutral'} dot pulse={musicOnline} icon={Server}>
            {musicOnline ? 'movil.res0nance.pp.ua' : 'Subsonic Hi-Fi'}
          </StatusBadge>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/login" className="btn-ghost btn-sm">
            {user ? `Cuenta: ${user.name.split(' ')[0]}` : 'Iniciar Sesión'}
          </Link>
          <Link to={user ? '/home' : '/login'} className="btn-primary btn-sm">
            Abrir Reproductor <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      {/* #10 HERO SECTION */}
      <main className="landing-container">
        <section className="landing-hero">
          <div>
            <div style={{ marginBottom: 18 }}>
              <StatusBadge variant="accent" icon={Sparkles}>
                Resonance v2.0 · Streaming Colaborativo &lt;= 200 ms
              </StatusBadge>
            </div>

            {/* Titular de beneficio en 7 palabras (< 8 palabras — Fórmula Nivel 100) */}
            <h1 className="hero-headline">
              Escucha música en <span className="accent-text">sincronía con tus amigos</span>
            </h1>

            <p className="hero-sub">
              Crea salas Jam públicas o privadas con PIN de 6 dígitos, vota la siguiente canción en tiempo real y
              comparte playlists con comunidades conectadas a PostgreSQL 16 y Navidrome Hi-Fi.
            </p>

            {/* Único CTA Primario + Prueba Social (#36 Avatar Stack) al lado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              <Link to={user ? '/home' : '/login'} className="btn-primary" style={{ padding: '0 26px', height: 50, fontSize: '0.96rem' }}>
                <Play size={18} fill="#fff" /> Entrar a Resonance
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AvatarStack names={TEAM_LISTENERS} badgeText="+50/sala" maxVisible={4} />
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                  <strong style={{ color: '#fff', display: 'block' }}>Equipo 87 · UCAB</strong>
                  Salas activas sin cortes
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta visual en vivo del catálogo real */}
          <div
            className="glass-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              boxShadow: '0 32px 64px -18px rgba(124, 58, 237, 0.35)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge variant="success" dot pulse icon={Radio}>Sala Demo · RES-2026</StatusBadge>
              <span className="mono" style={{ fontSize: '0.74rem', color: 'var(--accent-bright)' }}>
                SignalR &lt;= 200 ms
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <CoverArtwork
                src={resolveCoverUrl(featured)}
                alt={featured?.title || 'Impeccable'}
                size={84}
                radius={14}
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--accent-bright)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Sonando en alta fidelidad
                </div>
                <div className="truncate" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 2 }}>
                  {featured?.title || 'Impeccable'}
                </div>
                <div className="truncate" style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                  {featured ? `${featured.artist} · ${featured.album}` : 'Calva Louise · Edge of the Abyss'}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { label: 'Pistas', val: stats?.totalSongs ?? 11 },
                { label: 'Plays', val: stats?.totalPlays ?? 950 },
                { label: 'Latencia', val: serverStatus?.primary?.latencyMs ? `${serverStatus.primary.latencyMs}ms` : '<200ms', raw: true }
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: '12px 10px',
                    borderRadius: 12,
                    background: 'rgba(9, 11, 20, 0.65)',
                    border: '1px solid var(--border-subtle)',
                    textAlign: 'center'
                  }}
                >
                  <div className="mono" style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff' }}>
                    {m.raw ? m.val : <CountUp value={m.val} />}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* #56 MARQUEE DE GÉNEROS MUSICALES */}
      <div className="marquee-wrap" aria-label="Géneros musicales disponibles">
        <div className="marquee-track">
          {[...genres, ...genres].map((genre, idx) => (
            <span key={`${genre}-${idx}`} className="marquee-item">
              <Music2 size={15} color="#8b5cf6" />
              {genre}
              <span className="marquee-sep">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* #01 BENTO GRID DE 4 TARJETAS */}
      <section className="landing-container" style={{ paddingTop: 64 }}>
        <div style={{ marginBottom: 24 }}>
          <span style={{ fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--accent-bright)', textTransform: 'uppercase' }}>
            Arquitectura de Dos Capas · POO + Capa Zero
          </span>
          <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginTop: 6 }}>
            Todo lo que necesitas para escuchar en comunidad
          </h2>
        </div>

        <div className="bento-grid">
          <article className="bento-card bento-span-7">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge variant="accent" icon={Radio}>Motor SignalR</StatusBadge>
              <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>01 / SYNC</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>
                Sincronización SignalR &lt;= 200 ms
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 520, lineHeight: 1.6 }}>
                Reproducción coordinada en tiempo real con compensación automática de latencia, reconexión
                transparente ante cortes de red y votación grupal Vote Skip sin interrumpir el reproductor.
              </p>
            </div>
          </article>

          <article className="bento-card bento-span-5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge variant="warning" icon={Lock}>Acceso Controlado</StatusBadge>
              <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>02 / JAM</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>
                Salas Jam Públicas y Privadas con PIN
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Hasta 50 oyentes simultáneos por sala, enlaces de invitación generados al instante, clave de 6 dígitos
                para sesiones privadas y chat de texto libre de llamadas pesadas.
              </p>
            </div>
          </article>

          <article className="bento-card bento-span-5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge variant="success" icon={Users}>Social + Moderación</StatusBadge>
              <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>03 / COMUNIDADES</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: 8 }}>
                Comunidades y Moderación
              </h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Funda clubes por género o artista, comparte playlists colaborativas, conversa en el portal en vivo y
                ejerce control total como dueño sobre comentarios y contenido multimedia.
              </p>
            </div>
          </article>

          <article className="bento-card bento-span-7">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <StatusBadge variant="accent" icon={Server}>Subsonic + ACID</StatusBadge>
              <span className="mono" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>04 / HI-FI</span>
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 8 }}>
                Streaming Hi-Fi Navidrome + PostgreSQL 16
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 540, lineHeight: 1.6 }}>
                Audio real desde el servidor principal <span className="mono">movil.res0nance.pp.ua</span> con failover automático (&lt;2.5s) hacia el secundario{' '}
                <span className="mono">musica.res0nance.pp.ua</span>, respaldado por 14 tablas relacionales ACID para
                usuarios, reseñas, favoritos, playlists, comunidades y salas.
              </p>
            </div>
          </article>
        </div>

        {/* ESTADÍSTICAS EN VIVO CON #61 COUNT-UP */}
        <section
          className="glass-card"
          style={{
            padding: '28px 32px',
            marginBottom: 72,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 20
          }}
        >
          {[
            { label: 'Canciones en Catálogo', value: stats?.totalSongs ?? 11, decimals: 0 },
            { label: 'Reproducciones Registradas', value: stats?.totalPlays ?? 950, decimals: 0 },
            { label: 'Favoritos de Oyentes', value: stats?.totalFavorites ?? 5, decimals: 0 },
            { label: 'Calificación Promedio', value: stats?.globalAverageRating ?? 4.7, decimals: 2, suffix: ' / 5' }
          ].map((item) => (
            <div key={item.label}>
              <div className="mono" style={{ fontSize: '2rem', fontWeight: 800, color: '#fff' }}>
                <CountUp value={item.value} decimals={item.decimals} suffix={item.suffix || ''} />
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </section>
      </section>

      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '28px clamp(20px, 5vw, 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: '0.82rem',
          color: 'var(--text-muted)'
        }}
      >
        <span>Resonance v2.0 · Ingeniería del Software · Equipo 87</span>
        <span className="mono">React 18 + .NET 8 + PostgreSQL 16 + Navidrome Subsonic</span>
      </footer>
    </div>
  );
}
