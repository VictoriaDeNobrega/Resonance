import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ListMusic, Music2, Mic2 } from 'lucide-react';

export default function CommunityCard({ community }) {
  const isArtist = community.categoryType?.toLowerCase() === 'artist';

  return (
    <Link
      to={`/communities/${community.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.boxShadow = '0 8px 24px var(--accent-glow)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div
        style={{
          height: '130px',
          backgroundColor: 'var(--bg-secondary)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {community.bannerUrl ? (
          <img
            src={community.bannerUrl}
            alt={`Banner de ${community.name}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: isArtist
                ? 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)'
                : 'linear-gradient(135deg, #2e1065 0%, #581c87 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8
            }}
          >
            {isArtist ? <Mic2 size={40} color="#c7d2fe" /> : <Music2 size={40} color="#e9d5ff" />}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            backgroundColor: 'rgba(10, 11, 16, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '3px 10px',
            fontSize: '0.725rem',
            fontWeight: 600,
            color: isArtist ? '#a5b4fc' : '#c084fc',
            backdropFilter: 'blur(4px)'
          }}
        >
          {isArtist ? <Mic2 size={12} /> : <Music2 size={12} />}
          <span>{isArtist ? 'Artista' : 'Género'}: {community.categoryValue}</span>
        </div>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h3
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            marginBottom: '6px',
            color: 'var(--text-main)',
            lineHeight: 1.3
          }}
        >
          {community.name}
        </h3>

        <p
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            marginBottom: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            flex: 1
          }}
        >
          {community.description || 'Sin descripción disponible.'}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Users size={14} color="var(--accent)" />
              {community.memberCount || 1} miembros
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ListMusic size={14} color="var(--accent)" />
              {community.playlists ? community.playlists.length : 0} playlists
            </span>
          </div>

          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
            por {community.creatorName || community.creatorId}
          </span>
        </div>
      </div>
    </Link>
  );
}

