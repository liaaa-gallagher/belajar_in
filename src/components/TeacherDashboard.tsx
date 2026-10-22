import React, { useState, useEffect } from 'react';
import {
  Users,
  PlusCircle,
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Trash2,
  Copy,
  Layers,
  Award,
  Archive,
  Sparkles,
  Search,
  BookOpen,
  Filter,
  CheckSquare,
  Square,
  Share2,
  ShieldAlert,
  UserCog,
  KeyRound,
  UserCheck,
  UserX,
  Lock,
} from 'lucide-react';
import {
  User,
  ClassRoom,
  AssignmentItem,
  Submission,
  Announcement,
  AssignmentType,
  UserRole,
} from '../types';
import { apiFetch } from '../utils/api';
import { exportSubmissionsToExcel } from '../utils/excelExport';
import { TeacherGradingModal } from './TeacherGradingModal';
import { TeacherClassDetailModal } from './TeacherClassDetailModal';
import { AssignmentBuilder } from './AssignmentBuilder';

interface TeacherDashboardProps {
  user: User;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user }) => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);

  // Navigation tab: 'koreksi' (guru only) | 'kelas' | 'materi' | 'arsip' | 'pengumuman' | 'users' (admin only)
  const [activeTab, setActiveTab] = useState<
    'koreksi' | 'kelas' | 'materi' | 'arsip' | 'pengumuman' | 'users'
  >(user.role === 'admin' ? 'users' : 'koreksi');

  // Modals & builder state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);

  const [activeClassDetail, setActiveClassDetail] = useState<ClassRoom | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<{
    sub: Submission;
    asg: AssignmentItem;
  } | null>(null);

  // Admin User Management State (req 4)
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [editingUserModal, setEditingUserModal] = useState<User | null>(null);
  const [resetPassModal, setResetPassModal] = useState<{ userId: string; username: string; nama: string } | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // Create Class Modal
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState('');
  const [newClassGrade, setNewClassGrade] = useState('Kelas 8A');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  // New Announcement Modal (req 6, 42)
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annClassId, setAnnClassId] = useState('all');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annScheduleDate, setAnnScheduleDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [postingAnn, setPostingAnn] = useState(false);

  // Filters for Koreksi (req 11: "terpisah per kelas dan perhal yang sedang dikerjakan")
  const [selectedKoreksiClassId, setSelectedKoreksiClassId] = useState<string>('all');
  const [selectedKoreksiAssignmentId, setSelectedKoreksiAssignmentId] = useState<string>('all');
  const [koreksiStatusFilter, setKoreksiStatusFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');

  // Multi-select for Excel Download (req 43: "guru harus bisa centang hasil kiriman jawaban siswa untuk download excel")
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);

  const loadAllData = async () => {
    try {
      const promises: Promise<any>[] = [
        apiFetch<ClassRoom[]>(`/api/classes?userId=${user.id}`),
        apiFetch<AssignmentItem[]>('/api/assignments'),
        apiFetch<Submission[]>('/api/submissions'),
        apiFetch<Announcement[]>('/api/announcements'),
      ];

      if (user.role === 'admin') {
        promises.push(apiFetch<User[]>('/api/admin/users'));
      }

      const results = await Promise.all(promises);
      setClasses(results[0] || []);
      setAssignments(results[1] || []);
      setSubmissions(results[2] || []);
      setAnnouncements(results[3] || []);
      if (user.role === 'admin' && results[4]) {
        setUsersList(results[4]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 8000);
    return () => clearInterval(interval);
  }, [user.id]);

  // Create Class Handler (req 3)
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !newClassSubject.trim()) return;

    try {
      setCreatingClass(true);
      await apiFetch<ClassRoom>('/api/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: newClassName.trim(),
          subject: newClassSubject.trim(),
          grade: newClassGrade,
          description: newClassDesc,
          teacherId: user.id,
          teacherName: user.nama,
        }),
      });

      setShowCreateClassModal(false);
      setNewClassName('');
      setNewClassSubject('');
      setNewClassDesc('');
      loadAllData();
      alert('Kelas baru berhasil dibuat!');
    } catch (err: any) {
      alert('Gagal membuat kelas: ' + err.message);
    } finally {
      setCreatingClass(false);
    }
  };

  // Post Announcement Handler (req 6, 42)
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      setPostingAnn(true);
      await apiFetch('/api/announcements', {
        method: 'POST',
        body: JSON.stringify({
          classId: annClassId,
          authorRole: user.role,
          authorName: user.nama,
          title: annTitle.trim(),
          content: annContent.trim(),
          scheduleDate: new Date(annScheduleDate).toISOString(),
        }),
      });

      setShowAnnModal(false);
      setAnnTitle('');
      setAnnContent('');
      loadAllData();
      alert('Pengumuman / Jadwal berhasil diterbitkan dan notifikasi telah dikirim ke lonceng siswa!');
    } catch (err: any) {
      alert('Gagal mengirim pengumuman: ' + err.message);
    } finally {
      setPostingAnn(false);
    }
  };

  // Delete Assignment (req 30, 39)
  const handleDeleteAssignment = async (id: string) => {
    if (!confirm('Hapus materi/soal ini? Seluruh data tugas dan pengumpulan terkait akan terhapus.')) return;
    try {
      await apiFetch(`/api/assignments/${id}`, { method: 'DELETE' });
      loadAllData();
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  // Duplicate / Archive to other class (req 38)
  const handleDuplicateToClass = async (asg: AssignmentItem) => {
    const targetClassId = prompt(
      `Pilih ID Kelas tujuan untuk duplikasi soal "${asg.title}":\n` +
        classes.map((c) => `${c.id} : ${c.name}`).join('\n'),
      classes[0]?.id
    );
    if (!targetClassId) return;

    try {
      await apiFetch(`/api/assignments/${asg.id}/duplicate`, {
        method: 'POST',
        body: JSON.stringify({ targetClassId }),
      });
      alert('Soal berhasil diduplikasi ke kelas target!');
      loadAllData();
    } catch (err: any) {
      alert('Gagal duplikasi: ' + err.message);
    }
  };

  // Admin User Management Handlers (req 4)
  const handleToggleUserStatus = async (targetUser: User) => {
    const newStatus = targetUser.isActive === false ? true : false;
    const actionLabel = newStatus ? 'mengaktifkan' : 'menonaktifkan';
    if (!confirm(`Apakah Anda yakin ingin ${actionLabel} akun ${targetUser.nama} (@${targetUser.username})?`)) return;

    try {
      await apiFetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: newStatus }),
      });
      loadAllData();
      alert(`Akun berhasil di-${newStatus ? 'aktifkan' : 'nonaktifkan'}!`);
    } catch (err: any) {
      alert('Gagal mengubah status akun: ' + err.message);
    }
  };

  const handleChangeUserRole = async (targetUserId: string, newRole: UserRole) => {
    if (!confirm(`Ubah wewenang akun ini menjadi ${newRole.toUpperCase()}?`)) return;

    try {
      await apiFetch(`/api/admin/users/${targetUserId}`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });
      loadAllData();
      alert(`Wewenang akun berhasil diubah menjadi ${newRole.toUpperCase()}!`);
    } catch (err: any) {
      alert('Gagal mengubah wewenang: ' + err.message);
    }
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassModal || !newPasswordVal.trim()) return;

    try {
      await apiFetch(`/api/admin/users/${resetPassModal.userId}`, {
        method: 'PUT',
        body: JSON.stringify({ password: newPasswordVal.trim() }),
      });
      alert(`Kata sandi untuk @${resetPassModal.username} berhasil diperbarui!`);
      setResetPassModal(null);
      setNewPasswordVal('');
      loadAllData();
    } catch (err: any) {
      alert('Gagal reset kata sandi: ' + err.message);
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetUsername: string) => {
    if (targetUserId === user.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }
    if (!confirm(`Hapus akun @${targetUsername} secara permanen dari sistem? Tindakan ini tidak dapat dibatalkan.`)) return;

    try {
      await apiFetch(`/api/admin/users/${targetUserId}`, {
        method: 'DELETE',
      });
      loadAllData();
      alert('Akun berhasil dihapus dari sistem.');
    } catch (err: any) {
      alert('Gagal menghapus akun: ' + err.message);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserModal) return;

    try {
      setSavingUserEdit(true);
      await apiFetch(`/api/admin/users/${editingUserModal.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nama: editingUserModal.nama,
          role: editingUserModal.role,
          kelas: editingUserModal.kelas,
          nomorAbsen: editingUserModal.nomorAbsen,
          nip: editingUserModal.nip,
        }),
      });
      alert('Data pengguna berhasil diperbarui!');
      setEditingUserModal(null);
      loadAllData();
    } catch (err: any) {
      alert('Gagal memperbarui data pengguna: ' + err.message);
    } finally {
      setSavingUserEdit(false);
    }
  };

  // Filter Users for Admin Management (req 4)
  const filteredUsers = usersList.filter((u) => {
    const query = userSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      u.nama.toLowerCase().includes(query) ||
      u.username.toLowerCase().includes(query) ||
      (u.nip && u.nip.toLowerCase().includes(query)) ||
      (u.kelas && u.kelas.toLowerCase().includes(query));

    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus =
      userStatusFilter === 'all' ||
      (userStatusFilter === 'active' && u.isActive !== false) ||
      (userStatusFilter === 'inactive' && u.isActive === false);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filter Submissions for "Koreksi" (req 11 & 20)
  const filteredSubmissions = submissions.filter((sub) => {
    if (selectedKoreksiClassId !== 'all' && sub.classId !== selectedKoreksiClassId) return false;
    if (selectedKoreksiAssignmentId !== 'all' && sub.assignmentId !== selectedKoreksiAssignmentId) return false;
    if (koreksiStatusFilter === 'pending' && sub.status !== 'submitted') return false;
    if (koreksiStatusFilter === 'reviewed' && sub.status !== 'reviewed') return false;
    return true;
  });

  // Pending count in teacher's queue
  const pendingCount = submissions.filter((s) => s.status === 'submitted').length;

  // Multi-Select Checkbox logic (req 43)
  const handleToggleSelectSub = (subId: string) => {
    setSelectedSubIds((prev) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedSubIds.length === filteredSubmissions.length) {
      setSelectedSubIds([]);
    } else {
      setSelectedSubIds(filteredSubmissions.map((s) => s.id));
    }
  };

  // Excel Export Handler (req 7 & 43)
  const handleExportSelectedToExcel = () => {
    const subsToExport = submissions.filter((s) => selectedSubIds.includes(s.id));
    if (subsToExport.length === 0) {
      alert('Centang minimal 1 hasil jawaban siswa untuk diekspor ke Excel.');
      return;
    }

    const currentClass = classes.find((c) => c.id === selectedKoreksiClassId);
    const className = currentClass ? currentClass.name : 'Rekap_Kelas';
    const asgTitle =
      selectedKoreksiAssignmentId !== 'all'
        ? assignments.find((a) => a.id === selectedKoreksiAssignmentId)?.title || 'Tugas'
        : 'Semua_Tugas';

    exportSubmissionsToExcel(subsToExport, asgTitle, className);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Teacher Top Header */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-sky-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 border border-white/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Portal {user.role === 'admin' ? 'Administrator' : 'Guru Pengampu'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Dashboard Pembelajaran & Koreksi
          </h1>
          <p className="text-xs sm:text-sm text-indigo-100 mt-1 max-w-xl">
            Kelola kelas, terbitkan LKPD & bank soal, pantau progres dan kecurangan siswa, serta koreksi dengan bantuan AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingAssignment(null);
              setShowBuilder(true);
            }}
            className="px-4 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>+ Buat Materi (GForm)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateClassModal(true)}
            className="px-4 py-2.5 bg-indigo-500/80 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl border border-white/30 transition flex items-center gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span>+ Buat Kelas</span>
          </button>
        </div>
      </div>

      {/* Builder Modal View if active */}
      {showBuilder ? (
        <AssignmentBuilder
          initialData={editingAssignment}
          classes={classes}
          currentUser={user}
          onSaved={() => {
            setShowBuilder(false);
            setEditingAssignment(null);
            loadAllData();
          }}
          onCancel={() => {
            setShowBuilder(false);
            setEditingAssignment(null);
          }}
        />
      ) : (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role === 'admin' ? (
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Pengguna Terdaftar
                </span>
                <div className="text-2xl font-black text-indigo-700 mt-1">
                  {usersList.length}{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    Akun
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Siswa, Guru, & Administrator
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tanggungan Koreksi
                </span>
                <div className="text-2xl font-black text-rose-600 mt-1">
                  {pendingCount}{' '}
                  <span className="text-xs font-semibold text-slate-400">
                    Perlu Diperiksa
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Kolom tugas siswa yang belum dinilai
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Jawaban Masuk
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {submissions.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dari seluruh kelas & tugas
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Materi / Soal Aktif
              </span>
              <div className="text-2xl font-black text-slate-800 mt-1">
                {assignments.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                LKPD, Bank Soal & Evaluasi
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Kelas yang Diampu
              </span>
              <div className="text-2xl font-black text-purple-700 mt-1">
                {classes.length}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {classes.reduce((sum, c) => sum + (c.studentIds?.length || 0), 0)} Siswa Terdaftar
              </p>
            </div>
          </div>

          {/* Teacher Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-0.5">
            {/* If Admin, show Manajemen Akun & Wewenang (req 4) */}
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === 'users'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <UserCog className="w-4 h-4 text-indigo-600" />
                <span>Manajemen Akun & Wewenang ({usersList.length})</span>
              </button>
            )}

            {/* If NOT Admin (Guru only), show Koreksi & Rekap Nilai (req 3: hapus fitur admin untuk koreksi dan rekap nilai) */}
            {user.role !== 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('koreksi')}
                className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                  activeTab === 'koreksi'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Koreksi & Rekap Nilai</span>
                {pendingCount > 0 && (
                  <span className="text-[10px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('kelas')}
              className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                activeTab === 'kelas'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Daftar Kelas ({classes.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('materi')}
              className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                activeTab === 'materi'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Manajemen Soal ({assignments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('arsip')}
              className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                activeTab === 'arsip'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>Bank Arsip & Duplikasi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pengumuman')}
              className={`flex items-center gap-2 pb-3.5 px-4 text-xs font-bold border-b-2 transition shrink-0 ${
                activeTab === 'pengumuman'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Jadwal & Pengumuman ({announcements.length})</span>
            </button>
          </div>

          {/* TAB 0: MANAJEMEN AKUN & WEWENANG (Admin Only, req 4) */}
          {activeTab === 'users' && user.role === 'admin' && (
            <div className="space-y-6">
              {/* Header & Filter Controls */}
              <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-indigo-600" />
                      Manajemen Akun & Kontrol Wewenang
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Kelola aktivasi akun, ubah wewenang/role, reset kata sandi, dan edit informasi seluruh pengguna.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                      Menampilkan: {filteredUsers.length} dari {usersList.length} Akun
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                  {/* Search Query */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Cari nama, username, NIP, kelas..."
                      className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Filter Role */}
                  <div>
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="all">Semua Wewenang / Peran</option>
                      <option value="siswa">Siswa</option>
                      <option value="guru">Guru</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>

                  {/* Filter Status */}
                  <div>
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="all">Semua Status Akun</option>
                      <option value="active">Akun Aktif Saja</option>
                      <option value="inactive">Akun Dinonaktifkan Saja</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3.5 px-4">Pengguna</th>
                        <th className="py-3.5 px-4">Wewenang (Role)</th>
                        <th className="py-3.5 px-4">Atribut Khusus</th>
                        <th className="py-3.5 px-4 text-center">Status Akun</th>
                        <th className="py-3.5 px-4 text-right">Tindakan Administrator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Tidak ditemukan akun yang sesuai kriteria pencarian.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => {
                          const isCurrentUser = u.id === user.id;
                          const isActive = u.isActive !== false;

                          return (
                            <tr
                              key={u.id}
                              className={`hover:bg-slate-50/70 transition ${
                                !isActive ? 'bg-rose-50/30' : ''
                              }`}
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                  {u.nama}
                                  {isCurrentUser && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                      Anda
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span>@{u.username}</span>
                                  {u.tglLahir && (
                                    <span className="text-slate-400">
                                      • Lahir: {u.tglLahir}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                                    u.role === 'admin'
                                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : u.role === 'guru'
                                      ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                                  }`}
                                >
                                  {u.role === 'admin'
                                    ? 'Administrator'
                                    : u.role === 'guru'
                                    ? 'Guru Pengampu'
                                    : 'Siswa'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 text-slate-600">
                                {u.role === 'siswa' ? (
                                  <div>
                                    <span className="font-semibold text-slate-700">
                                      {u.kelas || '-'}
                                    </span>
                                    {u.nomorAbsen && (
                                      <span className="text-slate-400 ml-1.5">
                                        (No. Absen: {u.nomorAbsen})
                                      </span>
                                    )}
                                  </div>
                                ) : u.role === 'guru' ? (
                                  <div>
                                    <span className="font-semibold text-slate-700">
                                      NIP: {u.nip || '-'}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic">Hak Akses Penuh</span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {isActive ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <UserCheck className="w-3.5 h-3.5" />
                                    Aktif
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    <UserX className="w-3.5 h-3.5" />
                                    Dinonaktifkan
                                  </span>
                                )}
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Toggle Active / Nonaktif (req 4) */}
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleUserStatus(u)}
                                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                                        isActive
                                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                                      }`}
                                      title={isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                    >
                                      {isActive ? (
                                        <UserX className="w-3.5 h-3.5" />
                                      ) : (
                                        <UserCheck className="w-3.5 h-3.5" />
                                      )}
                                      <span className="hidden sm:inline">
                                        {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                      </span>
                                    </button>
                                  )}

                                  {/* Change Role / Wewenang Dropdown (req 4) */}
                                  {!isCurrentUser && (
                                    <select
                                      value={u.role}
                                      onChange={(e) =>
                                        handleChangeUserRole(u.id, e.target.value as UserRole)
                                      }
                                      className="py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold border-none cursor-pointer focus:outline-none"
                                      title="Ubah Wewenang Akun"
                                    >
                                      <option value="siswa">Peran Siswa</option>
                                      <option value="guru">Peran Guru</option>
                                      <option value="admin">Peran Admin</option>
                                    </select>
                                  )}

                                  {/* Reset Password Button (req 4) */}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setResetPassModal({
                                        userId: u.id,
                                        username: u.username,
                                        nama: u.nama,
                                      })
                                    }
                                    className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition flex items-center gap-1"
                                    title="Reset Kata Sandi"
                                  >
                                    <KeyRound className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Reset Sandi</span>
                                  </button>

                                  {/* Edit User Detail Button */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserModal(u)}
                                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition"
                                    title="Edit Informasi Pengguna"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete User Button */}
                                  {!isCurrentUser && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id, u.username)}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition"
                                      title="Hapus Akun Permanen"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: KOREKSI & REKAP NILAI (Guru only, req 3) */}
          {activeTab === 'koreksi' && user.role !== 'admin' && (
            <div className="space-y-6">
              {/* Filter Controls (req 11: terpisah per kelas dan per tugas) */}
              <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Class Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Pilih Kelas:
                      </label>
                      <select
                        value={selectedKoreksiClassId}
                        onChange={(e) => setSelectedKoreksiClassId(e.target.value)}
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                      >
                        <option value="all">Semua Kelas</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Assignment Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Pilih Hal yang Dikerjakan:
                      </label>
                      <select
                        value={selectedKoreksiAssignmentId}
                        onChange={(e) =>
                          setSelectedKoreksiAssignmentId(e.target.value)
                        }
                        className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-800"
                      >
                        <option value="all">Semua Materi / Tugas</option>
                        {assignments.map((a) => (
                          <option key={a.id} value={a.id}>
                            [{a.type.toUpperCase()}] {a.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 mb-1">
                        Status Koreksi:
                      </label>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setKoreksiStatusFilter('pending')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                            koreksiStatusFilter === 'pending'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Tanggungan ({pendingCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setKoreksiStatusFilter('reviewed')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                            koreksiStatusFilter === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Sudah Dinilai
                        </button>
                        <button
                          type="button"
                          onClick={() => setKoreksiStatusFilter('all')}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                            koreksiStatusFilter === 'all'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Semua
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Excel Download Button with Checkboxes (req 7, 43) */}
                  <div className="flex items-center gap-2 self-end">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      {selectedSubIds.length === filteredSubmissions.length &&
                      filteredSubmissions.length > 0
                        ? 'Batal Pilih Semua'
                        : 'Pilih Semua'}
                    </button>

                    <button
                      type="button"
                      disabled={selectedSubIds.length === 0}
                      onClick={handleExportSelectedToExcel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-100 flex items-center gap-1.5 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        Unduh Rekap Excel ({selectedSubIds.length})
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submissions List */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Daftar Pengumpulan Jawaban ({filteredSubmissions.length})</span>
                  <span className="text-[11px] text-slate-400">
                    Centang baris yang ingin di-download ke format Excel
                  </span>
                </div>

                {filteredSubmissions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-xs">
                    {koreksiStatusFilter === 'pending'
                      ? '✨ Tidak ada tanggungan koreksi pada kriteria ini. Semua tugas sudah diperiksa!'
                      : 'Tidak ditemukan pengumpulan tugas pada filter ini.'}
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const asg = assignments.find((a) => a.id === sub.assignmentId);
                      const isSelected = selectedSubIds.includes(sub.id);

                      return (
                        <div
                          key={sub.id}
                          className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                            isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Checkbox for Excel download (req 43) */}
                            <button
                              type="button"
                              onClick={() => handleToggleSelectSub(sub.id)}
                              className="mt-1 text-slate-400 hover:text-indigo-600"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-indigo-600" />
                              ) : (
                                <Square className="w-5 h-5 text-slate-300" />
                              )}
                            </button>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800">
                                  {sub.studentName}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  ({sub.studentClass} - Absen {sub.studentAbsen || '-'})
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    sub.cheatingCount > 0
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-emerald-100 text-emerald-700'
                                  }`}
                                >
                                  {sub.cheatingCount > 0
                                    ? `⚠️ ${sub.cheatingCount}x Kecurangan`
                                    : 'Tertib (0x)'}
                                </span>
                              </div>

                              <p className="text-xs text-indigo-900 font-semibold mt-1">
                                {sub.assignmentTitle}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Dikumpulkan:{' '}
                                {new Date(sub.submittedAt).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 self-end sm:self-center">
                            <div className="text-right">
                              <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                Nilai Akhir
                              </span>
                              <span
                                className={`text-sm font-black ${
                                  sub.status === 'reviewed'
                                    ? 'text-emerald-700'
                                    : 'text-amber-600'
                                }`}
                              >
                                {sub.status === 'reviewed'
                                  ? `${sub.totalScore} / ${sub.maxScore}`
                                  : 'Tanggungan'}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (asg) setGradingSubmission({ sub, asg });
                              }}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                                sub.status === 'reviewed'
                                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                              }`}
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>
                                {sub.status === 'reviewed'
                                  ? 'Lihat / Edit Koreksi'
                                  : 'Koreksi dengan AI'}
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: MANAJEMEN AKUN & WEWENANG (Admin Only, req 4) */}
          {activeTab === 'users' && user.role === 'admin' && (
            <div className="space-y-6">
              {/* Filter & Search Bar */}
              <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                      <UserCog className="w-5 h-5 text-indigo-600" />
                      Manajemen Akun & Wewenang Pengguna
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Administrator memiliki otoritas penuh untuk mengaktifkan/menonaktifkan akun, mengubah peran (wewenang), dan mereset kata sandi.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search by name/username */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Cari nama atau username..."
                        className="pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60 bg-white"
                      />
                    </div>

                    {/* Filter by Role */}
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
                    >
                      <option value="all">Semua Peran</option>
                      <option value="siswa">Siswa Saja</option>
                      <option value="guru">Guru Saja</option>
                      <option value="admin">Admin Saja</option>
                    </select>

                    {/* Filter by Status */}
                    <select
                      value={userStatusFilter}
                      onChange={(e) => setUserStatusFilter(e.target.value)}
                      className="px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-medium text-slate-700"
                    >
                      <option value="all">Semua Status</option>
                      <option value="active">Akun Aktif</option>
                      <option value="inactive">Dinonaktifkan</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600">
                  <span>Daftar Seluruh Pengguna Sistem</span>
                  <span className="text-[11px] text-slate-400">
                    Total: {usersList.length} Akun
                  </span>
                </div>

                {(() => {
                  const filtered = usersList.filter((u) => {
                    const matchQuery =
                      !userSearchQuery.trim() ||
                      u.nama.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                      u.username.toLowerCase().includes(userSearchQuery.toLowerCase());
                    const matchRole =
                      userRoleFilter === 'all' || u.role === userRoleFilter;
                    const isActive = u.isActive !== false;
                    const matchStatus =
                      userStatusFilter === 'all' ||
                      (userStatusFilter === 'active' && isActive) ||
                      (userStatusFilter === 'inactive' && !isActive);
                    return matchQuery && matchRole && matchStatus;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="py-16 text-center text-slate-400 text-xs">
                        Tidak ada pengguna yang sesuai dengan filter pencarian.
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-slate-100">
                      {filtered.map((u) => {
                        const isCurrent = u.id === user.id;
                        const isActive = u.isActive !== false;

                        return (
                          <div
                            key={u.id}
                            className={`p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition ${
                              !isActive ? 'bg-rose-50/40 opacity-90' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-3.5">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 text-white ${
                                  u.role === 'admin'
                                    ? 'bg-indigo-600'
                                    : u.role === 'guru'
                                    ? 'bg-purple-600'
                                    : 'bg-emerald-600'
                                }`}
                              >
                                {u.nama.charAt(0).toUpperCase()}
                              </div>

                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-sm text-slate-800">
                                    {u.nama}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                                    @{u.username}
                                  </span>
                                  {isCurrent && (
                                    <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                                      Akun Anda
                                    </span>
                                  )}

                                  {/* Status Badge */}
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                      isActive
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                      }`}
                                    ></span>
                                    {isActive ? 'Aktif' : 'Dinonaktifkan'}
                                  </span>
                                </div>

                                <p className="text-xs text-slate-500 mt-1">
                                  Peran: <b className="uppercase text-slate-700">{u.role}</b>
                                  {u.role === 'siswa' && (
                                    <span> • {u.kelas || '-'} • No. Absen: {u.nomorAbsen || '-'}</span>
                                  )}
                                  {u.role === 'guru' && (
                                    <span> • NIP: {u.nip || '-'}</span>
                                  )}
                                  <span> • Lahir: {u.tglLahir || '-'}</span>
                                </p>
                              </div>
                            </div>

                            {/* Admin Controls for this user (req 4) */}
                            <div className="flex flex-wrap items-center gap-2 self-end lg:self-center">
                              {/* Wewenang Selector */}
                              <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-xl">
                                <span className="text-[11px] font-bold text-slate-500">
                                  Wewenang:
                                </span>
                                <select
                                  value={u.role}
                                  disabled={isCurrent}
                                  onChange={(e) =>
                                    handleChangeUserRole(u.id, e.target.value as UserRole)
                                  }
                                  className="text-xs font-bold text-indigo-700 bg-transparent focus:outline-none cursor-pointer"
                                >
                                  <option value="siswa">Siswa</option>
                                  <option value="guru">Guru</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </div>

                              {/* Toggle Active / Nonaktifkan */}
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                                    isActive
                                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                  }`}
                                  title={
                                    isActive
                                      ? 'Nonaktifkan akun pengguna ini (mencegah login)'
                                      : 'Aktifkan kembali akun ini'
                                  }
                                >
                                  {isActive ? (
                                    <>
                                      <UserX className="w-3.5 h-3.5" />
                                      <span>Nonaktifkan</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="w-3.5 h-3.5" />
                                      <span>Aktifkan</span>
                                    </>
                                  )}
                                </button>
                              )}

                              {/* Reset Password */}
                              <button
                                type="button"
                                onClick={() =>
                                  setResetPassModal({
                                    userId: u.id,
                                    username: u.username,
                                    nama: u.nama,
                                  })
                                }
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                title="Reset kata sandi pengguna"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Reset Password</span>
                              </button>

                              {/* Edit Profile */}
                              <button
                                type="button"
                                onClick={() => setEditingUserModal(u)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                                title="Edit profil data akun"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Delete User */}
                              {!isCurrent && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id, u.username)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                                  title="Hapus akun"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: DAFTAR KELAS (req 3, 10, 25) */}
          {activeTab === 'kelas' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Kelas Pembelajaran Aktif
                  </h2>
                  <p className="text-xs text-slate-500">
                    Klik pada kelas untuk melihat daftar siswa, nomor absen, dan manajemen anggota.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Buat Kelas Baru</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    onClick={() => setActiveClassDetail(cls)}
                    className="bg-white rounded-3xl border border-indigo-100 hover:border-indigo-300 hover:shadow-lg transition p-6 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {cls.grade}
                        </span>
                        <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                          {cls.uniqueCode}
                        </span>
                      </div>

                      <h3 className="text-base font-extrabold text-slate-800 line-clamp-1">
                        {cls.name}
                      </h3>
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                        {cls.subject}
                      </p>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {cls.description || 'Tidak ada deskripsi kelas.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Users className="w-3.5 h-3.5 text-indigo-600" />
                        {cls.studentIds?.length || 0} Siswa Bergabung
                      </span>
                      <span className="text-indigo-600 font-bold hover:underline">
                        Lihat Siswa & Absen ➔
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MANAJEMEN MATERI / SOAL (req 3, 30, 39) */}
          {activeTab === 'materi' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Daftar Materi, LKPD, Bank Soal, & Evaluasi UH
                  </h2>
                  <p className="text-xs text-slate-500">
                    Materi yang telah dibuat dapat diedit dan dihapus. Perubahan sebelum terbit akan otomatis tersinkron ke siswa.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingAssignment(null);
                    setShowBuilder(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Tambah Materi Baru</span>
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                {assignments.map((asg) => {
                  const targetClass = classes.find((c) => c.id === asg.classId);

                  return (
                    <div
                      key={asg.id}
                      className="p-5 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {asg.type === 'lkpd'
                                ? 'LKPD'
                                : asg.type === 'bank_soal'
                                ? 'Bank Soal'
                                : 'Evaluasi UH'}
                            </span>
                            <span className="text-xs font-semibold text-slate-600">
                              {targetClass?.name || 'Kelas'}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 mt-1">
                            {asg.title}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {asg.chapter} • {asg.questions.length} Butir Soal • Durasi: {asg.durationMinutes || 45} Menit
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Terbit:{' '}
                            {new Date(asg.publishDate).toLocaleString('id-ID')} • Tenggat:{' '}
                            {new Date(asg.deadline).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssignment(asg);
                            setShowBuilder(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(asg.id)}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: BANK ARSIP & DUPLIKASI KE KELAS LAIN (req 38) */}
          {activeTab === 'arsip' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">
                  Bank Arsip Soal & Replikasi Antar Kelas
                </h2>
                <p className="text-xs text-slate-500">
                  Gunakan kembali soal dan evaluasi yang sudah pernah dibuat untuk diterbitkan ke kelas lain dengan jadwal baru.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assignments.map((asg) => (
                  <div
                    key={asg.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {asg.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {asg.questions.length} Butir Soal
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800">
                      {asg.title}
                    </h3>
                    <p className="text-xs text-slate-500">{asg.chapter}</p>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleDuplicateToClass(asg)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Duplikasi ke Kelas Lain</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(asg.id)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                      >
                        Hapus Arsip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: JADWAL & PENGUMUMAN (req 6, 42) */}
          {activeTab === 'pengumuman' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-800">
                    Pengumuman & Penjadwalan Tugas
                  </h2>
                  <p className="text-xs text-slate-500">
                    Pengumuman akan muncul di dashboard siswa dan memicu tanda lonceng notifikasi di atas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAnnModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Buat Pengumuman</span>
                </button>
              </div>

              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {ann.className || 'Semua Kelas'}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {ann.authorName}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800">
                      {ann.title}
                    </h3>

                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Class Details Modal (Student list + Absence Numbers, req 10) */}
      {activeClassDetail && (
        <TeacherClassDetailModal
          classroom={activeClassDetail}
          currentUser={user}
          onClose={() => setActiveClassDetail(null)}
          onClassUpdated={() => loadAllData()}
        />
      )}

      {/* Grading Modal (req 4, 15, 18, 20, 28, 44) */}
      {gradingSubmission && (
        <TeacherGradingModal
          submission={gradingSubmission.sub}
          assignment={gradingSubmission.asg}
          currentUser={user}
          onClose={() => setGradingSubmission(null)}
          onGradedSuccess={(updated) => {
            setGradingSubmission(null);
            loadAllData();
          }}
        />
      )}

      {/* Create Class Modal */}
      {showCreateClassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">
              Buat Kelas Pembelajaran Baru
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Sistem akan otomatis menghasilkan kode unik kelas yang dapat dibagikan kepada siswa.
            </p>

            <form onSubmit={handleCreateClass} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Kelas
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="cth. Kelas 8A - IPA Terpadu"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={newClassSubject}
                  onChange={(e) => setNewClassSubject(e.target.value)}
                  placeholder="cth. Ilmu Pengetahuan Alam (IPA)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Jenjang / Tingkat
                </label>
                <input
                  type="text"
                  required
                  value={newClassGrade}
                  onChange={(e) => setNewClassGrade(e.target.value)}
                  placeholder="cth. Kelas 8A"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi / Info Kelas
                </label>
                <textarea
                  rows={2}
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  placeholder="Deskripsi ringkas kelas..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateClassModal(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingClass}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  {creatingClass ? 'Membuat...' : 'Buat Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Post Announcement Modal (req 6, 42) */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">
              Buat Pengumuman / Jadwal Ujian
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pengumuman akan langsung muncul pada dashboard dan ikon lonceng seluruh siswa terkait.
            </p>

            <form onSubmit={handlePostAnnouncement} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Kelas:
                </label>
                <select
                  value={annClassId}
                  onChange={(e) => setAnnClassId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="all">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Pengumuman
                </label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="cth. Jadwal Ulangan Harian Bab 1 Respirasi"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Isi Pesan Pengumuman
                </label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Tuliskan detail jadwal, instruksi pengerjaan, atau materi yang perlu dipersiapkan..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnnModal(false)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={postingAnn}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  {postingAnn ? 'Menerbitkan...' : 'Kirim Pengumuman'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal (Admin, req 4) */}
      {resetPassModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              Reset Kata Sandi Akun
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              Akun: <b>{resetPassModal.nama}</b> (@{resetPassModal.username})
            </p>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi Baru:
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetPassModal(null);
                    setNewPasswordVal('');
                  }}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!newPasswordVal.trim()}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  Simpan Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Details Modal (Admin, req 4) */}
      {editingUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-extrabold text-slate-800 mb-1">
              Edit Data Akun Pengguna
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Username: <b className="font-mono">@{editingUserModal.username}</b>
            </p>

            <form onSubmit={handleSaveEditUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap:
                </label>
                <input
                  type="text"
                  required
                  value={editingUserModal.nama}
                  onChange={(e) =>
                    setEditingUserModal({ ...editingUserModal, nama: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran / Wewenang:
                </label>
                <select
                  value={editingUserModal.role}
                  onChange={(e) =>
                    setEditingUserModal({
                      ...editingUserModal,
                      role: e.target.value as UserRole,
                    })
                  }
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {editingUserModal.role === 'siswa' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Kelas:
                    </label>
                    <input
                      type="text"
                      value={editingUserModal.kelas || ''}
                      onChange={(e) =>
                        setEditingUserModal({
                          ...editingUserModal,
                          kelas: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor Absen:
                    </label>
                    <input
                      type="number"
                      value={editingUserModal.nomorAbsen || 0}
                      onChange={(e) =>
                        setEditingUserModal({
                          ...editingUserModal,
                          nomorAbsen: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                    />
                  </div>
                </div>
              )}

              {editingUserModal.role === 'guru' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NIP:
                  </label>
                  <input
                    type="text"
                    value={editingUserModal.nip || ''}
                    onChange={(e) =>
                      setEditingUserModal({
                        ...editingUserModal,
                        nip: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUserModal(null)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md"
                >
                  {savingUserEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
