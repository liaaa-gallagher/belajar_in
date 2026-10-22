import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Copy,
  Check,
  UserPlus,
  Trash2,
  GraduationCap,
  BookOpen,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ClassRoom, User } from '../types';
import { apiFetch } from '../utils/api';

interface TeacherClassDetailModalProps {
  classroom: ClassRoom;
  currentUser: User;
  onClose: () => void;
  onClassUpdated: () => void;
}

export const TeacherClassDetailModal: React.FC<TeacherClassDetailModalProps> = ({
  classroom,
  currentUser,
  onClose,
  onClassUpdated,
}) => {
  const [classDetails, setClassDetails] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Manual Add Student/Teacher State
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  const [addingMember, setAddingMember] = useState(false);

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      const [cls, users] = await Promise.all([
        apiFetch<any>(`/api/classes/${classroom.id}`),
        apiFetch<User[]>('/api/admin/users'),
      ]);
      setClassDetails(cls);
      setAllUsers(users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassDetails();
  }, [classroom.id]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroom.uniqueCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;

    try {
      setAddingMember(true);
      const user = allUsers.find((u) => u.id === selectedUserToAdd);
      await apiFetch(`/api/classes/${classroom.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          memberId: selectedUserToAdd,
          role: user?.role || 'siswa',
        }),
      });
      setSelectedUserToAdd('');
      fetchClassDetails();
      onClassUpdated();
    } catch (err: any) {
      alert('Gagal menambahkan anggota: ' + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (!confirm('Apakah Anda yakin ingin mengeluarkan anggota ini dari kelas?')) return;

    try {
      await apiFetch(`/api/classes/${classroom.id}/members`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'remove',
          memberId,
          role: memberRole,
        }),
      });
      fetchClassDetails();
      onClassUpdated();
    } catch (err: any) {
      alert('Gagal menghapus anggota: ' + err.message);
    }
  };

  // Filter users not yet in this class
  const existingIds = new Set([
    ...(classDetails?.studentIds || []),
    ...(classDetails?.teacherIds || [classroom.teacherId]),
  ]);
  const availableUsersToAdd = allUsers.filter((u) => !existingIds.has(u.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
              {classroom.grade} • {classroom.subject}
            </span>
            <h2 className="text-xl font-black text-slate-800 mt-1">
              {classroom.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Guru Pengampu: {classroom.teacherName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unique Code Share Card (req 3) */}
        <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-sky-50 border border-indigo-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 block">
              Kode Unik Gabung Kelas Siswa:
            </span>
            <div className="text-xl font-mono font-black text-indigo-700 tracking-wider">
              {classroom.uniqueCode}
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* List of Enrolled Students with Absence Numbers (req 10) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Daftar Siswa Terdaftar ({classDetails?.students?.length || 0})</span>
              </h3>
            </div>

            {loading ? (
              <p className="text-xs text-slate-400 py-4 text-center">Memuat daftar siswa...</p>
            ) : (!classDetails?.students || classDetails.students.length === 0) ? (
              <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                Belum ada siswa yang bergabung ke kelas ini. Bagikan kode kelas di atas kepada siswa.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {classDetails.students.map((st: any) => (
                  <div
                    key={st.id}
                    className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0">
                        {st.nomorAbsen || '#'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{st.nama}</p>
                        <p className="text-[11px] text-slate-500">
                          Username: @{st.username} • No. Absen: {st.nomorAbsen || '-'} • Kelas: {st.kelas}
                        </p>
                      </div>
                    </div>

                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(st.id, 'siswa')}
                        className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition"
                        title="Keluarkan dari kelas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Manual Member Adder (Admin only) */}
          {currentUser.role === 'admin' && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Tambah Anggota Manual ke Kelas (Admin)
              </h4>
              <form onSubmit={handleAddMember} className="flex gap-2">
                <select
                  value={selectedUserToAdd}
                  onChange={(e) => setSelectedUserToAdd(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">Pilih pengguna dari sistem...</option>
                  {availableUsersToAdd.map((u) => (
                    <option key={u.id} value={u.id}>
                      [{u.role.toUpperCase()}] {u.nama} (@{u.username})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={addingMember || !selectedUserToAdd}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition"
                >
                  {addingMember ? 'Menambahkan...' : 'Tambahkan'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
