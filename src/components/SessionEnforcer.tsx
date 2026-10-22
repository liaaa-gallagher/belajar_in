import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { User } from '../types';
import { apiFetch } from '../utils/api';

interface SessionEnforcerProps {
  currentUser: User | null;
  currentSessionId: string | null;
  onForcedLogout: (reason: string) => void;
}

export const SessionEnforcer: React.FC<SessionEnforcerProps> = ({
  currentUser,
  currentSessionId,
  onForcedLogout,
}) => {
  const [kickoutMessage, setKickoutMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser || !currentSessionId) return;

    const checkSession = async () => {
      try {
        const res = await apiFetch<{ valid: boolean; message?: string }>(
          '/api/auth/session-check',
          {
            method: 'POST',
            body: JSON.stringify({
              userId: currentUser.id,
              sessionId: currentSessionId,
            }),
          }
        );

        if (!res.valid) {
          const msg =
            res.message ||
            'Akun Anda telah masuk di perangkat lain. Untuk keamanan, akun ini keluar secara otomatis.';
          setKickoutMessage(msg);
          // Wait 3 seconds so user sees the message or user clicks dismiss
        }
      } catch (err) {
        // network or server temporary hiccup, don't immediately kick
      }
    };

    // Check every 4 seconds
    const interval = setInterval(checkSession, 4000);
    return () => clearInterval(interval);
  }, [currentUser, currentSessionId]);

  if (!kickoutMessage) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-800 mb-2">
          Sesi Perangkat Berakhir
        </h3>

        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          {kickoutMessage}
        </p>

        <button
          type="button"
          onClick={() => {
            setKickoutMessage(null);
            onForcedLogout(kickoutMessage);
          }}
          className="w-full py-3 px-4 bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-rose-200 flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Kembali ke Halaman Masuk</span>
        </button>
      </div>
    </div>
  );
};
