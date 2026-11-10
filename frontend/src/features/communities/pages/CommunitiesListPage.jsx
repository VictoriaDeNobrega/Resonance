import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Filter,
  Music2,
  Mic2,
  Radio,
  Sparkles,
  User
} from 'lucide-react';
import { communityApi } from '../services/communityApi';
import CommunityCard from '../components/CommunityCard';
import CreateCommunityModal from './CreateCommunityModal';

export default function CommunitiesListPage() {
  const [communities, setCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // '' = Todas, 'Genre', 'Artist'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Usuario activo en sesión (por defecto Victoria_Dev para probar el rol de creador)
  const [currentUsername, setCurrentUsername] = useState(() => {
    return localStorage.getItem('resonance_user') || 'Victoria_Dev';
  });

  useEffect(() => {
    loadCommunities();
  }, [categoryFilter]);

  const loadCommunities = async () => {
    try {
      setIsLoading(true);
      const data = await communityApi.getAll('', categoryFilter);
      setCommunities(data);
    } catch (err) {
      console.error('Error cargando comunidades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommunityCreated = (newCommunity) => {
    setCommunities((prev) => [newCommunity, ...prev]);
  };

  // Filtrado reactivo en memoria para búsqueda ultra-rápida (< 100ms)
  const filteredCommunities = communities.filter((c) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.categoryValue.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.creatorName && c.creatorName.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
      {/* Barra superior de cambio de usuario y navegación */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '32px',
          padding: '12px 20px',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          border: '1px solid var(--border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.85rem'
            }}
          >
            <Radio size={15} color="var(--accent)" />
            <span>Volver a Jam (Salas)</span>
          </Link>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
            Comunidades Musicales
          </span>
        </div>

        {/* Nombre de usuario en la parte superior derecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}
          >
            <User size={16} />
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
            {currentUsername}
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px', marginBottom: '32px' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid var(--border)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              color: 'var(--accent)',
              marginBottom: '12px'
            }}
          >
            <Sparkles size={15} />
            <span>Espacios Comunitarios por Género y Artista</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>
            Comunidades de Resonance
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '6px', maxWidth: '600px' }}>
            Explora grupos de melómanos dedicados a tus artistas favoritos o géneros preferidos, y comparte playlists comunitarias.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
          style={{ padding: '12px 22px', fontSize: '0.95rem' }}
        >
          <Plus size={18} />
          <span>Crear Comunidad</span>
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '28px'
        }}
      >
        {/* Input de Búsqueda */}
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '420px' }}>
          <Search
            size={17}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, género o artista..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Botones de Filtro por Categoría */}
        <div style={{ display: 'inline-flex', gap: '8px', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: '10px' }}>
          <button
            onClick={() => setCategoryFilter('')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: categoryFilter === '' ? 600 : 400,
              backgroundColor: categoryFilter === '' ? 'var(--bg-card)' : 'transparent',
              color: categoryFilter === '' ? 'var(--text-main)' : 'var(--text-muted)',
              border: categoryFilter === '' ? '1px solid var(--border)' : '1px solid transparent'
            }}
          >
            Todas
          </button>

          <button
            onClick={() => setCategoryFilter('Genre')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: categoryFilter === 'Genre' ? 600 : 400,
              backgroundColor: categoryFilter === 'Genre' ? 'var(--bg-card)' : 'transparent',
              color: categoryFilter === 'Genre' ? 'var(--text-main)' : 'var(--text-muted)',
              border: categoryFilter === 'Genre' ? '1px solid var(--border)' : '1px solid transparent'
            }}
          >
            <Music2 size={14} color={categoryFilter === 'Genre' ? 'var(--accent)' : 'currentColor'} />
            <span>Por Género</span>
          </button>

          <button
            onClick={() => setCategoryFilter('Artist')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: categoryFilter === 'Artist' ? 600 : 400,
              backgroundColor: categoryFilter === 'Artist' ? 'var(--bg-card)' : 'transparent',
              color: categoryFilter === 'Artist' ? 'var(--text-main)' : 'var(--text-muted)',
              border: categoryFilter === 'Artist' ? '1px solid var(--border)' : '1px solid transparent'
            }}
          >
            <Mic2 size={14} color={categoryFilter === 'Artist' ? 'var(--accent)' : 'currentColor'} />
            <span>Por Artista</span>
          </button>
        </div>
      </div>

      {/* Grid de Comunidades */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          Cargando comunidades musicales...
        </div>
      ) : filteredCommunities.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '24px'
          }}
        >
          {filteredCommunities.map((c) => (
            <CommunityCard key={c.id} community={c} />
          ))}
        </div>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px dashed var(--border)',
            borderRadius: '16px',
            padding: '50px 20px',
            textAlign: 'center'
          }}
        >
          <Users size={48} color="var(--accent)" style={{ margin: '0 auto 16px', opacity: 0.7 }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '8px' }}>
            No se encontraron comunidades
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            {searchTerm
              ? `No hay comunidades que coincidan con "${searchTerm}". Intenta con otro término o crea una nueva.`
              : 'Aún no hay comunidades registradas en esta categoría. ¡Sé el primero en crear una!'}
          </p>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            <span>Crear Comunidad Ahora</span>
          </button>
        </div>
      )}

      {/* Modal de Creación */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUserId={currentUsername}
        onCommunityCreated={handleCommunityCreated}
      />
    </div>
  );
}

