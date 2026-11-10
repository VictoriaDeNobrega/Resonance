import React from 'react';
import { ListMusic, Trash2, Disc3 } from 'lucide-react';

export default function PlaylistCard({ playlist, isCreator, onRemove }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '140px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
        {playlist.coverUrl ? (
          <img
            src={playlist.coverUrl}
            alt={`Portada de playlist ${playlist.playlistTitle}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <Disc3 size={48} strokeWidth={1.5} />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'rgba(10, 11, 16, 0.85)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: 'var(--text-main)'
          }}
        >
          <ListMusic size={13} color="var(--accent)" />
          <span>{playlist.songCount || 0} canciones</span>
        </div>
      </div>

      <div style={{ padding: '14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h4
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: '4px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={playlist.playlistTitle}
        >
          {playlist.playlistTitle}
        </h4>

        {playlist.description && (
          <p
            style={{
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              marginBottom: '10px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              flex: 1
            }}
          >
            {playlist.description}
          </p>
        )}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <span>Agregada por: <strong style={{ color: 'var(--text-main)' }}>{playlist.addedBy}</strong></span>

          {isCreator && onRemove && (
            <button
              onClick={() => onRemove(playlist.playlistId)}
              title="Quitar playlist de la comunidad"
              aria-label={`Quitar playlist ${playlist.playlistTitle}`}
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                padding: '4px',
                borderRadius: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s ease, background 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--danger)';
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

