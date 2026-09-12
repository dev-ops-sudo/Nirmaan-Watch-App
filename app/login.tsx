'use client';
import { useState } from 'react';
import { User, Building2, Lock, Mail, ArrowRight, X, Loader2, CheckCircle2 } from 'lucide-react';
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
        // Citizen Sign Up with Supabase
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

        // In Supabase, if user already exists, identities is an empty array
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
          setSuccessMsg('Confirmation email sent! Please check your email inbox to verify and activate your account.');
        }
      } else {
        // Citizen Sign In with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('user not found') || (error as any).status === 400) {
            setErrorMsg('User does not exist or credentials are invalid. Please check your email or click below to create an account.');
          } else if (msg.includes('email not confirmed')) {
            setErrorMsg('Email not confirmed. Please check your inbox for the confirmation email sent earlier.');
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
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('invalid login credentials') || msg.includes('user not found')) {
        setErrorMsg('User does not exist. Please check your email or click below to create an account.');
      } else if (msg.includes('email not confirmed')) {
        setErrorMsg('Email not confirmed. Please check your inbox for the confirmation email.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 3. Quick Citizen Demo for Hackathon Evaluation
  const handleQuickDemo = () => {
    onLogin('citizen', {
      id: 'citizen-demo-user',
      email: 'citizen@nirmaan.org',
      user_metadata: {
        full_name: 'Ramesh Kumar (Citizen)',
        role: 'citizen'
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col justify-center py-8 sm:px-6 lg:px-8 animate-in fade-in duration-200">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="pt-8 pb-8 px-6 sm:px-10">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <NirmaanLogo size={46} />
          </div>
          <h2 className="text-center text-2xl font-black text-gray-900 tracking-tight">
            Citizen Login
          </h2>
          <p className="mt-1 text-center text-xs text-gray-500 mb-5">
            Access public funds monitoring, ongoing works & citizen reviews
          </p>

          {/* Google OAuth Button */}
          <button 
            type="button"
            onClick={handleGoogleOAuth} 
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
              <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
              </g>
            </svg>
            <span className="text-sm font-semibold">Sign in with Google</span>
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-white text-gray-400 uppercase font-medium">Or Supabase Auth</span></div>
          </div>

          {/* Sign In vs Sign Up Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'signin' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${mode === 'signup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Create Account
            </button>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex flex-col gap-1.5">
              <div className="flex items-start gap-2">
                <span className="font-bold shrink-0">Notice:</span>
                <span>{errorMsg}</span>
              </div>
              {mode === 'signin' && (errorMsg.includes('does not exist') || errorMsg.includes('credentials')) && (
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className="text-left font-bold text-orange-700 underline text-xs mt-0.5 hover:text-orange-900 flex items-center gap-1"
                >
                  <span>User not found? Click here to Sign Up</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs rounded-xl flex items-start gap-2 shadow-xs">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{successMsg}</span>
                {successMsg.includes('Confirmation email sent') && (
                  <span className="text-[11px] text-emerald-700 mt-1 block">
                    Once verified in your email, switch to <strong>Sign In</strong> to access your dashboard.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User size={15} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="pl-9 block w-full text-xs border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Mail size={15} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="citizen@example.com"
                  className="pl-9 block w-full text-xs border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={15} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 block w-full text-xs border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl shadow-md text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting to Supabase...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'signup' ? 'Create Citizen Account' : 'Sign In as Citizen'}</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          {/* Instant Demo Bypass for Hackathon Demo */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase text-gray-400 tracking-wider">Instant Demo Mode</span>
              <span className="text-[10px] text-gray-400">1-click citizen access</span>
            </div>
            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full py-2 px-3 bg-gray-50 hover:bg-orange-50 text-orange-700 border border-gray-200 hover:border-orange-200 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <User size={15} />
              <span>Quick Citizen Demo Access</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
