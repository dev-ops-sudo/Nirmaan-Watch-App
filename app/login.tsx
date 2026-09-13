'use client';

import React, { useState } from 'react';
import { Loader2, CheckCircle2, X } from 'lucide-react';
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
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Google OAuth
  const handleGoogleOAuth = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
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

  // 2. Supabase Email/Password
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
          }, 600);
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
        }, 400);
      }
    } catch (err: any) {
      console.error('Supabase Auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6 md:p-8 overflow-y-auto animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-[1040px] min-h-[580px] md:min-h-[640px] bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800/90 flex flex-col md:flex-row overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button (Top Right) */}
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 z-30 p-2.5 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all focus:outline-none"
          aria-label="Close modal"
        >
          <X size={20} strokeWidth={2.2} />
        </button>

        {/* LEFT SIDE: Minimal Aesthetic Editorial Image & Quote */}
        <div className="relative hidden md:flex md:w-[46%] lg:w-[48%] flex-col justify-between p-8 md:p-10 lg:p-12 text-white overflow-hidden bg-zinc-900 shrink-0 select-none">
          {/* Background Image */}
          <img 
            src="/images/nirmaan-auth-hero.jpg" 
            alt="Nirmaan AI Civic Architecture and Infrastructure"
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
          />
          
          {/* Enhanced Scrim Gradient for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60 pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-md">
              <NirmaanLogo size={20} />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-none">
                Nirmaan <span className="text-orange-400">AI</span>
              </span>
              <span className="text-[10px] text-zinc-300 font-medium tracking-wider uppercase block mt-1">
                MPLADS Monitor
              </span>
            </div>
          </div>

          {/* Bottom Testimonial / Public Governance Quote */}
          <div 
            className="relative z-10 space-y-3"
            style={{ paddingBottom: '3rem' }}
          >
            <p className="text-xl lg:text-[22px] font-semibold text-white leading-snug tracking-tight">
              &ldquo;Simply all the transparency that citizens and leaders need.&rdquo;
            </p>
            <div className="pt-1.5">
              <div className="text-base font-semibold text-white">
                Priya Sundaram
              </div>
              <div className="text-xs text-zinc-300 font-normal mt-0.5">
                Director of Public Infrastructure & Analytics
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Clean, Spacious, Perfectly Aligned Authentication Form */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 md:px-12 bg-white dark:bg-zinc-950 py-8">
          <div className="w-full max-w-[390px] mx-auto my-auto flex flex-col">
            
            {/* Header: Symmetrical, spacious, clear with generous bottom margin */}
            <div className="text-center" style={{ marginBottom: '26px' }}>
              <h2 
                className="text-2xl sm:text-[28px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-snug"
                style={{ marginBottom: '10px' }}
              >
                {mode === 'signin' ? 'Welcome back to Nirmaan' : 'Create an account'}
              </h2>
              <p 
                className="text-sm text-zinc-500 dark:text-zinc-400 max-w-[350px] mx-auto"
                style={{ lineHeight: '1.6' }}
              >
                {mode === 'signin'
                  ? 'Monitor MPLADS allocations, civic projects, and fund analytics effortlessly.'
                  : 'Join citizens and evaluators monitoring grassroots development projects.'}
              </p>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div 
                className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-1"
                style={{ marginBottom: '20px' }}
              >
                <div className="font-medium leading-relaxed">{errorMsg}</div>
              </div>
            )}
            {successMsg && (
              <div 
                className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-1"
                style={{ marginBottom: '20px' }}
              >
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <div className="font-medium">{successMsg}</div>
              </div>
            )}

            {/* Form with spacious inputs and clear gaps */}
            <form onSubmit={handleSubmit} className="w-full">
              {mode === 'signup' && (
                <div 
                  className="animate-in fade-in slide-in-from-bottom-2 duration-200"
                  style={{ marginBottom: '20px' }}
                >
                  <label 
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
                    style={{ marginBottom: '8px' }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ramesh Kumar"
                    className="w-full px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/20 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-sm"
                    style={{ height: '48px' }}
                  />
                </div>
              )}

              {/* Email Input */}
              <div style={{ marginBottom: '20px' }}>
                <label 
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
                  style={{ marginBottom: '8px' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.jordan@gmail.com"
                  className="w-full px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/20 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-sm"
                  style={{ height: '48px' }}
                />
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '20px' }}>
                <label 
                  className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 tracking-wide"
                  style={{ marginBottom: '8px' }}
                >
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-[#FF6600] focus:ring-2 focus:ring-[#FF6600]/20 focus:bg-white dark:focus:bg-zinc-900 transition-all shadow-sm"
                  style={{ height: '48px' }}
                />
              </div>

              {/* Single Balanced Row: Remember Me & Forgot Password */}
              {mode === 'signin' && (
                <div 
                  className="flex items-center justify-between"
                  style={{ marginTop: '6px', marginBottom: '22px' }}
                >
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-none ${
                        rememberMe ? 'bg-[#FF6600]' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          rememberMe ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                      Remember me
                    </span>
                  </label>
                  
                  <button 
                    type="button" 
                    onClick={() => alert('Password reset link sent to your email address.')}
                    className="text-xs sm:text-sm font-semibold text-[#FF6600] hover:text-[#E65100] dark:text-orange-400 hover:underline outline-none transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Primary Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-5 rounded-xl text-sm font-semibold text-white bg-[#FF6600] hover:bg-[#E65100] active:scale-[0.99] disabled:opacity-70 shadow-lg shadow-[#FF6600]/25 hover:shadow-xl hover:shadow-[#FF6600]/30 transition-all flex items-center justify-center gap-2"
                  style={{ height: '48px' }}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <span>{mode === 'signup' ? 'Create account' : 'Log in'}</span>
                  )}
                </button>
              </div>
            </form>

            {/* OR Divider */}
            <div 
              className="relative"
              style={{ marginTop: '24px', marginBottom: '24px' }}
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider font-semibold">
                <span className="px-3 bg-white dark:bg-zinc-950 text-zinc-400">
                  OR
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button 
              type="button"
              onClick={handleGoogleOAuth} 
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 px-4 rounded-xl text-sm font-semibold transition-all active:scale-[0.99] disabled:opacity-50 shadow-sm"
              style={{ height: '48px' }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Bottom Mode Toggle */}
            <div 
              className="flex flex-col items-center text-center"
              style={{ marginTop: '24px' }}
            >
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button 
                  type="button"
                  onClick={() => { 
                    setMode(mode === 'signin' ? 'signup' : 'signin'); 
                    setErrorMsg(''); 
                    setSuccessMsg(''); 
                  }}
                  className="font-bold text-[#FF6600] hover:text-[#E65100] dark:text-orange-400 hover:underline outline-none inline-block ml-1 transition-colors"
                >
                  {mode === 'signin' ? 'Sign up' : 'Log in'}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
