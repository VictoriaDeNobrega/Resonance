import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LogIn, UserPlus, KeyRound, Mail, Lock, User, AlertCircle,
  CheckCircle2, ArrowLeft, Radio, ShieldCheck, Sparkles
} from 'lucide-react';
import { apiClient, saveSession } from '../api/apiClient';
import { SegmentedControl, StatusBadge } from '../components/CapaZeroUI';

const DEMO_ACCOUNTS = [
  { name: 'Nidus', role: 'Curador Navidrome', email: 'nidus@resonance.pp.ua', password: '115r935m' },
  { name: 'Sebastián Pérez', role: 'Host Salas Jam', email: 'sebastian@resonance.app', password: 'Resonance123!' },
  { name: 'Victoria De Nóbrega', role: 'Playlists', email: 'victoria@resonance.app', password: 'Resonance123!' },
  { name: 'Gabriel Castro', role: 'Reseñas Hi-Fi', email: 'gabriel@resonance.app', password: 'Resonance123!' },
  { name: 'Luis Guerrero', role: 'Sesiones Vivo', email: 'luis@resonance.app', password: 'Resonance123!' },
  { name: 'Jesús Medina', role: 'Moderador', email: 'jesus@resonance.app', password: 'Resonance123!' }
];

/**
 * Página 2 de 3: LoginPage (Ruta /login)
 * - Layout #02 Split Screen + tarjeta #64 Glassmorphism
 * - #43 Segmented Control: Iniciar Sesión (HU 2.1) | Crear Cuenta (HU 1.1) | Confirmar Cuenta (HU 1.1)
 * - Validación completa en cliente antes del envío + cuentas demo Equipo 87
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget = location.state?.from || '/home';

  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'confirm'
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null); // { type, message }
  const [errors, setErrors] = useState({});

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', bio: '' });
  const [confirmForm, setConfirmForm] = useState({ email: '', token: '' });
  const [issuedTokenInfo, setIssuedTokenInfo] = useState(null);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrors({});
    setBanner(null);
  };

  const handleDemoFill = (account) => {
    setMode('login');
    setLoginForm({ email: account.email, password: account.password });
    setErrors({});
    setBanner({
      type: 'info',
      message: `Credenciales de prueba cargadas para ${account.name}. Pulsa "Iniciar Sesión".`
    });
  };

  // ==================== LOGIN (HU 2.1) ====================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const nextErrs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email.trim())) {
      nextErrs.email = 'Ingresa un correo electrónico con formato válido.';
    }
    if (!loginForm.password) {
      nextErrs.password = 'La contraseña es obligatoria.';
    }
    setErrors(nextErrs);
    if (Object.keys(nextErrs).length > 0) return;

    setLoading(true);
    setBanner(null);
    try {
      const res = await apiClient.login({
        email: loginForm.email.trim(),
        password: loginForm.password
      });
      saveSession(res.token, res.user);
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ==================== REGISTRO (HU 1.1) ====================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const nextErrs = {};
    if (registerForm.name.trim().length < 2) {
      nextErrs.name = 'El nombre debe tener entre 2 y 120 caracteres.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email.trim())) {
      nextErrs.email = 'El formato del correo electrónico no es válido.';
    }
    if (registerForm.password.length < 6) {
      nextErrs.password = 'La contraseña debe tener al menos 6 caracteres.';
    }
    setErrors(nextErrs);
    if (Object.keys(nextErrs).length > 0) return;

    setLoading(true);
    setBanner(null);
    try {
      const res = await apiClient.register({
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        bio: registerForm.bio.trim()
      });
      setIssuedTokenInfo({
        email: res.user?.email || registerForm.email.trim(),
        token: res.confirmationToken
      });
      setConfirmForm({
        email: res.user?.email || registerForm.email.trim(),
        token: res.confirmationToken || ''
      });
      setLoginForm({ email: registerForm.email.trim(), password: registerForm.password });
      setBanner({
        type: 'success',
        message: res.message || 'Cuenta creada. Confirma el token generado para activarla.'
      });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // ==================== CONFIRMAR CUENTA (HU 1.1) ====================
  const executeConfirm = async (emailVal, tokenVal) => {
    const nextErrs = {};
    if (!tokenVal.trim()) {
      nextErrs.token = 'El token de confirmación es obligatorio.';
    }
    setErrors(nextErrs);
    if (Object.keys(nextErrs).length > 0) return;

    setLoading(true);
    setBanner(null);
    try {
      await apiClient.confirmAccount({
        email: emailVal.trim() || null,
        token: tokenVal.trim()
      });
      setIssuedTokenInfo(null);
      setMode('login');
      setBanner({
        type: 'success',
        message: '¡Cuenta activada correctamente! Ahora inicia sesión con tu correo y contraseña.'
      });
    } catch (err) {
      setBanner({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = (e) => {
    e.preventDefault();
    executeConfirm(confirmForm.email, confirmForm.token);
  };

  return (
    <div className="split-auth">
      {/* Lado izquierdo: Identidad visual Resonance */}
      <section className="split-auth-visual">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" className="brand-mark">
            <span className="brand-bars" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </span>
            <span>RESONANCE</span>
          </Link>
          <Link to="/" className="btn-ghost btn-sm">
            <ArrowLeft size={15} /> Volver al inicio
          </Link>
        </div>

        <div style={{ maxWidth: 460 }}>
          <StatusBadge variant="accent" icon={Sparkles}>Workspace Musical en Tiempo Real</StatusBadge>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.12, marginTop: 18, letterSpacing: '-0.03em' }}>
            Tu música, tus salas Jam y tus comunidades en un solo lugar.
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 16, lineHeight: 1.65 }}>
            Conecta con el servidor Navidrome <span className="mono">musica.res0nance.pp.ua</span> y sincroniza cada
            compás en menos de 200 ms junto a tu equipo.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 28 }}>
            {[
              { icon: Radio, text: 'Reproductor continuo que nunca se corta al navegar.' },
              { icon: ShieldCheck, text: 'Cuentas verificadas con hash criptográfico en PostgreSQL 16.' }
            ].map((item) => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-bright)' }}>
                  <item.icon size={16} />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mono" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          Backend .NET 8 · PostgreSQL 16 · SignalR Hubs · Equipo 87
        </div>
      </section>

      {/* Lado derecho: Tarjeta Glassmorphism (#64) con Segmented Control (#43) */}
      <section className="split-auth-form">
        <div className="auth-glass-box">
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800 }}>
              {mode === 'login' ? 'Bienvenido de vuelta' : mode === 'register' ? 'Crea tu cuenta Resonance' : 'Confirma tu cuenta'}
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {mode === 'login'
                ? 'Inicia sesión para restaurar tu reproductor, playlists y salas.'
                : mode === 'register'
                ? 'Regístrate y recibe el token de activación al instante.'
                : 'Pega el token de verificación para activar tu cuenta.'}
            </p>
          </div>

          <SegmentedControl
            fullWidth
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'login', label: 'Entrar', icon: LogIn },
              { value: 'register', label: 'Crear Cuenta', icon: UserPlus },
              { value: 'confirm', label: 'Confirmar', icon: KeyRound }
            ]}
          />

          {banner && (
            <div className={`alert-banner ${banner.type}`} role="alert">
              {banner.type === 'success' ? <CheckCircle2 size={17} /> : <AlertCircle size={17} />}
              <span>{banner.message}</span>
            </div>
          )}

          {/* Tarjeta rápida de activación en 1 clic tras registrarse (HU 1.1) */}
          {issuedTokenInfo && (
            <div
              style={{
                padding: 14,
                borderRadius: 12,
                background: 'rgba(124, 58, 237, 0.14)',
                border: '1px solid var(--accent-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <div style={{ fontSize: '0.76rem', color: '#ddd6fe', fontWeight: 700 }}>
                Token de confirmación emitido por el servidor:
              </div>
              <code className="mono" style={{ fontSize: '0.76rem', wordBreak: 'break-all', color: '#fff', background: 'rgba(9,11,20,0.6)', padding: '8px 10px', borderRadius: 8 }}>
                {issuedTokenInfo.token}
              </code>
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={loading}
                onClick={() => executeConfirm(issuedTokenInfo.email, issuedTokenInfo.token)}
              >
                <CheckCircle2 size={15} /> Activar cuenta ahora (1 clic)
              </button>
            </div>
          )}

          {/* FORMULARIO 1: INICIAR SESIÓN */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="login-email">
                  <Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Correo electrónico
                </label>
                <input
                  id="login-email"
                  type="email"
                  className={`field-input ${errors.email ? 'has-error' : ''}`}
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  placeholder="nidus@resonance.pp.ua"
                  autoComplete="email"
                />
                {errors.email && <span className="field-error"><AlertCircle size={13} /> {errors.email}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="login-password">
                  <Lock size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Contraseña
                </label>
                <input
                  id="login-password"
                  type="password"
                  className={`field-input ${errors.password ? 'has-error' : ''}`}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                {errors.password && <span className="field-error"><AlertCircle size={13} /> {errors.password}</span>}
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
                <LogIn size={17} /> {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>

              {/* Selector rápido de cuentas demo del Equipo 87 */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 4 }}>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Acceso Rápido Demo · Equipo 87
                </div>
                <div className="demo-accounts-grid">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      className="demo-account-chip"
                      onClick={() => handleDemoFill(acc)}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-bright)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.7rem',
                          flexShrink: 0
                        }}
                      >
                        {acc.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div className="truncate" style={{ fontWeight: 700, color: '#fff' }}>{acc.name}</div>
                        <div className="truncate" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{acc.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* FORMULARIO 2: CREAR CUENTA (HU 1.1) */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 13 }} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="reg-name">
                  <User size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Nombre completo *
                </label>
                <input
                  id="reg-name"
                  className={`field-input ${errors.name ? 'has-error' : ''}`}
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  placeholder="Tu nombre"
                />
                {errors.name && <span className="field-error"><AlertCircle size={13} /> {errors.name}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-email">
                  <Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Correo electrónico *
                </label>
                <input
                  id="reg-email"
                  type="email"
                  className={`field-input ${errors.email ? 'has-error' : ''}`}
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="nombre@correo.com"
                />
                {errors.email && <span className="field-error"><AlertCircle size={13} /> {errors.email}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-pass">
                  <Lock size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                  Contraseña (mín. 6 caracteres) *
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  className={`field-input ${errors.password ? 'has-error' : ''}`}
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  placeholder="••••••••"
                />
                {errors.password && <span className="field-error"><AlertCircle size={13} /> {errors.password}</span>}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="reg-bio">Biografía (opcional)</label>
                <input
                  id="reg-bio"
                  className="field-input"
                  value={registerForm.bio}
                  onChange={(e) => setRegisterForm({ ...registerForm, bio: e.target.value })}
                  placeholder="Amante del rock alternativo y salas en vivo..."
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: 4 }}>
                <UserPlus size={17} /> {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
              </button>
            </form>
          )}

          {/* FORMULARIO 3: CONFIRMAR CUENTA CON TOKEN (HU 1.1) */}
          {mode === 'confirm' && (
            <form onSubmit={handleConfirmSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
              <div className="field-group">
                <label className="field-label" htmlFor="conf-email">Correo registrado (opcional)</label>
                <input
                  id="conf-email"
                  type="email"
                  className="field-input"
                  value={confirmForm.email}
                  onChange={(e) => setConfirmForm({ ...confirmForm, email: e.target.value })}
                  placeholder="nombre@correo.com"
                />
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor="conf-token">Token de confirmación *</label>
                <input
                  id="conf-token"
                  className={`field-input mono ${errors.token ? 'has-error' : ''}`}
                  value={confirmForm.token}
                  onChange={(e) => setConfirmForm({ ...confirmForm, token: e.target.value })}
                  placeholder="Pega aquí tu token hexadecimal..."
                />
                {errors.token && <span className="field-error"><AlertCircle size={13} /> {errors.token}</span>}
              </div>

              <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                <CheckCircle2 size={17} /> {loading ? 'Activando...' : 'Confirmar Cuenta'}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
