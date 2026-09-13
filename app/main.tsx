import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import LandingPage from './page';
import DashboardPage from './dashboard/page';
import AuthCallback from './auth/callback/page';
import './globals.css';

export function App() {
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (currentPath === '/dashboard' || currentPath.startsWith('/dashboard')) {
    return <DashboardPage />;
  }
  if (currentPath === '/auth/callback' || currentPath.startsWith('/auth/callback')) {
    return <AuthCallback />;
  }
  return <LandingPage />;
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
