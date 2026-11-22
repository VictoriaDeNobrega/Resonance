import React, { useEffect, useState } from 'react';
import {
  User, Mail, Lock, Image as ImageIcon, RefreshCw, Server, CheckCircle2,
  AlertCircle, Sparkles, Database
} from 'lucide-react';
import { apiClient, updateStoredUser } from '../api/apiClient';
import { SideDrawer, StatusBadge } from './CapaZeroUI';

/**
 * Panel Lateral de Perfil de Usuario y Servidores Musicales (HU 1.2 y HU 2.1)
 * - GET /api/auth/profile/{id} y PUT /api/auth/update/{id}
 * - Diagnóstico en vivo y sincronización de musica.res0nance.pp.ua / movil.res0nance.pp.ua
 */
export default function ProfileDrawer({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onCatalogSynced,
  onNotify
}) {
  const [profile, setProfile] = useState(user);
  const [form, setForm] = useState({
    name: '',
    email: '',
    avatarUrl: '',
    bio: '',
    currentPassword: '',
    newPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [syncingSource, setSyncingSource] = useState('');
  const [apiUrlInput, setApiUrlInput] = useState(apiClient.getApiBaseUrl());

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let mounted = true;

    apiClient.getProfile(user.id)
      .then((data) => {
        if (!mounted) return;
        setProfile(data);
        setForm({
          name: data.name || '',
          email: data.email || '',
          avatarUrl: data.avatarUrl || '',
          bio: data.bio || '',
          currentPassword: '',
          newPassword: ''
        });
      })
      .catch(() => {
        if (!mounted) return;
        setForm((prev) => ({
          ...prev,
          name: user.name || '',
          email: user.email || '',
          avatarUrl: user.avatarUrl || '',
          bio: user.bio || ''
        }));
      });

    apiClient.getServerStatus()
      .then((status) => mounted && setServerStatus(status))
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [isOpen, user]);

  const validate = () => {
    const next = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      next.name = 'El nombre debe tener al menos 2 caracteres.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Ingresa un correo electrónico válido.';
    }
    if (form.newPassword && form.newPassword.length < 6) {
      next.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validate() || !user?.id) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        avatarUrl: form.avatarUrl.trim(),
        bio: form.bio.trim(),
        ...(form.newPassword
          ? { currentPassword: form.currentPassword, newPassword: form.newPassword }
          : {})
      };
      const updated = await apiClient.updateProfile(user.id, payload);
      setProfile(updated);
      updateStoredUser(updated);
      onUserUpdated?.(updated);
      setForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
      onNotify?.('Perfil actualizado en PostgreSQL 16.', 'success');
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncServer = async (source) => {
    setSyncingSource(source);
    try {
      const res = await apiClient.syncMusicServer(source);
      onNotify?.(res.message || `Sincronizado (${res.totalCatalogCount} pistas).`, res.success ? 'success' : 'warning');
      const status = await apiClient.getServerStatus();
      setServerStatus(status);
      onCatalogSynced?.();
    } catch (err) {
      onNotify?.(err.message, 'error');
    } finally {
      setSyncingSource('');
    }
  };

  const handleApplyApiUrl = () => {
    const updatedUrl = apiClient.setApiBaseUrl(apiUrlInput);
    setApiUrlInput(updatedUrl);
    onNotify?.(`Endpoint API configurado en ${updatedUrl}`, 'info');
  };

  const avatarPreview = form.avatarUrl.trim()
    || `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(form.name || 'Resonance')}`;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      title="Mi Perfil y Servidores"
      subtitle="Edición de cuenta (HU 1.2) y sincronización Navidrome"
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Cerrar
          </button>
          <button type="submit" form="profile-edit-form" className="btn-primary btn-sm" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </>
      }
    >
      {/* Cabecera del usuario + KPIs */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={avatarPreview}
            alt={form.name || 'Avatar'}
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid var(--accent-light)',
              background: 'var(--bg-elevated)'
            }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ fontWeight: 700, fontSize: '1.05rem' }}>
              {profile?.name || user?.name}
            </div>
            <div className="truncate" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {profile?.email || user?.email}
            </div>
            <div style={{ marginTop: 6 }}>
              <StatusBadge variant="success" icon={CheckCircle2}>Cuenta verificada</StatusBadge>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            { label: 'Playlists', value: profile?.playlistsCount ?? 0 },
            { label: 'Favoritas', value: profile?.favoritesCount ?? 0 },
            { label: 'Comunidades', value: profile?.communitiesCount ?? 0 }
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                padding: '10px 8px',
                borderRadius: 10,
                background: 'rgba(9, 11, 20, 0.55)',
                border: '1px solid var(--border-subtle)',
                textAlign: 'center'
              }}
            >
              <div className="mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-bright)' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario de edición (HU 1.2) */}
      <form id="profile-edit-form" onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field-group">
          <label className="field-label" htmlFor="prof-name">
            <User size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Nombre completo
          </label>
          <input
            id="prof-name"
            className={`field-input ${errors.name ? 'has-error' : ''}`}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tu nombre visible"
          />
          {errors.name && <span className="field-error"><AlertCircle size={13} /> {errors.name}</span>}
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="prof-email">
            <Mail size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
            Correo electrónico
          </label>
          <input
            id="prof-email"
            type="email"
            className={`field-input ${errors.email ? 'has-error' : ''}`}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {errors.email && <span className="field-error"><AlertCircle size={13} /> {errors.email}</span>}
        </div>

        <div className="field-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="field-label" htmlFor="prof-avatar">
              <ImageIcon size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} />
              URL de Avatar
            </label>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() =>
                setForm({
                  ...form,
                  avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(`${form.name}-${Date.now() % 999}`)}`
                })
              }
            >
              <Sparkles size={13} /> Generar
            </button>
          </div>
          <input
            id="prof-avatar"
            className="field-input"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="prof-bio">Biografía musical</label>
          <textarea
            id="prof-bio"
            className="field-textarea"
            maxLength={500}
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Cuéntale a la comunidad qué géneros escuchas..."
          />
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="prof-cur-pw">
              <Lock size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />
              Clave actual
            </label>
            <input
              id="prof-cur-pw"
              type="password"
              className="field-input"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="prof-new-pw">Nueva contraseña</label>
            <input
              id="prof-new-pw"
              type="password"
              className={`field-input ${errors.newPassword ? 'has-error' : ''}`}
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="Mín. 6 chars"
            />
          </div>
          {errors.newPassword && (
            <span className="field-error" style={{ gridColumn: '1 / -1' }}>
              <AlertCircle size={13} /> {errors.newPassword}
            </span>
          )}
        </div>
      </form>

      {/* Estado de Servidores Musicales Navidrome / Subsonic */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '0.9rem' }}>
            <Server size={16} color="#a78bfa" />
            Servidores Musicales res0nance.pp.ua
          </div>
          {serverStatus && (
            <StatusBadge variant="accent">
              {serverStatus.syncedSongsInDatabase}/{serverStatus.totalSongsInDatabase} pistas
            </StatusBadge>
          )}
        </div>

        {serverStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[serverStatus.primary, serverStatus.mobile].filter(Boolean).map((ep) => (
              <div
                key={ep.baseUrl}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(9, 11, 20, 0.55)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{ep.name}</div>
                  <div className="mono truncate" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {ep.baseUrl}
                  </div>
                </div>
                <StatusBadge variant={ep.isOnline ? 'success' : 'danger'} dot>
                  {ep.isOnline ? `${ep.latencyMs}ms` : 'Offline'}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Consultando estado de servidores...</div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ flex: 1 }}
            disabled={Boolean(syncingSource)}
            onClick={() => handleSyncServer('primary')}
          >
            <RefreshCw size={14} />
            {syncingSource === 'primary' ? 'Sincronizando...' : 'Sync Principal (Móvil)'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ flex: 1 }}
            disabled={Boolean(syncingSource)}
            onClick={() => handleSyncServer('mobile')}
          >
            <RefreshCw size={14} />
            {syncingSource === 'mobile' ? 'Sincronizando...' : 'Sync Secundario (Música)'}
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            disabled={Boolean(syncingSource)}
            onClick={() => handleSyncServer('both')}
          >
            Ambos
          </button>
        </div>

        {/* Configuración opcional de Backend URL */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="field-label" htmlFor="api-url-cfg" style={{ fontSize: '0.74rem' }}>
            <Database size={12} style={{ verticalAlign: '-2px', marginRight: 5 }} />
            Backend API URL (.NET 8)
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              id="api-url-cfg"
              className="field-input mono"
              style={{ fontSize: '0.76rem', padding: '7px 10px' }}
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
            />
            <button type="button" className="btn-secondary btn-sm" onClick={handleApplyApiUrl}>
              Aplicar
            </button>
          </div>
        </div>
      </div>
    </SideDrawer>
  );
}
