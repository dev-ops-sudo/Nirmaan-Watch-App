'use client';
import { ShieldCheck, User, LogOut, CheckCircle2, Building2, X } from 'lucide-react';

interface ProfileModalProps {
  user: any;
  role: 'citizen' | 'official' | 'guest';
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export default function ProfileModal({ user, role, isOpen, onClose, onLogout }: ProfileModalProps) {
  if (!isOpen) return null;

  const displayName = user?.user_metadata?.full_name || 
    (role === 'official' ? 'Government Officer' : role === 'citizen' ? 'Citizen Member' : 'Guest');

  const displayEmail = user?.email || 
    (role === 'official' ? 'official@mplads.gov.in' : role === 'citizen' ? 'citizen@public.in' : 'guest@nirmaan.org');

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase())
    .join('') || 'U';

  const isOfficial = role === 'official';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`p-6 text-white ${isOfficial ? 'bg-gradient-to-r from-amber-700 to-amber-900' : 'bg-gradient-to-r from-blue-700 to-blue-900'} relative`}>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1.5 rounded-full transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-xl font-black text-white shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{displayName}</h3>
                {isOfficial && (
                  <span className="bg-amber-400 text-amber-950 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full">
                    Official
                  </span>
                )}
              </div>
              <p className="text-xs text-white/80 font-mono mt-0.5">{displayEmail}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-700">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Assigned Role</span>
              <span className={`font-semibold px-2 py-0.5 rounded-md ${isOfficial ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                {isOfficial ? 'Implementing District Authority' : 'Public Citizen'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Authentication Provider</span>
              <span className="font-semibold text-gray-800 flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                Supabase Auth
              </span>
            </div>

            {user?.user_metadata?.official_id && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500 font-medium">Official ID</span>
                <span className="font-mono font-bold text-gray-900">{user.user_metadata.official_id}</span>
              </div>
            )}
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 uppercase text-[10px] tracking-wider text-gray-400">
              Active Permissions
            </h4>
            <ul className="space-y-1.5 text-gray-600">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Access nationwide MPLADS project records</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>Submit project reviews, evidence & ratings</span>
              </li>
              {isOfficial ? (
                <>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>View restricted financial allocations & unreleased funds</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>Review IDA action flags & export filtered CSV datasets</span>
                  </li>
                </>
              ) : (
                <li className="flex items-center gap-2 text-blue-600">
                  <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                  <span>Public civic participation, community ratings & progress tracking</span>
                </li>
              )}
            </ul>
          </div>

          {/* Logout Action */}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200 transition-colors active:scale-[0.99]"
            >
              <LogOut size={16} />
              <span>Log out of Nirmaan Watch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
