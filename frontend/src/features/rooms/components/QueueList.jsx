import React, { useState } from 'react';
import { ListMusic, Plus, Music } from 'lucide-react';
import { LOCAL_TRACKS } from '../../songs/data/localTracks';
import { resolveAudioUrl } from '../../../config/serverConfig';

export default function QueueList({ queue, onAddToQueue }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedLocalTrack, setSelectedLocalTrack] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');

  const handleSelectLocalTrack = (trackId) => {
    setSelectedLocalTrack(trackId);
    if (!trackId) {
      setTitle('');
      setArtist('');
      setUrl('');
      return;
    }
    const found = LOCAL_TRACKS.find((t) => t.id === trackId);
    if (found) {
      setTitle(found.title);
      setArtist(found.artist);
      setUrl(resolveAudioUrl(found.url));
    }
  };

  const handleAddSong = (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    onAddToQueue({
      songId: 'song_' + Date.now(),
      title: title.trim(),
      artist: artist.trim() || 'Artista Desconocido',
      url: resolveAudioUrl(url.trim()),
      durationSeconds: 210,
      addedBy: 'Tú'
    });

    setTitle('');
    setArtist('');
    setUrl('');
    setSelectedLocalTrack('');
    setShowAddForm(false);
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ListMusic size={18} color="var(--accent)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Cola Compartida ({queue.length})</h3>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-secondary"
          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
        >
          <Plus size={14} /> Añadir
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSong} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
              Elegir de la carpeta local de música:
            </label>
            <select
              value={selectedLocalTrack}
              onChange={(e) => handleSelectLocalTrack(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'white',
                fontSize: '0.8rem'
              }}
            >
              <option value="">-- O escribir canción personalizada --</option>
              {LOCAL_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} - {t.artist}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            placeholder="Título de la canción"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white', fontSize: '0.8rem' }}
          />
          <input
            type="text"
            placeholder="Artista"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white', fontSize: '0.8rem' }}
          />
          <input
            type="text"
            placeholder="URL del audio (MP3 o ruta local)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'white', fontSize: '0.8rem' }}
          />
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', flex: 1 }}>Guardar en Cola</button>
            <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: '0.75rem' }}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {queue.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', margin: 'auto' }}>
            No hay canciones en la cola. ¡Añade una para que suene después!
          </p>
        ) : (
          queue.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            >
              <Music size={16} color="var(--text-muted)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.artist}</div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', backgroundColor: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                #{idx + 1}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
