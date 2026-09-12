'use client';
import { useState } from 'react';
import { ShieldCheck, User, Building2, Lock, FileText, ArrowRight, X } from 'lucide-react';

export default function Login({ onLogin, onClose }: { onLogin: (role: 'citizen' | 'official') => void, onClose: () => void }) {
  const [tab, setTab] = useState<'citizen' | 'official'>('citizen');

  const handleLogin = async (type: 'citizen' | 'official', e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const body = type === 'official' ? {
      type: 'official',
      id: formData.get('id'),
      password: formData.get('password'),
    } : {
      type: 'citizen',
      name: formData.get('name'),
      phone: formData.get('phone'),
    };

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.role);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Login failed. Please check your connection.');
    }
  };

  const handleGoogleOAuth = () => {
    // Placeholder for the Google OAuth implementation
    alert('Google OAuth logic goes here!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative bg-white rounded-xl shadow-2xl overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        <div className="pt-8 pb-8 px-4 sm:px-10">
          <div className="flex justify-center mb-6 text-blue-600">
            <Building2 size={48} />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            Nirmaan Watch
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 mb-6">
            Log in to access public funds and project data.
          </p>

          <button onClick={handleGoogleOAuth} className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 mb-6 transition-colors shadow-sm">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)"><path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/><path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/><path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/><path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/></g></svg>
            Sign in with Google
          </button>
          
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or use demo access</span></div>
          </div>
          
          <div className="flex justify-center space-x-4 mb-8 border-b pb-4">
            <button
              onClick={() => setTab('citizen')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${tab === 'citizen' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <User size={18} />
              <span>Normal User</span>
            </button>
            <button
              onClick={() => setTab('official')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${tab === 'official' ? 'bg-amber-50 text-amber-700 font-medium' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <ShieldCheck size={18} />
              <span>Gov Official</span>
            </button>
          </div>

          {tab === 'citizen' ? (
            <form onSubmit={(e) => handleLogin('citizen', e)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="text-gray-400" size={18} />
                  </div>
                  <input name="name" required type="text" className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. Ramesh Kumar" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText className="text-gray-400" size={18} />
                  </div>
                  <input name="phone" required type="tel" className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border focus:ring-blue-500 focus:border-blue-500" placeholder="+91 xxxxx xxxxx" />
                </div>
              </div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                Continue to Dashboard <ArrowRight size={18} className="ml-2" />
              </button>
            </form>
          ) : (
            <form onSubmit={(e) => handleLogin('official', e)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Official Badge / ID Number</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="text-gray-400" size={18} />
                  </div>
                  <input name="id" required type="text" className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border focus:ring-amber-500 focus:border-amber-500" placeholder="GOV-ID-XXXX" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" size={18} />
                  </div>
                  <input name="password" required type="password" defaultValue="demo-password" className="pl-10 block w-full sm:text-sm border-gray-300 rounded-md py-2 px-3 border focus:ring-amber-500 focus:border-amber-500" placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
                Access Secure Workspace <ArrowRight size={18} className="ml-2" />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
