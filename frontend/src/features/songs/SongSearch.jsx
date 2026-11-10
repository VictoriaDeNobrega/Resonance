import React, { useState, useEffect } from 'react';
import { axiosClient } from '../../api/axiosClient';
import { SongCard } from './SongCard';

export const SongSearch = () => {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [sortBy, setSortBy] = useState('relevance');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get('/songs/search', {
          params: { query, genre, sortBy, page, pageSize: 10 }
        });
        setResults(response.data.items || []);
        setTotalPages(response.data.totalPages || 1);
      } catch (err) {
        console.error('Error al realizar la búsqueda:', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce para evitar sobrecargar la API al escribir
    const timer = setTimeout(fetchResults, 300);
    return () => clearTimeout(timer);
  }, [query, genre, sortBy, page]);

  return (
    <div className="feature-container" style={{ padding: '16px', backgroundColor: '#181818', borderRadius: '8px' }}>
      <h3>Búsqueda de Canciones</h3>
      
      {/* Filtros de búsqueda */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por canción, artista o álbum..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#282828', color: '#fff' }}
        />
        
        <select 
          value={genre} 
          onChange={(e) => { setGenre(e.target.value); setPage(1); }}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#282828', color: '#fff' }}
        >
          <option value="">Todos los géneros</option>
          <option value="Rock">Rock</option>
          <option value="Pop">Pop</option>
          <option value="Electronic">Electronic</option>
          <option value="Lo-Fi">Lo-Fi</option>
          <option value="Acoustic">Acoustic</option>
        </select>

        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #444', backgroundColor: '#282828', color: '#fff' }}
        >
          <option value="relevance">Relevancia</option>
          <option value="popular">Más escuchadas</option>
          <option value="recent">Más recientes</option>
        </select>
      </div>

      {/* Listado de resultados */}
      {loading ? (
        <p style={{ color: '#aaa' }}>Cargando catálogo...</p>
      ) : results.length === 0 ? (
        <p style={{ color: '#888' }}>No se encontraron coincidencias.</p>
      ) : (
        <div>
          {results.map((song) => (
            <SongCard key={song.id} song={song} />
          ))}

          {/* Controles de paginación */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
              <button 
                disabled={page === 1} 
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Anterior
              </button>
              <span style={{ color: '#aaa', alignSelf: 'center' }}>Página {page} de {totalPages}</span>
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
