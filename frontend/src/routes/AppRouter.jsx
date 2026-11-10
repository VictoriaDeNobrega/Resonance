import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Importaciones de las páginas de los demás módulos (Sebastián, Luis)
import HomePage from '../pages/HomePage';
import RoomView from '../features/rooms/pages/RoomView';
import RegisterView from '../features/auth/RegisterView';
import LoginView from '../features/auth/LoginView';
import EditProfileView from '../features/auth/EditProfileView';

// Importación de tu módulo (Gabriel - Catálogo y Reproductor Web)
import { SongCatalogPage } from '../features/songs/pages/SongCatalogPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page principal (Sebastián) */}
        <Route path="/" element={<HomePage />} />
        
        {/* Tu módulo de Catálogo de Música (Gabriel) */}
        <Route path="/catalog" element={<SongCatalogPage />} />
        
        {/* Módulo de Autenticación (Luis) */}
        <Route path="/register" element={<RegisterView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/profile" element={<EditProfileView />} />
        
        {/* Módulo de Salas Jam (Sebastián) */}
        <Route path="/rooms/:code" element={<RoomView />} />
      </Routes>
    </BrowserRouter>
  );
}