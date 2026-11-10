import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from './services/authApi';
import './auth.css';

export default function LoginView({ onLoginSuccess }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [msg, setMsg] = useState(location.state?.message || '');
  const [isSuccessMessage, setIsSuccessMessage] = useState(Boolean(location.state?.message));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMsg('');
    setIsSuccessMessage(false);
    setIsSubmitting(true);

    try {
      const data = await loginUser({ ...form, email: form.email.trim() });
      localStorage.setItem('user', JSON.stringify(data));
      localStorage.setItem('resonance_user', data.name);
      if (onLoginSuccess) {
        onLoginSuccess(data);
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      setMsg(error.message || 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Iniciar Sesión</h1>
        <p className="auth-description">Entra a tu cuenta para continuar.</p>
        {msg && (
          <p
            className={`auth-message ${isSuccessMessage ? 'auth-message-success' : 'auth-message-error'}`}
            role="status"
          >
            {msg}
          </p>
        )}

        <label className="auth-field">
          Correo
          <input
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            maxLength={150}
            required
          />
        </label>

        <label className="auth-field">
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>

        <button className="btn-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Ingresando…' : 'Entrar'}
        </button>

        <p className="auth-footer">
          ¿Aún no tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
        <Link className="auth-back-link" to="/">Volver al inicio</Link>
      </form>
    </main>
  );
}
