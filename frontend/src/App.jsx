import React from 'react';
import AppRouter from './routes/AppRouter';
import { SongSearch } from '../features/songs/SongSearch';
import { HomeSongs } from '../features/songs/HomeSongs';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppRouter />
    </div>
  );
}

export const AppRouter = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <HomeSongs />
      <SongSearch />
    </div>
  );
};
