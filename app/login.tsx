'use client';
import { useState } from 'react';
import { User, Lock, Mail, ArrowRight, X, Loader2, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { NirmaanLogo } from './nirmaan-logo';

interface LoginProps {
  onLogin: (role: 'citizen', user?: any) => void;
  onClose: () => void;
}

export default function Login({ onLogin, onClose }: LoginProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Google OAuth
  const handleGoogleOAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('Google OAuth error:', err);
      setErrorMsg(err.message || 'Failed to start Google sign-in');
      setLoading(false);
    }
  };

  // 2. Supabase Email/Password (Citizen Sign In or Sign Up)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim() || 'Citizen User',
              role: 'citizen',
            }
          }
        });

        if (error) throw error;

        if (data.user && data.user.identities && data.user.identities.length === 0) {
          setErrorMsg('An account with this email already exists. Please switch to Sign In.');
          return;
        }

        if (data.session) {
          setSuccessMsg('Account created & logged in successfully!');
          setTimeout(() => {
            onLogin('citizen', data.user);
          }, 800);
        } else {
          setSuccessMsg('Confirmation email sent! Please check your inbox to verify.');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('user not found') || (error as any).status === 400) {
            setErrorMsg('Invalid credentials. Please try again or create an account.');
          } else if (msg.includes('email not confirmed')) {
            setErrorMsg('Email not confirmed. Please check your inbox.');
          } else {
            setErrorMsg(error.message || 'Authentication failed. Please verify credentials.');
          }
          return;
        }

        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onLogin('citizen', data.user);
        }, 500);
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Quick Citizen Demo
  const handleQuickDemo = () => {
    onLogin('citizen', {
      id: 'citizen-demo-user',
      email: 'citizen@nirmaan.org',
      user_metadata: {
        full_name: 'Ramesh Kumar',
        role: 'citizen'
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="relative w-full max-w-[480px] bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 dark:border-zinc-800/60 overflow-hidden transition-all">
        
        {/* Subtle Gradient Glow Background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none"></div>

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 z-10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 bg-white/50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-full p-2 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          aria-label="Close"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="relative pt-12 pb-10 px-8 sm:px-12 z-10">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="bg-white dark:bg-zinc-950 p-3 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800 mb-5">
              <NirmaanLogo size={42} />
            </div>
            <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-white tracking-tight mb-1.5">
              Citizen Access
            </h2>
            <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 font-medium max-w-[260px]">
              Monitor public funds, ongoing works, and community reviews.
            </p>
          </div>

          {/* Segmented Control for Sign In / Sign Up */}
          <div className="flex bg-zinc-100/80 dark:bg-zinc-950/50 p-1.5 rounded-xl mb-6 shadow-inner relative">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${mode === 'signin' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-all duration-200 z-10 ${mode === 'signup' ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
            >
              Create Account
            </button>
            <div 
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white dark:bg-zinc-800 rounded-lg shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: mode === 'signin' ? 'translateX(0)' : 'translateX(100%)' }}
            ></div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-6 p-3.5 bg-red-50/50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[13px] rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-2">
              <div className="mt-0.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>
              </div>
              <div className="font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}
          {successMsg && (
            <div className="mb-6 p-3.5 bg-emerald-50/50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[13px] rounded-xl flex items-start gap-2.5 shadow-sm animate-in slide-in-from-top-2">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                  Full Name
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-orange-500 transition-colors">
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="pl-11 block w-full text-[15px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-orange-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  className="pl-11 block w-full text-[15px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-zinc-700 dark:text-zinc-300 ml-1">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-orange-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 block w-full text-[15px] bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl shadow-[0_4px_14px_0_rgba(234,88,12,0.39)] text-[15px] font-bold text-white bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signup' ? 'Create Account' : 'Sign In securely'}</span>
                    <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white dark:bg-zinc-900 text-zinc-400 font-medium">Or continue with</span>
            </div>
          </div>

          {/* Google OAuth Button */}
          <button 
            type="button"
            onClick={handleGoogleOAuth} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 group"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" className="group-hover:scale-105 transition-transform">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            Google
          </button>

          {/* Instant Demo Bypass */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={handleQuickDemo}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              title="Use this for a quick 1-click test without signing up"
            >
              <LayoutDashboard size={14} />
              <span>Explore as Guest</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
