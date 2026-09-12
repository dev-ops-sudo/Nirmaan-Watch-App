'use client';
import { useState, useEffect } from 'react';
import Dashboard from './dashboard';
import Login from './login';
import { supabase } from '@/lib/supabase';

export default function Page() {
  const [role, setRole] = useState<'citizen' | 'official' | 'guest'>('guest');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // 1. Initial check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const metaRole = session.user.user_metadata?.role;
        if (metaRole === 'official' || metaRole === 'citizen') {
          setRole(metaRole);
        } else if (session.user.email?.toLowerCase().includes('gov')) {
          setRole('official');
        } else {
          setRole('citizen');
        }
      }
    });

    // 2. Listen to Supabase auth state changes (Google OAuth redirect, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const metaRole = session.user.user_metadata?.role;
        if (metaRole === 'official' || metaRole === 'citizen') {
          setRole(metaRole);
        } else if (session.user.email?.toLowerCase().includes('gov')) {
          setRole('official');
        } else {
          setRole('citizen');
        }
        setShowLogin(false);
      } else {
        setUser(null);
        setRole('guest');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setRole('guest');
  };

  return (
    <>
      <Dashboard 
        role={role} 
        user={user}
        onLogout={handleLogout} 
        onLoginRequest={() => setShowLogin(true)} 
      />
      {showLogin && (
        <Login 
          onLogin={(newRole, authUser) => {
            setRole(newRole);
            if (authUser) setUser(authUser);
            setShowLogin(false);
          }} 
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}
