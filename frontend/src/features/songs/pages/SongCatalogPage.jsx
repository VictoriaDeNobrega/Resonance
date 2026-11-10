import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom'; // Importamos Link para la navegación
import { songsApi } from '../api/songsApi';
import { SongFilters } from '../components/SongFilters';

export const SongCatalogPage = () => {
  const [songs, setSongs] = useState([]);
  const [filters, setFilters] = useState({ searchTerm: '', artist: '', album: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSongs = async () => {
      setLoading(true);
      try {
        const data = await songsApi.getFilteredSongs(filters);
        setSongs(data);
      } catch (error) {
        console.error("Error al obtener el catálogo de canciones:", error);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => { fetchSongs(); }, 300);
    return () => clearTimeout(delayDebounce);
  }, [filters]);

  return (
    <div className="song-catalog-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* HEADER: Banner de Autenticación a la izquierda y Título centrado */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '2rem',
        borderBottom: '1px solid #eaeaea',
        paddingBottom: '1rem'
      }}>
        
        {/* Lado Superior Izquierdo: Banner / Botón de Inicio de Sesión */}
        <div style={{ marginRight: 'auto' }}>
          <Link to="/login" style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#1db954', // Verde estilo Spotify/Música
            color: 'white',
            textDecoration: 'none',
            borderRadius: '20px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            👤 Iniciar Sesión
          </Link>
        </div>

        {/* Título de la Página (Empujado ligeramente al centro-derecha por el flex) */}
        <div>
          <h1 style={{ fontSize: '2rem', color: '#333', margin: 0 }}>🎵 Resonance</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0' }}>Explora el Catálogo Musical</p>
        </div>

      </header>

      {/* Componente de búsqueda y filtros */}
      <SongFilters filters={filters} setFilters={setFilters} />

      {/* Listado de resultados */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Cargando canciones...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
          {songs.length > 0 ? (
            songs.map(song => (
              <div key={song.id} style={{ border: '1px solid #e1e1e1', borderRadius: '10px', padding: '1rem', background: '#fff' }}>
                <img 
                  src={song.coverUrl || 'https://via.placeholder.com/150'} 
                  alt={song.title} 
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px' }} 
                />
                <h3 style={{ fontSize: '1.1rem', margin: '12px 0 6px 0' }}>{song.title}</h3>
                <p style={{ margin: '0 0 4px 0', color: '#555' }}>{song.artist}</p>
                <small style={{ color: '#888' }}>Álbum: {song.album}</small>
              </div>
            ))
          ) : (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#777' }}>
              No se encontraron canciones.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SongCatalogPage;