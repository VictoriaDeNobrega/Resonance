import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { updateUser } from './services/authApi';
import './auth.css';

function getStoredUser() {
  try {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export default function EditProfileView({ user: currentUser, onUpdateSuccess }) {
  const [user, setUser] = useState(() => currentUser || getStoredUser());
  const [form, setForm] = useState(() => ({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    currentPassword: '',
    newPassword: ''
  }));
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
      setForm((previous) => ({
        ...previous,
        name: currentUser.name,
        email: currentUser.email
      }));
    }
  }, [currentUser]);

  if (!user?.userId) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMsg('');
    setIsSubmitting(true);

    try {
      const data = await updateUser(user.userId, {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        newPassword: form.newPassword || null
      });
      const updatedUser = { ...user, name: data.name, email: data.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      localStorage.setItem('resonance_user', data.name);
      setUser(updatedUser);
      setForm((previous) => ({ ...previous, currentPassword: '', newPassword: '' }));
      setIsError(false);
      setMsg(data.message || '¡Perfil actualizado correctamente!');
      onUpdateSuccess?.(updatedUser);
    } catch (error) {
      setIsError(true);
      setMsg(error.message || 'No se pudo actualizar el perfil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Editar Perfil</h1>
        <p className="auth-description">Actualiza los datos de tu cuenta.</p>
        {msg && (
          <p className={`auth-message ${isError ? 'auth-message-error' : 'auth-message-success'}`} role="status">
            {msg}
          </p>
        )}

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

        <hr className="auth-divider" />
        <p className="auth-section-label">Confirma tu contraseña para guardar cambios.</p>

        <label className="auth-field">
          Contraseña actual
          <input
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            required
          />
        </label>

        <label className="auth-field">
          Nueva contraseña <span className="auth-optional">(opcional)</span>
          <input
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            minLength={8}
          />
          <span className="auth-hint">Si la cambias, debe tener al menos 8 caracteres.</span>
        </label>

        <button className="btn-primary auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar Cambios'}
        </button>

        <Link className="auth-back-link" to="/">Volver al inicio</Link>
      </form>
    </main>
  );
}
