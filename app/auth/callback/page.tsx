'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  useEffect(() => {
    const handleCallback = async () => {
      if (typeof window !== 'undefined') {
        try {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        } catch (err) {
          console.error('Error exchanging code for session:', err);
        } finally {
          window.location.href = '/';
        }
      }
    };
    handleCallback();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm w-full text-center">
        <Loader2 className="animate-spin text-blue-600 mb-4" size={40} />
        <h2 className="text-base font-bold text-gray-900">Authenticating with Google</h2>
        <p className="text-xs text-gray-500 mt-1">Completing secure sign-in, redirecting to dashboard...</p>
      </div>
    </div>
  );
}
