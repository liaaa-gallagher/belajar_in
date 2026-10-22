import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  X,
  FileQuestion,
  HelpCircle,
  ShieldAlert,
  Camera,
  RefreshCw,
} from 'lucide-react';
import {
  AssignmentItem,
  User,
  StudentAnswer,
  CheatingIncident,
  Submission,
} from '../types';
import { apiFetch } from '../utils/api';

interface StudentWorkInterfaceProps {
  assignment: AssignmentItem;
  user: User;
  onSubmitted: (submission: Submission) => void;
  onCancel: () => void;
}

export const StudentWorkInterface: React.FC<StudentWorkInterfaceProps> = ({
  assignment,
  user,
  onSubmitted,
  onCancel,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, StudentAnswer>>({});

  // Countdown timer
  const [timeLeft, setTimeLeft] = useState<number>(
    (assignment.durationMinutes || 45) * 60
  );

  // Cheating detection
  const [cheatingCount, setCheatingCount] = useState<number>(0);
  const [cheatingIncidents, setCheatingIncidents] = useState<CheatingIncident[]>([]);
  const [cheatWarning, setCheatWarning] = useState<string | null>(null);

  // Real-time Camera state (req 6)
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const blurTimestampRef = useRef<number | null>(null);
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmit('Waktu ujian telah habis!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cheating Detection: Window Blur / Tab Switching / Visibility Change
  useEffect(() => {
    const handleLeave = () => {
      blurTimestampRef.current = Date.now();
    };

    const handleReturn = () => {
      if (blurTimestampRef.current) {
        const durationSec = Math.round((Date.now() - blurTimestampRef.current) / 1000);
        if (durationSec >= 1) {
          const qNum = assignment.questions[currentIndexRef.current]?.number || 1;
          const incident: CheatingIncident = {
            timestamp: new Date().toISOString(),
            questionNumber: qNum,
            durationSeconds: durationSec,
            reason: `Meninggalkan halaman ujian saat membuka Soal No. ${qNum} selama ${durationSec} detik`,
          };

          setCheatingCount((prev) => prev + 1);
          setCheatingIncidents((prev) => [...prev, incident]);
          setCheatWarning(
            `⚠️ PERINGATAN: Terdeteksi meninggalkan layar ujian selama ${durationSec} detik pada Soal No. ${qNum}! Pelanggaran telah dicatat.`
          );
        }
        blurTimestampRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleLeave();
      } else {
        handleReturn();
      }
    };

    window.addEventListener('blur', handleLeave);
    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleLeave);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [assignment.questions]);

  // Handle Answer Changes
  const handleOptionSelect = (optionId: string) => {
    const currentQ = assignment.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: {
        questionId: currentQ.id,
        questionNumber: currentQ.number,
        selectedOptionId: optionId,
        essayText: prev[currentIndex]?.essayText,
        uploadedPhotoUrl: prev[currentIndex]?.uploadedPhotoUrl,
      },
    }));
  };

  const handleEssayChange = (text: string) => {
    const currentQ = assignment.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: {
        questionId: currentQ.id,
        questionNumber: currentQ.number,
        selectedOptionId: prev[currentIndex]?.selectedOptionId,
        essayText: text,
        uploadedPhotoUrl: prev[currentIndex]?.uploadedPhotoUrl,
      },
    }));
  };

  // Upload photo strictly for this question index (req 9, 23)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap unggah file berformat gambar (JPG/PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const currentQ = assignment.questions[currentIndex];
      setAnswers((prev) => ({
        ...prev,
        [currentIndex]: {
          questionId: currentQ.id,
          questionNumber: currentQ.number,
          selectedOptionId: prev[currentIndex]?.selectedOptionId,
          essayText: prev[currentIndex]?.essayText,
          uploadedPhotoUrl: base64, // strictly this question!
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    const currentQ = assignment.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: {
        questionId: currentQ.id,
        questionNumber: currentQ.number,
        selectedOptionId: prev[currentIndex]?.selectedOptionId,
        essayText: prev[currentIndex]?.essayText,
        uploadedPhotoUrl: undefined,
      },
    }));
  };

  // Real-time camera methods (req 6)
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    try {
      setCameraError(null);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Gagal mengakses kamera perangkat. Pastikan izin kamera telah diberikan pada browser Anda.'
      );
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setShowCameraModal(false);
    setCameraError(null);
  };

  const handleOpenLiveCamera = () => {
    setShowCameraModal(true);
    setTimeout(() => {
      startCamera(facingMode);
    }, 150);
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleCaptureRealtimePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg', 0.85);

    const currentQ = assignment.questions[currentIndex];
    setAnswers((prev) => ({
      ...prev,
      [currentIndex]: {
        questionId: currentQ.id,
        questionNumber: currentQ.number,
        selectedOptionId: prev[currentIndex]?.selectedOptionId,
        essayText: prev[currentIndex]?.essayText,
        uploadedPhotoUrl: base64, // strictly this question!
      },
    }));

    stopCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const currentQ = assignment.questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const handleAutoSubmit = async (reason?: string) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const answersList = Object.values(answers);
      const res = await apiFetch<Submission>('/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignmentId: assignment.id,
          studentId: user.id,
          answers: answersList,
          cheatingCount,
          cheatingIncidents,
        }),
      });
      if (reason) alert(reason);
      onSubmitted(res);
    } catch (err: any) {
      alert('Gagal mengumpulkan: ' + err.message);
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    handleAutoSubmit();
  };

  const isQuestionAnswered = (idx: number) => {
    const ans = answers[idx];
    if (!ans) return false;
    return !!(ans.selectedOptionId || ans.essayText?.trim() || ans.uploadedPhotoUrl);
  };

  const answeredCount = Object.keys(answers).filter((k) =>
    isQuestionAnswered(Number(k))
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar with Timer, Cheat Badge, and Assignment Info */}
      <div className="bg-white border-b border-indigo-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                {assignment.type === 'lkpd'
                  ? 'LKPD Digital'
                  : assignment.type === 'bank_soal'
                  ? 'Bank Soal'
                  : 'Evaluasi UH'}
              </span>
              <h2 className="text-base font-extrabold text-slate-800 line-clamp-1">
                {assignment.title}
              </h2>
            </div>
            <p className="text-xs text-slate-500">{assignment.chapter}</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border ${
                timeLeft < 300
                  ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Cheating Counter */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                cheatingCount > 0
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title="Pendeteksi kecurangan saat pengerjaan"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{cheatingCount}x Terdeteksi</span>
            </div>

            <button
              type="button"
              onClick={() => setShowConfirmSubmit(true)}
              className="flex items-center gap-1.5 py-1.5 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Kumpulkan
            </button>
          </div>
        </div>

        {/* Cheat Warning Toast */}
        {cheatWarning && (
          <div className="bg-rose-500 text-white text-xs px-4 py-2 font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{cheatWarning}</span>
            </div>
            <button
              onClick={() => setCheatWarning(null)}
              className="text-white hover:text-rose-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Working Area: 1 Halaman Geser (Slide-style) */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-md p-6 sm:p-8 mb-6">
          {/* Question Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                {currentQ.number}
              </div>
              <div>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {currentQ.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Soal Esai'}
                </span>
                <span className="text-xs text-slate-500 ml-2">
                  Bobot: {currentQ.points} Poin
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Soal {currentIndex + 1} dari {assignment.questions.length}
            </div>
          </div>

          {/* Question Text & Question Image (if teacher uploaded) */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
              {currentQ.question}
            </h3>

            {currentQ.imageUrl && (
              <div className="mt-4 p-2 bg-slate-50 rounded-2xl border border-slate-200 inline-block max-w-full">
                <img
                  src={currentQ.imageUrl}
                  alt="Ilustrasi Soal"
                  className="max-h-72 rounded-xl object-contain"
                />
              </div>
            )}
          </div>

          {/* Answer Section */}
          <div className="space-y-4">
            {currentQ.type === 'pilihan_ganda' ? (
              <div className="space-y-3">
                {currentQ.options?.map((opt, oIdx) => {
                  const letter = String.fromCharCode(65 + oIdx);
                  const isSelected = currentAnswer?.selectedOptionId === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleOptionSelect(opt.id)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {letter}
                      </div>

                      <div className="flex-1">
                        <p
                          className={`text-sm ${
                            isSelected
                              ? 'font-bold text-indigo-900'
                              : 'text-slate-800'
                          }`}
                        >
                          {opt.text}
                        </p>

                        {/* Option image if any */}
                        {opt.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={opt.imageUrl}
                              alt={`Pilihan ${letter}`}
                              className="max-h-36 rounded-lg object-contain border border-slate-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tuliskan Jawaban Esai Anda:
                </label>
                <textarea
                  rows={6}
                  value={currentAnswer?.essayText || ''}
                  onChange={(e) => handleEssayChange(e.target.value)}
                  placeholder="Tuliskan langkah pengerjaan, analisis, atau penjelasan jawaban Anda di sini..."
                  className="w-full p-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800 transition"
                ></textarea>
              </div>
            )}

            {/* Photo Upload for this specific question (req 9, 16, 23) */}
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Unggah Foto Jawaban / Bukti Pengerjaan (Khusus Soal No. {currentQ.number}):
              </label>
              <p className="text-[11px] text-slate-500 mb-2.5">
                Anda dapat memfoto buku catatan, skema gambar, atau hitungan rumus. Foto ini hanya tersimpan pada nomor soal ini.
              </p>

              {currentAnswer?.uploadedPhotoUrl ? (
                <div className="relative inline-block p-2 bg-slate-50 rounded-2xl border border-indigo-200">
                  <img
                    src={currentAnswer.uploadedPhotoUrl}
                    alt={`Jawaban Soal ${currentQ.number}`}
                    className="max-h-60 rounded-xl object-contain shadow-sm"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleOpenLiveCamera}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Foto Ulang (Kamera)
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg flex items-center gap-1 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                      Hapus Foto
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 text-center flex items-center justify-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Foto tersimpan untuk Soal No. {currentQ.number}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenLiveCamera}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition"
                  >
                    <Camera className="w-4 h-4 text-white" />
                    <span>Gunakan Kamera Real-Time</span>
                  </button>

                  <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-slate-600" />
                    <span>Pilih dari Galeri / Berkas</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Navigation Grid & Forward/Backward Buttons */}
        <div className="bg-white rounded-2xl border border-indigo-100 shadow-md p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Back & Next Navigation ("Bolak-balik", req 16) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>

              <button
                type="button"
                disabled={currentIndex === assignment.questions.length - 1}
                onClick={() =>
                  setCurrentIndex((prev) =>
                    Math.min(assignment.questions.length - 1, prev + 1)
                  )
                }
                className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 transition"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Question Number Grid: shows answered vs unanswered */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {assignment.questions.map((q, idx) => {
                const answered = isQuestionAnswered(idx);
                const isCurrent = idx === currentIndex;

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      isCurrent
                        ? 'ring-2 ring-indigo-600 ring-offset-2 bg-indigo-600 text-white'
                        : answered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Summary Progress */}
            <div className="text-xs text-slate-500 font-semibold">
              Terjawab: {answeredCount} / {assignment.questions.length}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Before Submit */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4 mx-auto">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-800 text-center mb-2">
              Kumpulkan Hasil Pengerjaan?
            </h3>

            <p className="text-xs text-slate-600 text-center mb-4">
              Anda telah menjawab <b>{answeredCount}</b> dari{' '}
              <b>{assignment.questions.length}</b> butir soal.
              {answeredCount < assignment.questions.length && (
                <span className="block mt-1 text-amber-600 font-semibold">
                  ⚠️ Ada soal yang belum terisi! Pastikan Anda sudah mengecek seluruh soal.
                </span>
              )}
            </p>

            {/* Cheating Detection Info */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 mb-5">
              <div className="flex items-center justify-between font-bold mb-1">
                <span>Catatan Integritas Ujian:</span>
                <span
                  className={
                    cheatingCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }
                >
                  {cheatingCount > 0
                    ? `${cheatingCount}x Perpindahan Halaman`
                    : 'Tertib (0x Pelanggaran)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Laporan aktivitas pengerjaan dan durasi akan otomatis dikirimkan ke guru pengampu.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSubmit(false)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-indigo-100 transition"
              >
                {submitting ? 'Mengirimkan...' : 'Ya, Kumpulkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Viewfinder Modal (Req 6) */}
      {showCameraModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in">
          {/* Top Camera Bar */}
          <div className="w-full max-w-lg flex items-center justify-between text-white pt-2">
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-indigo-400" />
                Kamera Real-Time
              </h4>
              <p className="text-[11px] text-slate-300">
                Ambil foto jawaban untuk Soal No. {currentQ.number}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5 text-xs font-semibold"
                title="Ganti Kamera Depan/Belakang"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {facingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}
                </span>
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white transition"
                title="Tutup Kamera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Camera Stream Viewport */}
          <div className="relative w-full max-w-lg flex-1 my-3 flex items-center justify-center overflow-hidden rounded-3xl bg-black border border-white/10 shadow-2xl">
            {cameraError ? (
              <div className="p-6 text-center text-rose-300 max-w-sm">
                <AlertTriangle className="w-10 h-10 mx-auto mb-2 text-rose-400" />
                <p className="text-xs font-bold mb-1">Akses Kamera Terkendala</p>
                <p className="text-[11px] leading-relaxed text-slate-300 mb-4">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700"
                >
                  Coba Akses Lagi
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-3xl"
                />
                {/* Viewfinder Target Border Overlay */}
                <div className="absolute inset-6 sm:inset-10 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="text-[10px] text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                    Posisikan lembar jawaban Anda di dalam kotak ini
                  </div>
                  <div className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm self-end">
                    Soal No. {currentQ.number}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Shutter Controls */}
          <div className="w-full max-w-lg flex items-center justify-center gap-6 pb-4">
            <button
              type="button"
              onClick={stopCamera}
              className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition"
            >
              Batal
            </button>

            {!cameraError && (
              <button
                type="button"
                onClick={handleCaptureRealtimePhoto}
                className="w-16 h-16 rounded-full bg-white p-1 hover:scale-105 active:scale-95 transition shadow-lg shadow-white/20 flex items-center justify-center"
                title="Ambil Foto"
              >
                <div className="w-13 h-13 rounded-full border-2 border-slate-900 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold sm:hidden transition"
              title="Balik Kamera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
