import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import RoomView from '../features/rooms/pages/RoomView';
import RegisterView from '../features/auth/RegisterView';
import LoginView from '../features/auth/LoginView';
import EditProfileView from '../features/auth/EditProfileView';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/register" element={<RegisterView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/profile" element={<EditProfileView />} />
        <Route path="/rooms/:code" element={<RoomView />} />
      </Routes>
    </BrowserRouter>
  );
}
