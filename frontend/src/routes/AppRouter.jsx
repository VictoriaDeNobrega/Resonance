import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomView from '../features/rooms/pages/RoomView';
import RegisterView from '../features/auth/RegisterView';
import LoginView from '../features/auth/LoginView';
import EditProfileView from '../features/auth/EditProfileView';
import CommunitiesListPage from '../features/communities/pages/CommunitiesListPage';
import CommunityDetailPage from '../features/communities/pages/CommunityDetailPage';
import SongsCatalogPage from '../features/songs/pages/SongsCatalogPage';
import { AudioPlayerProvider } from '../features/songs/context/AudioPlayerContext';
import GlobalPlayer from '../features/songs/components/GlobalPlayer';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AudioPlayerProvider>
        <div style={{ paddingBottom: '90px', minHeight: '100vh' }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/register" element={<RegisterView />} />
            <Route path="/login" element={<LoginView />} />
            <Route path="/profile" element={<EditProfileView />} />
            <Route path="/rooms/:code" element={<RoomView />} />
            <Route path="/communities" element={<CommunitiesListPage />} />
            <Route path="/communities/:id" element={<CommunityDetailPage />} />
            <Route path="/songs" element={<SongsCatalogPage />} />
          </Routes>
        </div>
        <GlobalPlayer />
      </AudioPlayerProvider>
    </BrowserRouter>
  );
}
