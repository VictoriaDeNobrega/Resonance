import React, { useState } from 'react';
import { axiosClient } from '../../api/axiosClient';

export const CreatePlaylistForm = () => {
  const [name, setName] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validacion cliente
    if (!name.trim()) {
      setError('El nombre de la playlist es obligatorio.');
      return;
    }

    try {
      const response = await axiosClient.post('/playlists', { name, coverImageUrl });
      setSuccess(`Playlist "${response.data.name}" creada exitosamente.`);
      setName('');
      setCoverImageUrl('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear la playlist.');
    }
  };

  return (
    <div className="feature-box">
      <h3>Crear Playlist Personal</h3>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <input 
          type="text" 
          placeholder="Nombre de la playlist" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
        />
        <input 
          type="url" 
          placeholder="URL Portada (opcional)" 
          value={coverImageUrl} 
          onChange={(e) => setCoverImageUrl(e.target.value)} 
        />
        <button type="submit">Crear</button>
      </form>
    </div>
  );
};
