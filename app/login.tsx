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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-[940px] min-h-[580px] md:min-h-[630px] bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl shadow-2xl border border-zinc-200/90 dark:border-zinc-800 flex flex-col md:flex-row overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button (Top Right) */}
        <button 
          onClick={onClose} 
          className="absolute top-5 right-5 z-30 p-2 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all focus:outline-none"
          aria-label="Close modal"
        >
          <X size={19} strokeWidth={2.2} />
        </button>

        {/* LEFT SIDE: Minimal Aesthetic Editorial Image & Quote (Reference Style) */}
        <div className="relative hidden md:flex md:w-[46%] lg:w-[44%] flex-col justify-between p-8 text-white overflow-hidden bg-zinc-900 shrink-0 select-none" style={{ paddingBottom: '40px' }}>
          {/* Background Image */}
          <img 
            src="/images/nirmaan-auth-hero.jpg" 
            alt="Nirmaan AI Civic Architecture and Infrastructure"
            className="absolute inset-0 w-full h-full object-cover object-center scale-[1.02]"
          />
          
          {/* Enhanced Scrim Gradient for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/60 pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-md">
              <NirmaanLogo size={18} />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block leading-none">
                Nirmaan <span className="text-orange-400">AI</span>
              </span>
              <span className="text-[9px] text-zinc-300 font-medium tracking-wider uppercase block mt-0.5">
                MPLADS Monitor
              </span>
            </div>
          </div>

          {/* Bottom Testimonial / Public Governance Quote */}
          <div className="relative z-10 space-y-2.5 mb-2">
            <p className="text-base lg:text-[18px] font-semibold text-white leading-snug tracking-tight">
              &ldquo;Simply all the transparency that citizens and leaders need.&rdquo;
            </p>
            <div>
              <div className="text-xs sm:text-sm font-semibold text-white">
                Priya Sundaram
              </div>
              <div className="text-[11px] text-zinc-300 font-normal mt-0.5">
                Director of Public Infrastructure & Analytics
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: Clean Minimal Authentication Form */}
        <div className="flex-1 flex flex-col justify-center px-7 py-10 sm:px-12 lg:px-14 bg-white dark:bg-zinc-950">
          <div className="w-full max-w-[360px] mx-auto space-y-5">
            
            {/* Header */}
            <div className="text-center space-y-2 mb-2">
              <h2 className="text-2xl sm:text-[27px] font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
                {mode === 'signin' ? 'Welcome back to Nirmaan' : 'Create your account'}
              </h2>
              <p className="text-xs sm:text-[13px] text-zinc-500 dark:text-zinc-400 max-w-[300px] mx-auto leading-relaxed">
                {mode === 'signin'
                  ? 'Monitor MPLADS allocations, civic projects, and fund analytics effortlessly.'
                  : 'Join citizens and evaluators monitoring grassroots development projects.'}
              </p>
            </div>

            {/* Alerts */}
            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2.5 animate-in slide-in-from-top-1">
                <div className="font-medium leading-relaxed">{errorMsg}</div>
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2.5 animate-in slide-in-from-top-1">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                <div className="font-medium">{successMsg}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div className="relative border border-zinc-200 dark:border-zinc-700 focus-within:border-[#635BFF] focus-within:ring-2 focus-within:ring-[#635BFF]/20 rounded-xl px-3.5 py-2 transition-all bg-white dark:bg-zinc-900 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 leading-tight">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ramesh Kumar"
                    className="w-full text-xs sm:text-sm font-normal text-zinc-900 dark:text-white bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-zinc-400"
                  />
                </div>
              )}

              {/* Email (Inset Label matching reference) */}
              <div className="relative border border-zinc-200 dark:border-zinc-700 focus-within:border-[#635BFF] focus-within:ring-2 focus-within:ring-[#635BFF]/20 rounded-xl px-3.5 py-2 transition-all bg-white dark:bg-zinc-900">
                <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 leading-tight">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.jordan@gmail.com"
                  className="w-full text-xs sm:text-sm font-normal text-zinc-900 dark:text-white bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-zinc-400"
                />
              </div>

              {/* Password (Inset Label matching reference) */}
              <div className="relative border border-zinc-200 dark:border-zinc-700 focus-within:border-[#635BFF] focus-within:ring-2 focus-within:ring-[#635BFF]/20 rounded-xl px-3.5 py-2 transition-all bg-white dark:bg-zinc-900">
                <label className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 leading-tight">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs sm:text-sm font-normal text-zinc-900 dark:text-white bg-transparent border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-zinc-400"
                />
              </div>

              {/* Forgot password & Remember me rows matching reference image */}
              {mode === 'signin' && (
                <div className="space-y-3 pt-0.5">
                  <div>
                    <button 
                      type="button" 
                      onClick={() => alert('Password reset link sent to your email address.')}
                      className="text-xs font-semibold text-[#635BFF] hover:text-[#5851EA] dark:text-indigo-400 hover:underline outline-none"
                    >
                      Forgot password?
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 select-none font-medium">
                      Remember sign in details
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={rememberMe}
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        rememberMe ? 'bg-[#635BFF]' : 'bg-zinc-300 dark:bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          rememberMe ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#635BFF] hover:bg-[#5851EA] active:scale-[0.99] disabled:opacity-70 shadow-md shadow-[#635BFF]/25 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>{mode === 'signup' ? 'Create account' : 'Log in'}</span>
                  )}
                </button>
              </div>
            </form>

            {/* OR Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
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
              className="w-full flex items-center justify-center gap-3 bg-[#F3F4F6] hover:bg-[#E5E7EB] dark:bg-zinc-900/80 dark:hover:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition active:scale-[0.99] disabled:opacity-50"
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

            {/* Bottom Toggle */}
            <div className="pt-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button 
                type="button"
                onClick={() => { 
                  setMode(mode === 'signin' ? 'signup' : 'signin'); 
                  setErrorMsg(''); 
                  setSuccessMsg(''); 
                }}
                className="font-bold text-[#635BFF] hover:text-[#5851EA] dark:text-indigo-400 hover:underline outline-none inline-block ml-1"
              >
                {mode === 'signin' ? 'Sign up' : 'Log in'}
              </button>
            </div>

            {/* Instant Guest Demo Access */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  onLogin('citizen', {
                    id: 'citizen-demo-user',
                    email: 'citizen@nirmaan.org',
                    user_metadata: {
                      full_name: 'Ramesh Kumar',
                      role: 'citizen'
                    }
                  });
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                title="Instant access for review and testing"
              >
                <span>Explore as Guest (Instant Access)</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
