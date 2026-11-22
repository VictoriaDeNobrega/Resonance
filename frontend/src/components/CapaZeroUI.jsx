import React, { useEffect, useState } from 'react';
import {
  X, Check, AlertCircle, CheckCircle2, Info, AlertTriangle, Music2
} from 'lucide-react';
import { getFallbackStreamUrl } from '../api/navidromeClient';

/**
 * Formatea segundos a mm:ss
 */
export function formatDuration(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${mins}:${String(rem).padStart(2, '0')}`;
}

/**
 * Formatea fecha ISO a texto legible en español
 */
export function formatRelativeDate(isoDate) {
  if (!isoDate) return '';
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/**
 * Imagen de portada con fallback automático musica <-> movil.res0nance.pp.ua y placeholder elegante.
 */
export function CoverArtwork({ src, alt = 'Portada', size = 48, radius = 10, className = '', style = {} }) {
  const [imgSrc, setImgSrc] = useState(src || '');
  const [triedFallback, setTriedFallback] = useState(false);
  const [broken, setBroken] = useState(!src);

  useEffect(() => {
    setImgSrc(src || '');
    setTriedFallback(false);
    setBroken(!src);
  }, [src]);

  const handleError = () => {
    if (!triedFallback && imgSrc) {
      const altUrl = getFallbackStreamUrl(imgSrc);
      if (altUrl && altUrl !== imgSrc) {
        setTriedFallback(true);
        setImgSrc(altUrl);
        return;
      }
    }
    setBroken(true);
  };

  const dims = size === 'fill'
    ? { width: '100%', height: '100%' }
    : { width: size, height: size, minWidth: size, minHeight: size };

  if (broken || !imgSrc) {
    return (
      <div
        className={className}
        style={{
          ...dims,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #251a52 0%, #14182a 100%)',
          border: '1px solid rgba(139, 92, 246, 0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a78bfa',
          flexShrink: 0,
          ...style
        }}
        aria-label={alt}
      >
        <Music2 size={size === 'fill' ? 36 : Math.max(16, Math.round(size * 0.42))} strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      onError={handleError}
      className={className}
      style={{
        ...dims,
        borderRadius: radius,
        objectFit: 'cover',
        flexShrink: 0,
        display: 'block',
        ...style
      }}
    />
  );
}

/**
 * #29 StatusBadge — Etiqueta de estado con punto animado opcional
 */
export function StatusBadge({ children, variant = 'neutral', dot = false, pulse = false, icon: Icon }) {
  return (
    <span className={`status-badge ${variant}`}>
      {dot && <span className={`status-dot ${pulse ? 'pulse' : ''}`} />}
      {Icon && <Icon size={13} strokeWidth={2} />}
      {children}
    </span>
  );
}

/**
 * #30 FilterChips — Pastillas seleccionables con check activo
 */
export function FilterChips({ options = [], selected, onSelect, allLabel = 'Todos' }) {
  return (
    <div className="filter-chips-row" role="tablist" aria-label="Filtros por género">
      {allLabel && (
        <button
          type="button"
          className={`filter-chip ${!selected || selected === 'ALL' ? 'active' : ''}`}
          onClick={() => onSelect('ALL')}
        >
          {(!selected || selected === 'ALL') && <Check size={14} strokeWidth={2.2} />}
          {allLabel}
        </button>
      )}
      {options.map((opt) => {
        const value = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        const active = selected === value;
        return (
          <button
            key={value}
            type="button"
            className={`filter-chip ${active ? 'active' : ''}`}
            onClick={() => onSelect(value)}
          >
            {active && <Check size={14} strokeWidth={2.2} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * #28 TabsBar — Pestañas con indicador inferior luminoso
 */
export function TabsBar({ tabs = [], activeTab, onChange }) {
  return (
    <div className="tabs-bar" role="tablist">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`tab-item ${active ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {Icon && <Icon size={16} strokeWidth={1.75} />}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="status-badge neutral" style={{ padding: '1px 7px', fontSize: '0.7rem' }}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * #43 SegmentedControl — Selector de opciones pegadas
 */
export function SegmentedControl({ options = [], value, onChange, fullWidth = false }) {
  return (
    <div className={`segmented-control ${fullWidth ? 'full-width' : ''}`} role="tablist">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`segmented-option ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {Icon && <Icon size={15} strokeWidth={1.8} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * #31 ToggleSwitch — Interruptor animado
 */
export function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div
      className="toggle-switch"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className={`toggle-track ${checked ? 'on' : ''}`}>
        <div className="toggle-knob" />
      </div>
      <div>
        {label && <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{label}</div>}
        {description && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{description}</div>}
      </div>
    </div>
  );
}

/**
 * #36 AvatarStack — Avatares superpuestos con burbuja de conteo
 */
export function AvatarStack({ names = [], badgeText, maxVisible = 4 }) {
  const palette = ['#7c3aed', '#4f46e5', '#9333ea', '#2563eb', '#0d9488'];
  const visible = names.slice(0, maxVisible);

  return (
    <div className="avatar-stack">
      {visible.map((name, idx) => {
        const initials = String(name || 'U')
          .split(' ')
          .map((w) => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();
        return (
          <span
            key={`${name}-${idx}`}
            className="avatar-stack-item"
            title={name}
            style={{ background: palette[idx % palette.length] }}
          >
            {initials}
          </span>
        );
      })}
      {badgeText && <span className="avatar-stack-badge">{badgeText}</span>}
    </div>
  );
}

/**
 * #33 SkeletonLoader — Bloques de carga animados con shimmer
 */
export function SkeletonLoader({ variant = 'cards', count = 4 }) {
  if (variant === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 58, width: '100%' }} />
        ))}
      </div>
    );
  }
  return (
    <div className="media-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 224, width: '100%', borderRadius: 16 }} />
      ))}
    </div>
  );
}

/**
 * #34 EmptyState — Estado vacío amigable con llamada a la acción primaria
 */
export function EmptyState({ icon: Icon = Music2, title, description, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn-primary btn-sm" onClick={onAction} style={{ marginTop: 6 }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * #23 ModalDialog — Diálogo modal con cierre por Escape y backdrop difuminado
 */
export function ModalDialog({ isOpen, onClose, title, subtitle, children, footer, wide = false }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`modal-card ${wide ? 'wide' : ''}`}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar ventana">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Confirmación destructiva sobre #23 ModalDialog
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Eliminar',
  loading = false
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button type="button" className="btn-danger btn-sm" onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
    </ModalDialog>
  );
}

/**
 * #25 SideDrawer — Panel deslizable desde la derecha con footer fijo
 */
export function SideDrawer({ isOpen, onClose, title, subtitle, children, footer }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside className="drawer-panel">
        <div className="drawer-header">
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{title}</h2>
            {subtitle && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                {subtitle}
              </p>
            )}
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Cerrar panel">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </aside>
    </div>
  );
}

/**
 * #22 ToastContainer — Notificaciones efímeras en la esquina inferior derecha
 */
export function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  const iconFor = (type) => {
    if (type === 'success') return <CheckCircle2 size={18} color="#10b981" strokeWidth={2} />;
    if (type === 'error') return <AlertCircle size={18} color="#f43f5e" strokeWidth={2} />;
    if (type === 'warning') return <AlertTriangle size={18} color="#f59e0b" strokeWidth={2} />;
    return <Info size={18} color="#a78bfa" strokeWidth={2} />;
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item ${t.type || 'info'}`}>
          {iconFor(t.type)}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            className="btn-icon"
            style={{ width: 26, height: 26 }}
            onClick={() => onDismiss?.(t.id)}
            aria-label="Descartar notificación"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * #61 CountUp — Animación numérica progresiva para métricas
 */
export function CountUp({ value = 0, duration = 1100, decimals = 0, suffix = '' }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const startTime = performance.now();
    let frameId;

    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString('es-ES');

  return (
    <span>
      {formatted}
      {suffix}
    </span>
  );
}
