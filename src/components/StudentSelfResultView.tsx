import React, { useState } from 'react';
import {
  FileText,
  Download,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Sparkles,
  Calendar,
  Award,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { AssignmentItem, Submission, User } from '../types';
import { exportStudentSubmissionPdf } from '../utils/pdfExport';
import { apiFetch } from '../utils/api';

interface StudentSelfResultViewProps {
  assignment: AssignmentItem;
  submission: Submission;
  currentUser: User;
  onBack: () => void;
  onUpdatedSubmission?: (sub: Submission) => void;
}

export const StudentSelfResultView: React.FC<StudentSelfResultViewProps> = ({
  assignment,
  submission,
  currentUser,
  onBack,
  onUpdatedSubmission,
}) => {
  const [currentSub, setCurrentSub] = useState<Submission>(submission);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      await exportStudentSubmissionPdf(assignment, currentSub);
    } catch (err: any) {
      alert('Gagal mengunduh PDF: ' + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSendDialogueReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await apiFetch<{ dialogue: any[] }>(
        `/api/submissions/${currentSub.id}/dialogue`,
        {
          method: 'POST',
          body: JSON.stringify({
            senderRole: currentUser.role,
            senderName: currentUser.nama,
            text: replyText.trim(),
          }),
        }
      );

      const updated = { ...currentSub, dialogue: res.dialogue };
      setCurrentSub(updated);
      setReplyText('');
      if (onUpdatedSubmission) onUpdatedSubmission(updated);
    } catch (err: any) {
      alert('Gagal mengirim balasan: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const isGraded = currentSub.status === 'reviewed';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </button>

        {/* Download PDF button (req 7, 22, 47) */}
        <button
          type="button"
          disabled={downloadingPdf}
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition"
        >
          <Download className="w-4 h-4" />
          {downloadingPdf ? 'Membuat PDF...' : 'Unduh Hasil & Koreksi (PDF)'}
        </button>
      </div>

      {/* Document Sheet Container (seperti dokumen pengerjaan, req 26, 27) */}
      <div className="bg-white rounded-3xl border border-indigo-100 shadow-xl overflow-hidden mb-8">
        {/* Document Header Banner */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/20 text-white border border-white/30">
                {assignment.type === 'lkpd'
                  ? 'Lembar Kerja Peserta Didik (LKPD)'
                  : assignment.type === 'bank_soal'
                  ? 'Bank Soal / Latihan'
                  : 'Evaluasi Ulangan Harian (UH)'}
              </span>
              <h1 className="text-2xl font-extrabold mt-2 tracking-tight">
                {assignment.title}
              </h1>
              <p className="text-xs text-indigo-100 mt-1">{assignment.chapter}</p>
            </div>

            {/* Score & Status Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-right min-w-[140px]">
              <span className="text-[11px] font-bold uppercase text-indigo-200 block">
                {isGraded ? 'Nilai Tugas' : 'Status Koreksi'}
              </span>
              <div className="text-2xl sm:text-3xl font-black mt-0.5">
                {isGraded ? (
                  <span>
                    {currentSub.totalScore}{' '}
                    <span className="text-sm font-normal text-indigo-200">
                      / {currentSub.maxScore}
                    </span>
                  </span>
                ) : (
                  <span className="text-amber-300 text-base font-bold">
                    Menunggu Koreksi
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Strip */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">Nama Siswa:</span>{' '}
            {currentSub.studentName} ({currentSub.studentClass} - Absen{' '}
            {currentSub.studentAbsen || '-'})
          </div>
          <div>
            <span className="font-semibold text-slate-800">Waktu Pengumpulan:</span>{' '}
            {new Date(currentSub.submittedAt).toLocaleString('id-ID')}
          </div>
        </div>

        {/* Cheating Detection Breakdown (req 8, 29) */}
        <div className="p-6 border-b border-slate-200">
          <div
            className={`p-4 rounded-2xl border ${
              currentSub.cheatingCount > 0
                ? 'bg-rose-50/70 border-rose-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <ShieldAlert
                className={`w-5 h-5 ${
                  currentSub.cheatingCount > 0
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              />
              <h3 className="text-sm font-bold text-slate-800">
                Laporan Integritas & Pendeteksi Kecurangan Pengerjaan:
              </h3>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  currentSub.cheatingCount > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {currentSub.cheatingCount > 0
                  ? `Terdeteksi ${currentSub.cheatingCount}x Pelanggaran`
                  : '0x Pelanggaran (Sangat Tertib)'}
              </span>
            </div>

            {currentSub.cheatingIncidents && currentSub.cheatingIncidents.length > 0 ? (
              <div className="mt-2 space-y-1.5 pl-6 border-l-2 border-rose-300">
                {currentSub.cheatingIncidents.map((inc, i) => (
                  <p key={i} className="text-xs text-rose-800">
                    • <b>Pelanggaran #{i + 1}:</b> Meninggalkan halaman ujian saat membuka{' '}
                    <b>Soal No. {inc.questionNumber}</b> selama{' '}
                    <b>{inc.durationSeconds} detik</b> (pada pukul{' '}
                    {new Date(inc.timestamp).toLocaleTimeString('id-ID')}).
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-800">
                Siswa tidak pernah meninggalkan tab ataupun berpindah aplikasi selama proses pengerjaan.
              </p>
            )}
          </div>
        </div>

        {/* Teacher Overall Feedback */}
        {currentSub.overallFeedback && (
          <div className="p-6 border-b border-slate-200 bg-teal-50/50">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-teal-100 text-teal-700 rounded-xl mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Umpan Balik Keseluruhan dari Guru Pengampu
                </h4>
                <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap font-medium">
                  {currentSub.overallFeedback}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Read-Only Questions & Answers (req 26, 27) */}
        <div className="p-6 sm:p-8 space-y-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-extrabold text-slate-800">
              Dokumen Soal & Jawaban yang Telah Dikumpulkan
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              (Hanya Baca - Tidak dapat diedit kembali)
            </span>
          </div>

          {assignment.questions.map((q) => {
            const studentAns = currentSub.answers.find(
              (a) => a.questionId === q.id || a.questionNumber === q.number
            );
            const qFeedback = currentSub.perQuestionFeedback?.find(
              (f) => f.questionNumber === q.number
            );

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
              >
                {/* Question Info Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                      {q.number}
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Soal Esai'}
                    </span>
                  </div>

                  <div className="text-xs font-bold">
                    {qFeedback ? (
                      <span className="text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-lg">
                        Skor: {qFeedback.scoreAwarded} / {q.points} Poin
                      </span>
                    ) : (
                      <span className="text-slate-500">Bobot: {q.points} Poin</span>
                    )}
                  </div>
                </div>

                {/* Question text & image */}
                <div>
                  <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                    {q.question}
                  </p>
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="Gambar Soal"
                      className="mt-3 max-h-56 rounded-xl object-contain border border-slate-200"
                    />
                  )}
                </div>

                {/* Student's answer */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Jawaban Anda:
                  </span>

                  {q.type === 'pilihan_ganda' ? (
                    <div>
                      {(() => {
                        const opt = q.options?.find(
                          (o) => o.id === studentAns?.selectedOptionId
                        );
                        return opt ? (
                          <div className="text-sm font-bold text-indigo-900 bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                            {opt.text}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400 italic">
                            (Tidak memilih opsi)
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                      {studentAns?.essayText || '(Tidak mengisi teks)'}
                    </div>
                  )}

                  {/* Uploaded photo for this question */}
                  {studentAns?.uploadedPhotoUrl && (
                    <div className="pt-2">
                      <span className="text-xs font-bold text-indigo-700 block mb-1">
                        📷 Lampiran Foto Jawaban Anda:
                      </span>
                      <img
                        src={studentAns.uploadedPhotoUrl}
                        alt={`Bukti Jawaban Soal ${q.number}`}
                        className="max-h-64 rounded-xl border border-indigo-200 object-contain shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Teacher per-question feedback (req 44) */}
                {qFeedback && qFeedback.feedbackText && (
                  <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      Catatan Koreksi Guru:
                    </span>
                    <p className="italic">{qFeedback.feedbackText}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Way Feedback Dialogue Thread (req 48: Siswa memberi umpan balik, Guru membalas) */}
      <div className="bg-white rounded-3xl border border-indigo-100 shadow-md p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-800">
              Diskusi & Umpan Balik Dua Arah (Siswa & Guru)
            </h3>
            <p className="text-xs text-slate-500">
              Sampaikan pertanyaan, klarifikasi, atau tanggapan terkait hasil koreksi guru di sini.
            </p>
          </div>
        </div>

        {/* Dialogue Messages List */}
        <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-1">
          {(!currentSub.dialogue || currentSub.dialogue.length === 0) ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Belum ada percakapan umpan balik. Mulai dengan mengirimkan tanggapan Anda di bawah.
            </div>
          ) : (
            currentSub.dialogue.map((dlg) => {
              const isMe = dlg.senderName === currentUser.nama;
              return (
                <div
                  key={dlg.id}
                  className={`flex flex-col ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[11px] font-semibold text-slate-500">
                    <span>{dlg.senderName}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 uppercase">
                      {dlg.senderRole}
                    </span>
                    <span>• {new Date(dlg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[80%] text-xs font-medium leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                    }`}
                  >
                    {dlg.text}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Send Reply Input */}
        <form onSubmit={handleSendDialogueReply} className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Tuliskan umpan balik atau pertanyaan kepada guru..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
          />
          <button
            type="submit"
            disabled={sendingReply || !replyText.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sendingReply ? 'Mengirim...' : 'Kirim'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
