import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, Loader2, Music2, Mic2 } from 'lucide-react';
import { communityApi } from '../services/communityApi';

export default function CreateCommunityModal({
  isOpen,
  onClose,
  currentUserId,
  onCommunityCreated
}) {
  const [name, setName] = useState('');
  const [categoryType, setCategoryType] = useState('Genre');
  const [categoryValue, setCategoryValue] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', categoryValue: '' });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    const newFieldErrors = { name: '', categoryValue: '' };

    if (!name.trim()) {
      newFieldErrors.name = 'El campo Nombre no puede estar vacío.';
      setFieldErrors(newFieldErrors);
      setErrorMessage('El campo Nombre no puede estar vacío.');
      return;
    }

    if (!categoryValue.trim()) {
      const label = categoryType === 'Artist' ? 'Artista' : 'Género';
      newFieldErrors.categoryValue = `El campo ${label} no puede estar vacío.`;
      setFieldErrors(newFieldErrors);
      setErrorMessage(`El campo ${label} no puede estar vacío.`);
      return;
    }

    setFieldErrors({ name: '', categoryValue: '' });

    try {
      setIsLoading(true);

      // Verificación previa de nombres duplicados
      const isAvailable = await communityApi.checkName(name.trim());
      if (!isAvailable) {
        setErrorMessage(`Ya existe una comunidad con el nombre '${name.trim()}'. Por favor elige otro nombre.`);
        setIsLoading(false);
        return;
      }

      const created = await communityApi.create({
        name: name.trim(),
        categoryType,
        categoryValue: categoryValue.trim(),
        description: description.trim(),
        bannerUrl: bannerUrl.trim() || null,
        creatorId: currentUserId || 'Usuario_Comunidad',
        creatorName: currentUserId || 'Usuario de Resonance'
      });

      onCommunityCreated(created);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Error al crear la comunidad. Inténtalo nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-community-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="create-community-title" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Crear Nueva Comunidad
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Crea un espacio temático para fans de un género o artista
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px' }}>
          {errorMessage && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fee2e2',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '18px',
                fontWeight: 500
              }}
            >
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Campo Nombre */}
            <div>
              <label
                htmlFor="new-community-name"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Nombre de la Comunidad <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="new-community-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: '' });
                }}
                aria-invalid={!!fieldErrors.name}
                aria-describedby={fieldErrors.name ? 'create-error-name' : undefined}
                placeholder="ej. Club Synthwave Caracas"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: fieldErrors.name ? '1px solid #ef4444' : '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
              {fieldErrors.name && (
                <span
                  id="create-error-name"
                  role="alert"
                  style={{ display: 'block', color: '#f87171', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}
                >
                  {fieldErrors.name}
                </span>
              )}
            </div>

            {/* Clasificación */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}>
                Tipo de Comunidad <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCategoryType('Genre')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: categoryType === 'Genre' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: categoryType === 'Genre' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                    color: categoryType === 'Genre' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: categoryType === 'Genre' ? 600 : 400
                  }}
                >
                  <Music2 size={16} color={categoryType === 'Genre' ? 'var(--accent)' : 'currentColor'} />
                  <span>Por Género Musical</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryType('Artist')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: categoryType === 'Artist' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: categoryType === 'Artist' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-secondary)',
                    color: categoryType === 'Artist' ? 'var(--text-main)' : 'var(--text-muted)',
                    fontWeight: categoryType === 'Artist' ? 600 : 400
                  }}
                >
                  <Mic2 size={16} color={categoryType === 'Artist' ? 'var(--accent)' : 'currentColor'} />
                  <span>Por Artista</span>
                </button>
              </div>
            </div>

            {/* Valor de Género o Artista */}
            <div>
              <label
                htmlFor="new-category-value"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                {categoryType === 'Artist' ? 'Artista Asociado' : 'Género Asociado'}{' '}
                <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                id="new-category-value"
                type="text"
                value={categoryValue}
                onChange={(e) => {
                  setCategoryValue(e.target.value);
                  if (fieldErrors.categoryValue) setFieldErrors({ ...fieldErrors, categoryValue: '' });
                }}
                aria-invalid={!!fieldErrors.categoryValue}
                aria-describedby={fieldErrors.categoryValue ? 'create-error-cat' : undefined}
                placeholder={categoryType === 'Artist' ? 'ej. Radiohead, Rosalía, Kendrick Lamar...' : 'ej. Shoegaze, Hyperpop, Lo-Fi...'}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: fieldErrors.categoryValue ? '1px solid #ef4444' : '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
              {fieldErrors.categoryValue && (
                <span
                  id="create-error-cat"
                  role="alert"
                  style={{ display: 'block', color: '#f87171', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500 }}
                >
                  {fieldErrors.categoryValue}
                </span>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label
                htmlFor="new-community-desc"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                Descripción (opcional)
              </label>
              <textarea
                id="new-community-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Comparte de qué trata esta comunidad y qué encontrarán los miembros..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  resize: 'none'
                }}
              />
            </div>

            {/* Portada */}
            <div>
              <label
                htmlFor="new-banner-url"
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main)' }}
              >
                URL de Portada / Banner (opcional)
              </label>
              <input
                id="new-banner-url"
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem'
                }}
              />
            </div>
          </div>

          {/* Footer con Acciones */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="btn-secondary"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Creando comunidad...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Crear Comunidad</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

