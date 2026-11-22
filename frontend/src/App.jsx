import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';

/**
 * Enrutador principal de la Capa WEB (Resonance.Web)
 * Cumple la invariante arquitectónica de máximo 3 páginas:
 * 1. LandingPage (/)
 * 2. LoginPage (/login)
 * 3. HomePage (/home y /rooms/:code — Workspace único de 4 paneles)
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/rooms/:code" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
