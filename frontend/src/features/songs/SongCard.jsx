import React from 'react';

export const SongCard = ({ song }) => {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="song-card-item" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      backgroundColor: '#242424',
      borderRadius: '6px',
      marginBottom: '8px'
    }}>
      <img 
        src={song.coverImageUrl || 'https://resonance.app/assets/default-song.png'} 
        alt={song.title} 
        style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }} 
      />
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>{song.title}</h4>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>
          {song.artist} • {song.album}
        </p>
      </div>
      <span style={{ fontSize: '0.8rem', color: '#888' }}>{song.genre}</span>
      <span style={{ fontSize: '0.85rem', color: '#aaa' }}>{formatDuration(song.durationInSeconds)}</span>
    </div>
  );
};
