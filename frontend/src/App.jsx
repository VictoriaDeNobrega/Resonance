import React from 'react';
import AppRouter from './routes/AppRouter';

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppRouter />
    </div>
  );
}
