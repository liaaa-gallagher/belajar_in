import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  UserPlus,
  LogIn,
  KeyRound,
  Calendar,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { apiFetch } from '../utils/api';

interface LoginRegisterViewProps {
  onLoginSuccess: (user: User, sessionId: string) => void;
}

export const LoginRegisterView: React.FC<LoginRegisterViewProps> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('siswa');

  // Form states
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [tglLahir, setTglLahir] = useState('');

  // Siswa specific
  const [kelas, setKelas] = useState('Kelas 8A');
  const [nomorAbsen, setNomorAbsen] = useState<string>('1');

  // Guru specific
  const [nip, setNip] = useState('');

  // Admin specific
  const [adminCode, setAdminCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await apiFetch<{
        user: User;
        sessionId: string;
        message: string;
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: username.trim(),
          password,
          role: selectedRole,
        }),
      });

      onLoginSuccess(res.user, res.sessionId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login gagal. Silakan periksa kembali akun Anda.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setUsernameSuggestions([]);

    if (password !== passwordConfirm) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Harap masukkan kata sandi yang sama.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiFetch<{
        user: User;
        sessionId: string;
        message: string;
        suggestions?: string[];
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          role: selectedRole,
          nama,
          username: username.trim(),
          password,
          tglLahir,
          kelas: selectedRole === 'siswa' ? kelas : undefined,
          nomorAbsen: selectedRole === 'siswa' ? Number(nomorAbsen) : undefined,
          nip: selectedRole === 'guru' ? nip : undefined,
          adminCode: selectedRole === 'admin' ? adminCode : undefined,
        }),
      });

      onLoginSuccess(res.user, res.sessionId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Pendaftaran gagal');
      // If server returned username suggestions
      try {
        const checkRes = await apiFetch<{
          available: boolean;
          suggestions: string[];
        }>(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        if (!checkRes.available && checkRes.suggestions?.length) {
          setUsernameSuggestions(checkRes.suggestions);
        }
      } catch (checkErr) {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/70 via-purple-50/50 to-sky-50/70 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 shadow-lg shadow-indigo-200 mb-4 text-white">
          <BookOpen className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-purple-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
          belajarin
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Platform Belajar, LKPD Digital, Bank Soal & Evaluasi Interaktif
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-3xl border border-indigo-100 sm:px-10">
          {/* Role Selection Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
              Pilih Peran Anda
            </label>
            <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('siswa');
                  setErrorMsg('');
                  setUsernameSuggestions([]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'siswa'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-500" />
                Siswa
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('guru');
                  setErrorMsg('');
                  setUsernameSuggestions([]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'guru'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-4 h-4 text-purple-500" />
                Guru
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  setErrorMsg('');
                  setUsernameSuggestions([]);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                  selectedRole === 'admin'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Admin
              </button>
            </div>
          </div>

          {/* Mode Switch (Login vs Daftar) */}
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setUsernameSuggestions([]);
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition-colors ${
                mode === 'login'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <LogIn className="w-4 h-4 inline-block mr-1.5" />
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setUsernameSuggestions([]);
              }}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 text-center transition-colors ${
                mode === 'register'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <UserPlus className="w-4 h-4 inline-block mr-1.5" />
              Daftar Baru
            </button>
          </div>

          {/* Error Message & Username Suggestions */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
                {usernameSuggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-rose-200">
                    <p className="font-medium text-rose-800 flex items-center gap-1 mb-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      Saran Username yang Tersedia:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {usernameSuggestions.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setUsername(sug);
                            setUsernameSuggestions([]);
                            setErrorMsg('');
                          }}
                          className="px-2 py-0.5 bg-white border border-rose-300 rounded-lg text-indigo-600 font-semibold hover:bg-indigo-50 transition"
                        >
                          @{sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Form Content */}
          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:opacity-95 shadow-lg shadow-indigo-200 transition duration-150 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-pulse">Memverifikasi...</span>
                  ) : (
                    <>
                      <span>Masuk sebagai {selectedRole.toUpperCase()}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="cth. Ahmad Fauzi / Dra. Sri Wahyuni"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameSuggestions.length) setUsernameSuggestions([]);
                  }}
                  placeholder="Pilih username unik"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kata Sandi (Password)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi aman"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ulangi Kata Sandi (Konfirmasi Password)
                </label>
                <input
                  type="password"
                  required
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder="Masukkan ulang kata sandi yang sama"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Lahir
                </label>
                <input
                  type="date"
                  required
                  value={tglLahir}
                  onChange={(e) => setTglLahir(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                />
              </div>

              {/* Role specific input */}
              {selectedRole === 'siswa' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kelas
                    </label>
                    <input
                      type="text"
                      required
                      value={kelas}
                      onChange={(e) => setKelas(e.target.value)}
                      placeholder="cth. Kelas 8A"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Absen
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={60}
                      value={nomorAbsen}
                      onChange={(e) => setNomorAbsen(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'guru' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    NIP (Nomor Induk Pegawai)
                  </label>
                  <input
                    type="text"
                    required
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="Masukkan NIP Anda"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                  />
                </div>
              )}

              {selectedRole === 'admin' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Khusus Admin
                  </label>
                  <input
                    type="password"
                    required
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Masukkan kode rahasia admin"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                  />
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:opacity-95 shadow-lg shadow-indigo-200 transition duration-150 disabled:opacity-50"
                >
                  {loading ? (
                    <span className="animate-pulse">Mendaftarkan...</span>
                  ) : (
                    <>
                      <span>Daftar Akun {selectedRole.toUpperCase()}</span>
                      <UserPlus className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}


        </div>

        {/* Security & 1-Device Notice */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            Fitur Keamanan: 1 Akun hanya dapat aktif di 1 perangkat.
          </p>
        </div>
      </div>
    </div>
  );
};
