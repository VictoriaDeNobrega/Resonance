import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomView from '../features/rooms/pages/RoomView';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms/:code" element={<RoomView />} />
      </Routes>
    </BrowserRouter>
  );
}
