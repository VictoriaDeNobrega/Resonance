import React from 'react';

export const SongFilters = ({ filters, setFilters }) => {
  // Función que actualiza el estado cuando el usuario escribe algo
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      <input
        type="text"
        name="searchTerm"
        placeholder="Buscar por nombre..."
        value={filters.searchTerm}
        onChange={handleChange}
      />
      <input
        type="text"
        name="artist"
        placeholder="Artista..."
        value={filters.artist}
        onChange={handleChange}
      />
      <input
        type="text"
        name="album"
        placeholder="Álbum..."
        value={filters.album}
        onChange={handleChange}
      />
    </div>
  );
};