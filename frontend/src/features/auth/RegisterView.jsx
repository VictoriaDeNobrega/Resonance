import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from './services/authApi';
import './auth.css';

export default function RegisterView({ onRegisterSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMsg('');
    setIsSubmitting(true);

    try {
      await registerUser({
        ...form,
        name: form.name.trim(),
        email: form.email.trim()
      });
      if (onRegisterSuccess) {
        onRegisterSuccess();
      } else {
        navigate('/login', { state: { message: '¡Cuenta creada con éxito! Ya puedes iniciar sesión.' } });
      }
    } catch (error) {
      setMsg(error.message || 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Crear Cuenta</h1>
        <p className="auth-description">Regístrate para guardar tu perfil en Resonance.</p>
        {msg && <p className="auth-message auth-message-error" role="alert">{msg}</p>}

        <label className="auth-field">
          Nombre
          <input
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={100}
            required
          />
        </label>

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
            autoComplete="new-password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            minLength={8}
            required
          />
          <span className="auth-hint">Debe tener al menos 8 caracteres.</span>
        </label>

        <button className="btn-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando cuenta…' : 'Registrarse'}
        </button>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
        <Link className="auth-back-link" to="/">Volver al inicio</Link>
      </form>
    </main>
  );
}
