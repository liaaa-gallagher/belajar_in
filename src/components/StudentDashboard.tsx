import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  AlertCircle,
  FileText,
  Calendar,
  Award,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowRight,
  PlusCircle,
  BarChart3,
  ListTodo,
  ExternalLink,
} from 'lucide-react';
import {
  User,
  ClassRoom,
  AssignmentItem,
  Submission,
  Announcement,
} from '../types';
import { apiFetch } from '../utils/api';

interface StudentDashboardProps {
  user: User;
  onStartAssignment: (assignment: AssignmentItem) => void;
  onViewResult: (assignment: AssignmentItem, submission: Submission) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  user,
  onStartAssignment,
  onViewResult,
}) => {
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Join class modal
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const [activeTab, setActiveTab] = useState<'materi' | 'progres' | 'pengumuman'>('materi');

  const loadData = async () => {
    try {
      const [clsData, asgData, subData, annData] = await Promise.all([
        apiFetch<ClassRoom[]>(`/api/classes?userId=${user.id}`),
        apiFetch<AssignmentItem[]>('/api/assignments?status=published'),
        apiFetch<Submission[]>(`/api/submissions?studentId=${user.id}`),
        apiFetch<Announcement[]>(`/api/announcements?userId=${user.id}`),
      ]);

      setClasses(clsData || []);
      setAssignments(asgData || []);
      setSubmissions(subData || []);
      setAnnouncements(annData || []);
    } catch (err) {
      console.error('Failed to load student data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 8000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setJoining(true);
      setJoinMsg(null);
      const res = await apiFetch<{ message: string; class: ClassRoom }>(
        '/api/classes/join',
        {
          method: 'POST',
          body: JSON.stringify({
            uniqueCode: joinCode.trim(),
            userId: user.id,
          }),
        }
      );
      setJoinMsg({ text: res.message, isError: false });
      setJoinCode('');
      loadData();
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinMsg(null);
      }, 1500);
    } catch (err: any) {
      setJoinMsg({ text: err.message || 'Gagal bergabung ke kelas', isError: true });
    } finally {
      setJoining(false);
    }
  };

  // Filter assignments belonging to student's enrolled classes
  const enrolledClassIds = new Set(classes.map((c) => c.id));
  const myAssignments = assignments.filter((a) => enrolledClassIds.has(a.classId));
  const relevantAnnouncements = announcements.filter(
    (ann) => ann.classId === 'all' || enrolledClassIds.has(ann.classId)
  );

  // Submissions map
  const submissionMap = new Map<string, Submission>();
  submissions.forEach((s) => {
    submissionMap.set(s.assignmentId, s);
  });

  // Calculate Progress Stats (req 12)
  const totalTasks = myAssignments.length;
  const completedTasks = myAssignments.filter((a) => submissionMap.has(a.id)).length;
  const uncompletedTasks = myAssignments.filter((a) => !submissionMap.has(a.id));
  const completionPercentage =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Sequential Order Logic per Chapter (req 13 & 21)
  // Group assignments by chapter
  const chaptersMap = new Map<string, AssignmentItem[]>();
  myAssignments.forEach((a) => {
    const list = chaptersMap.get(a.chapter) || [];
    list.push(a);
    chaptersMap.set(a.chapter, list);
  });

  // Determine if a specific assignment is locked
  const isAssignmentLocked = (item: AssignmentItem): { locked: boolean; reason?: string } => {
    const now = new Date();
    // Publish date check (req 37)
    if (new Date(item.publishDate) > now) {
      return {
        locked: true,
        reason: `Belum terbit. Terbit pada ${new Date(item.publishDate).toLocaleString('id-ID')}`,
      };
    }

    const chapterItems = chaptersMap.get(item.chapter) || [];
    // Sort chapter items: LKPD first, then Bank Soal, then Evaluasi
    const typeOrder = { lkpd: 1, bank_soal: 2, evaluasi: 3 };
    const sorted = [...chapterItems].sort(
      (a, b) => (typeOrder[a.type] || 0) - (typeOrder[b.type] || 0)
    );

    // If student has already submitted Evaluasi or reached it in this chapter, unlock restriction! (req 21)
    const evaluasiItem = sorted.find((i) => i.type === 'evaluasi');
    const hasFinishedEvaluasi = evaluasiItem && submissionMap.has(evaluasiItem.id);
    if (hasFinishedEvaluasi) {
      return { locked: false };
    }

    // Otherwise, check prerequisites in this chapter (req 13 & 21)
    if (item.type === 'bank_soal') {
      const lkpdItem = sorted.find((i) => i.type === 'lkpd');
      if (lkpdItem && !submissionMap.has(lkpdItem.id)) {
        return {
          locked: true,
          reason: 'Kunci Terkunci: Kerjakan dan kumpulkan LKPD terlebih dahulu!',
        };
      }
    } else if (item.type === 'evaluasi') {
      const lkpdItem = sorted.find((i) => i.type === 'lkpd');
      const bankItem = sorted.find((i) => i.type === 'bank_soal');

      if (lkpdItem && !submissionMap.has(lkpdItem.id)) {
        return {
          locked: true,
          reason: 'Kunci Terkunci: Selesaikan LKPD terlebih dahulu!',
        };
      }
      if (bankItem && !submissionMap.has(bankItem.id)) {
        return {
          locked: true,
          reason: 'Kunci Terkunci: Selesaikan Bank Soal / Latihan terlebih dahulu!',
        };
      }
    }

    return { locked: false };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-sky-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-3 border border-white/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Semangat Belajar, {user.nama}!</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Ruang Belajar Digital Siswa
          </h1>
          <p className="text-sm text-indigo-100 mt-1 max-w-xl">
            Kerjakan LKPD, latih pemahaman di Bank Soal, dan selesaikan Ulangan Harian secara runtut & berintegritas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowJoinModal(true)}
          className="px-5 py-3 bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition flex items-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 text-indigo-600" />
          <span>Gabung Kelas Baru</span>
        </button>
      </div>

      {/* Progress Cards & Summary (req 2, 12) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Progress percentage */}
        <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-md flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Progres Pengerjaan
            </span>
            <div className="text-3xl font-black text-slate-800 mt-1">
              {completionPercentage}%
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {completedTasks} dari {totalTasks} tugas telah dikumpulkan
            </p>
          </div>
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-600 transition-all duration-1000 ease-out"
                strokeDasharray={`${completionPercentage}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <TrendingUp className="w-6 h-6 text-indigo-600 absolute" />
          </div>
        </div>

        {/* Belum Dikerjakan (req 12) */}
        <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tanggungan Belum Selesai
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
              {uncompletedTasks.length}
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {uncompletedTasks.length}{' '}
            <span className="text-sm font-semibold text-slate-500">Tugas</span>
          </div>
          <p className="text-xs text-amber-600 font-medium mt-1">
            {uncompletedTasks.length === 0
              ? '✨ Hebat! Semua tugas telah Anda selesaikan.'
              : 'Perhatikan tenggat pengerjaan tugas.'}
          </p>
        </div>

        {/* Kelas Aktif */}
        <div className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kelas Terdaftar
            </span>
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
              {classes.length}
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-1">
            {classes.length}{' '}
            <span className="text-sm font-semibold text-slate-500">Kelas</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {classes.map((c) => c.name).join(', ') || 'Belum ada kelas'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('materi')}
          className={`flex items-center gap-2 pb-3.5 px-4 text-sm font-bold border-b-2 transition ${
            activeTab === 'materi'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Materi, LKPD & Ujian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progres')}
          className={`flex items-center gap-2 pb-3.5 px-4 text-sm font-bold border-b-2 transition ${
            activeTab === 'progres'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Progres Diri & Hasil Koreksi</span>
          {submissions.length > 0 && (
            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
              {submissions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pengumuman')}
          className={`flex items-center gap-2 pb-3.5 px-4 text-sm font-bold border-b-2 transition ${
            activeTab === 'pengumuman'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Pengumuman & Jadwal</span>
          {relevantAnnouncements.length > 0 && (
            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
              {relevantAnnouncements.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MATERI, LKPD & UJIAN */}
      {activeTab === 'materi' && (
        <div className="space-y-8">
          {classes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-indigo-100 shadow-sm">
              <BookOpen className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Belum Bergabung dengan Kelas Apapun
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
                Minta kode unik kelas kepada guru Anda, lalu klik tombol di bawah untuk bergabung.
              </p>
              <button
                type="button"
                onClick={() => setShowJoinModal(true)}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700 transition"
              >
                Masukkan Kode Kelas
              </button>
            </div>
          ) : Array.from(chaptersMap.entries()).length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-indigo-100 shadow-sm">
              <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">
                Belum ada materi atau tugas yang diterbitkan guru pada kelas Anda.
              </p>
            </div>
          ) : (
            Array.from(chaptersMap.entries()).map(([chapterName, items]) => {
              // Sort items: LKPD -> Bank Soal -> Evaluasi
              const typeRank = { lkpd: 1, bank_soal: 2, evaluasi: 3 };
              const sortedItems = [...items].sort(
                (a, b) => (typeRank[a.type] || 0) - (typeRank[b.type] || 0)
              );

              return (
                <div
                  key={chapterName}
                  className="bg-white rounded-3xl border border-indigo-100 shadow-md p-6 sm:p-8 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Bab Pembelajaran
                      </span>
                      <h2 className="text-lg font-black text-slate-800 mt-1">
                        {chapterName}
                      </h2>
                    </div>

                    <p className="text-xs text-slate-500 italic">
                      Aturan: Selesaikan LKPD ➔ Bank Soal ➔ Evaluasi secara runtut
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {sortedItems.map((item) => {
                      const submission = submissionMap.get(item.id);
                      const isCompleted = !!submission;
                      const lockStatus = isAssignmentLocked(item);
                      const isLocked = !isCompleted && lockStatus.locked;

                      // Deadline check (req 17)
                      const isDeadlinePassed =
                        !isCompleted && new Date() > new Date(item.deadline);

                      const typeColor = {
                        lkpd: 'from-blue-500 to-indigo-600',
                        bank_soal: 'from-indigo-500 to-purple-600',
                        evaluasi: 'from-purple-600 to-pink-600',
                      }[item.type];

                      const typeBadge = {
                        lkpd: 'LKPD Digital',
                        bank_soal: 'Bank Soal',
                        evaluasi: 'Evaluasi (UH)',
                      }[item.type];

                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                            isLocked
                              ? 'bg-slate-50 border-slate-200 opacity-80'
                              : isCompleted
                              ? 'bg-emerald-50/40 border-emerald-200 shadow-sm'
                              : 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-lg'
                          }`}
                        >
                          <div>
                            {/* Badges */}
                            <div className="flex items-center justify-between mb-3">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full text-white bg-gradient-to-r ${typeColor}`}
                              >
                                {typeBadge}
                              </span>

                              {isCompleted ? (
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {submission.status === 'reviewed'
                                    ? `Nilai: ${submission.totalScore}`
                                    : 'Sudah Dikumpul'}
                                </span>
                              ) : isLocked ? (
                                <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  Terkunci
                                </span>
                              ) : isDeadlinePassed ? (
                                <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Tenggat Lewat
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                                  Belum Dikerjakan
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-slate-800 line-clamp-2 mb-1.5">
                              {item.title}
                            </h3>

                            <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                              {item.description || 'Tidak ada deskripsi materi.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            {/* Schedule & Deadline */}
                            <div className="text-[11px] text-slate-500 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span>Tenggat:</span>
                                <span className="font-semibold text-slate-700">
                                  {new Date(item.deadline).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Durasi:</span>
                                <span className="font-semibold text-slate-700">
                                  {item.durationMinutes || 45} Menit
                                </span>
                              </div>
                            </div>

                            {/* Lock Warning Note if locked */}
                            {isLocked && lockStatus.reason && (
                              <p className="text-[10px] text-amber-700 font-semibold bg-amber-50 p-2 rounded-xl">
                                {lockStatus.reason}
                              </p>
                            )}

                            {/* Action Button */}
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => onViewResult(item, submission!)}
                                className="w-full py-2 px-3 bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                              >
                                <Award className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Lihat Hasil & Koreksi</span>
                              </button>
                            ) : isLocked ? (
                              <button
                                disabled
                                className="w-full py-2 px-3 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                              >
                                <Lock className="w-3.5 h-3.5" />
                                <span>Materi Terkunci</span>
                              </button>
                            ) : isDeadlinePassed ? (
                              <button
                                disabled
                                className="w-full py-2 px-3 bg-rose-50 text-rose-400 border border-rose-200 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Tenggat Waktu Lewat</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onStartAssignment(item)}
                                className="w-full py-2 px-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5"
                              >
                                <span>Mulai Kerjakan</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: PROGRES DIRI & HASIL KOREKSI */}
      {activeTab === 'progres' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-md">
            <h2 className="text-lg font-black text-slate-800 mb-1">
              Rekapitulasi Hasil Pengerjaan Saya
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Buka kembali lembar hasil pengerjaan, nilai, catatan feedback guru, serta unduh lembar jawaban ke format PDF.
            </p>

            {submissions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Anda belum mengumpulkan tugas apapun. Kerjakan tugas pada tab Materi untuk melihat hasil di sini.
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => {
                  const asg = assignments.find((a) => a.id === sub.assignmentId);

                  return (
                    <div
                      key={sub.id}
                      className="p-4 sm:p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:bg-slate-50 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0 mt-0.5">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {sub.assignmentType === 'lkpd'
                                ? 'LKPD'
                                : sub.assignmentType === 'bank_soal'
                                ? 'Bank Soal'
                                : 'Evaluasi UH'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(sub.submittedAt).toLocaleDateString('id-ID')}
                            </span>
                          </div>

                          <h3 className="text-sm font-bold text-slate-800 mt-1">
                            {sub.assignmentTitle}
                          </h3>
                          <p className="text-xs text-slate-500">{sub.chapter}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center">
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Nilai Akhir
                          </span>
                          <span className="text-base sm:text-lg font-black text-indigo-700">
                            {sub.totalScore !== undefined
                              ? `${sub.totalScore}/${sub.maxScore}`
                              : 'Menunggu Koreksi'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (asg) onViewResult(asg, sub);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                        >
                          <span>Buka Hasil</span>
                          <ChevronRight className="w-3.5 h-3.5" />
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

      {/* TAB 3: PENGUMUMAN & JADWAL (req 6) */}
      {activeTab === 'pengumuman' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-md">
            <h2 className="text-lg font-black text-slate-800 mb-1">
              Papan Pengumuman & Jadwal Pembelajaran
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Pengumuman resmi dari guru pengampu mata pelajaran dan administrator sekolah.
            </p>

            {relevantAnnouncements.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Belum ada jadwal atau pengumuman untuk kelas Anda.
              </div>
            ) : (
              <div className="space-y-4">
                {relevantAnnouncements.map((ann) => (
                  <div
                    key={ann.id}
                    className="p-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {ann.className || 'Semua Kelas'}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          Oleh {ann.authorName} ({ann.authorRole})
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString('id-ID')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800">
                      {ann.title}
                    </h3>

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 mx-auto">
              <PlusCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 text-center mb-1">
              Gabung ke Kelas Pembelajaran
            </h3>
            <p className="text-xs text-slate-500 text-center mb-5">
              Masukkan 8-12 karakter kode unik yang diberikan oleh guru Anda (cth.{' '}
              <span className="font-mono font-bold text-indigo-600">IPA8A-2026</span>)
            </p>

            {joinMsg && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs font-semibold ${
                  joinMsg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-700'
                    : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                }`}
              >
                {joinMsg.text}
              </div>
            )}

            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kode Unik Kelas
                </label>
                <input
                  type="text"
                  required
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="cth. IPA8A-2026"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono tracking-wider uppercase text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={joining || !joinCode.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {joining ? 'Memeriksa...' : 'Gabung Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
