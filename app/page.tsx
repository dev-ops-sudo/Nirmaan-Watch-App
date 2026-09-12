'use client';
import { useState } from 'react';
import Dashboard from './dashboard';
import Login from './login';

export default function Page() {
  const [role, setRole] = useState<'citizen' | 'official' | 'guest'>('guest');
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <Dashboard 
        role={role} 
        onLogout={() => setRole('guest')} 
        onLoginRequest={() => setShowLogin(true)} 
      />
      {showLogin && (
        <Login 
          onLogin={(newRole) => {
            setRole(newRole);
            setShowLogin(false);
          }} 
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}
