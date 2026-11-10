import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomView from '../features/rooms/pages/RoomView';
import CommunitiesListPage from '../features/communities/pages/CommunitiesListPage';
import CommunityDetailPage from '../features/communities/pages/CommunityDetailPage';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms/:code" element={<RoomView />} />
        <Route path="/communities" element={<CommunitiesListPage />} />
        <Route path="/communities/:id" element={<CommunityDetailPage />} />
      </Routes>
    </BrowserRouter>
  );
}
