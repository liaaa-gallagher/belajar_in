import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Bell,
  LogOut,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  CheckCheck,
  Calendar,
  MessageSquare,
  FileText,
  UserCheck,
} from 'lucide-react';
import { User, AppNotification } from '../types';
import { apiFetch } from '../utils/api';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onSelectNotification,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch<AppNotification[]>(
        `/api/notifications?userId=${user.id}`
      );
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
    return () => clearInterval(interval);
  }, [user.id]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowBellDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', {
        method: 'PUT',
        body: JSON.stringify({ userId: user.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error mark read:', err);
    }
  };

  const handleNotifClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      try {
        await apiFetch(`/api/notifications/${notif.id}/read`, {
          method: 'PUT',
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    setShowBellDropdown(false);
    if (onSelectNotification) onSelectNotification(notif);
  };

  const roleBadgeConfig = {
    siswa: {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      label: 'Siswa',
      icon: GraduationCap,
    },
    guru: {
      bg: 'bg-purple-100 text-purple-800 border-purple-300',
      label: 'Guru Pengampu',
      icon: BookOpen,
    },
    admin: {
      bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      label: 'Administrator',
      icon: ShieldCheck,
    },
  }[user.role];

  const RoleIcon = roleBadgeConfig.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-purple-700 via-indigo-600 to-sky-600 bg-clip-text text-transparent">
                  belajarin
                </span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
                Ruang Belajar & Ujian Interaktif Mandiri
              </p>
            </div>
          </div>

          {/* Right Section: Device Status, Notifications & User Info */}
          <div className="flex items-center gap-3">
            {/* 1 Akun 1 Device Active indicator */}
            <div
              title="Sistem 1 Akun 1 Perangkat aktif untuk mencegah duplikasi login"
              className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">1 Akun 1 Perangkat</span>
            </div>

            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className="relative p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition duration-150 focus:outline-none"
                aria-label="Pemberitahuan"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full border-2 border-white animate-bounce">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showBellDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-indigo-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 text-sm">
                        Pemberitahuan
                      </span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Tandai sudah dibaca
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-xs">
                        Belum ada pemberitahuan baru
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`p-3.5 hover:bg-slate-50 cursor-pointer transition flex items-start gap-3 ${
                            !n.isRead ? 'bg-indigo-50/50' : ''
                          }`}
                        >
                          <div className="mt-0.5 p-2 rounded-lg bg-indigo-100 text-indigo-700">
                            {n.type === 'announcement' ? (
                              <Calendar className="w-4 h-4" />
                            ) : n.type === 'feedback' ? (
                              <MessageSquare className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {n.title}
                            </p>
                            <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.createdAt).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              • {new Date(n.createdAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600 self-center"></span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {user.nama.charAt(0).toUpperCase()}
              </div>

              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                    {user.nama}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full font-semibold border ${roleBadgeConfig.bg}`}
                  >
                    <RoleIcon className="w-2.5 h-2.5" />
                    {roleBadgeConfig.label}
                  </span>
                  {user.kelas && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({user.kelas})
                    </span>
                  )}
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={onLogout}
                className="ml-1 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition duration-150"
                title="Keluar Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
