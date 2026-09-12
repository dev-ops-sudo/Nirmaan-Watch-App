'use client';
import { useState, useEffect } from 'react';
import Dashboard from './dashboard';
import Login from './login';
import { supabase } from '@/lib/supabase';

export default function Page() {
  const [role, setRole] = useState<'citizen' | 'guest'>('guest');
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // 1. Handle OAuth PKCE callback code if present in the URL query
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      if (code) {
        supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
          if (!error && data?.session?.user) {
            setUser(data.session.user);
            setRole('citizen');
            setShowLogin(false);
            // Clean up the ?code= query param from address bar
            url.searchParams.delete('code');
            const cleanPath = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
            window.history.replaceState({}, document.title, cleanPath);
          }
        });
      }
    }

    // 2. Check for active Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setRole('citizen');
      }
    });

    // 3. Listen to Supabase auth state changes (Google OAuth redirect, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setRole('citizen');
        setShowLogin(false);
      } else if (event === 'SIGNED_OUT') {
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
