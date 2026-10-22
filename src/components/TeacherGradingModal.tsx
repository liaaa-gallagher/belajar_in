import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Award,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  HelpCircle,
  FileText,
  ShieldAlert,
  Clock,
  ChevronRight,
  Eye,
} from 'lucide-react';
import {
  Submission,
  AssignmentItem,
  User,
  AiAnalysisPerQuestion,
  PerQuestionFeedback,
} from '../types';
import { apiFetch } from '../utils/api';

interface TeacherGradingModalProps {
  submission: Submission;
  assignment: AssignmentItem;
  currentUser: User;
  onClose: () => void;
  onGradedSuccess: (updatedSub: Submission) => void;
}

export const TeacherGradingModal: React.FC<TeacherGradingModalProps> = ({
  submission,
  assignment,
  currentUser,
  onClose,
  onGradedSuccess,
}) => {
  const [sub, setSub] = useState<Submission>(submission);
  const [perQuestionFeedback, setPerQuestionFeedback] = useState<
    Record<number, { score: number; feedback: string }>
  >(() => {
    const map: Record<number, { score: number; feedback: string }> = {};
    assignment.questions.forEach((q) => {
      const existing = submission.perQuestionFeedback?.find(
        (f) => f.questionNumber === q.number
      );
      if (existing) {
        map[q.number] = {
          score: existing.scoreAwarded,
          feedback: existing.feedbackText,
        };
      } else {
        // Default preview score for correct multiple choice
        const studentAns = submission.answers.find(
          (a) => a.questionId === q.id || a.questionNumber === q.number
        );
        const isPg = q.type === 'pilihan_ganda';
        const isCorrectPg = isPg && studentAns?.selectedOptionId === q.correctOptionId;
        map[q.number] = {
          score: isCorrectPg ? q.points : 0,
          feedback: '',
        };
      }
    });
    return map;
  });

  const [overallFeedback, setOverallFeedback] = useState(
    submission.overallFeedback || ''
  );

  // AI Analysis state
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiReport, setAiReport] = useState<{
    overall: string;
    perQuestion: AiAnalysisPerQuestion[];
    suggestedTotal: number;
  } | null>(
    submission.aiAnalysisOverall
      ? {
          overall: submission.aiAnalysisOverall,
          perQuestion: submission.aiAnalysisPerQuestion || [],
          suggestedTotal: 0,
        }
      : null
  );

  const [savingGrade, setSavingGrade] = useState(false);

  // Reply to dialogue
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Calculate current sum of scores
  const currentTotalScore = Object.values(perQuestionFeedback).reduce(
    (acc, curr) => acc + (Number(curr.score) || 0),
    0
  );

  // Request AI Analysis (Gemini 3.8 Flash, req 4, 15, 18, 28, 41)
  const handleRequestAiAnalysis = async () => {
    try {
      setAnalyzingAi(true);
      const res = await apiFetch<{
        overallAnalysis: string;
        perQuestion: AiAnalysisPerQuestion[];
        suggestedTotal: number;
      }>('/api/ai/analyze-submission', {
        method: 'POST',
        body: JSON.stringify({ submissionId: sub.id }),
      });

      setAiReport({
        overall: res.overallAnalysis,
        perQuestion: res.perQuestion,
        suggestedTotal: res.suggestedTotal,
      });

      // Populate draft suggestions into feedback fields for convenience
      setPerQuestionFeedback((prev) => {
        const next = { ...prev };
        res.perQuestion.forEach((pq) => {
          if (!next[pq.questionNumber]?.feedback) {
            next[pq.questionNumber] = {
              score: pq.suggestedPoints,
              feedback: pq.suggestedFeedback,
            };
          }
        });
        return next;
      });

      if (!overallFeedback) {
        setOverallFeedback(
          `Hasil pengerjaan Anda telah diperiksa. Tingkat kesesuaian konsep materi mencapai ${Math.round(
            (res.suggestedTotal / sub.maxScore) * 100
          )}%. Pertahankan dan tingkatkan ketelitian pada pengerjaan berikutnya.`
        );
      }
    } catch (err: any) {
      alert('Gagal menjalankan Analisis AI: ' + err.message);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleScoreChange = (qNum: number, score: number) => {
    setPerQuestionFeedback((prev) => ({
      ...prev,
      [qNum]: {
        score,
        feedback: prev[qNum]?.feedback || '',
      },
    }));
  };

  const handleQFeedbackChange = (qNum: number, feedback: string) => {
    setPerQuestionFeedback((prev) => ({
      ...prev,
      [qNum]: {
        score: prev[qNum]?.score ?? 0,
        feedback,
      },
    }));
  };

  // Submit Grade & Feedback (req 20, 44, 45)
  const handleSaveGrading = async () => {
    try {
      setSavingGrade(true);
      const feedbackArray: PerQuestionFeedback[] = Object.entries(
        perQuestionFeedback
      ).map(([numStr, item]) => ({
        questionNumber: Number(numStr),
        scoreAwarded: Number(item.score) || 0,
        feedbackText: item.feedback,
      }));

      const updated = await apiFetch<Submission>(`/api/submissions/${sub.id}/grade`, {
        method: 'PUT',
        body: JSON.stringify({
          totalScore: currentTotalScore,
          overallFeedback,
          perQuestionFeedback: feedbackArray,
        }),
      });

      alert('Nilai dan feedback berhasil disimpan & dikirim ke siswa!');
      onGradedSuccess(updated);
    } catch (err: any) {
      alert('Gagal menyimpan nilai: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  // Reply to Student in Dialogue (req 48)
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      setSendingReply(true);
      const res = await apiFetch<{ dialogue: any[] }>(
        `/api/submissions/${sub.id}/dialogue`,
        {
          method: 'POST',
          body: JSON.stringify({
            senderRole: currentUser.role,
            senderName: currentUser.nama,
            text: replyText.trim(),
          }),
        }
      );
      setSub((prev) => ({ ...prev, dialogue: res.dialogue }));
      setReplyText('');
    } catch (err: any) {
      alert('Gagal mengirim balasan: ' + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-indigo-100 animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-700 via-indigo-700 to-sky-700 text-white rounded-t-3xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/20 border border-white/30">
                Pemeriksaan Tugas Siswa
              </span>
              <span className="text-xs text-indigo-100">
                {sub.assignmentType === 'lkpd'
                  ? 'LKPD'
                  : sub.assignmentType === 'bank_soal'
                  ? 'Bank Soal'
                  : 'Evaluasi UH'}
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight mt-1">
              {sub.assignmentTitle}
            </h2>
            <p className="text-xs text-indigo-200">
              Siswa: <b>{sub.studentName}</b> ({sub.studentClass} - Absen {sub.studentAbsen || '-'}) • Dikumpul: {new Date(sub.submittedAt).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cheating Detection Alert Bar (req 8, 29) */}
          <div
            className={`p-4 rounded-2xl border ${
              sub.cheatingCount > 0
                ? 'bg-rose-50 border-rose-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert
                  className={`w-5 h-5 ${
                    sub.cheatingCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                />
                <span className="text-xs font-bold text-slate-800">
                  Laporan Pendeteksi Kecurangan (Pindah Jendela/Tab saat Pengerjaan):
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  sub.cheatingCount > 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {sub.cheatingCount > 0
                  ? `Terdeteksi ${sub.cheatingCount}x Pelanggaran`
                  : '0x Pelanggaran (Siswa Tertib)'}
              </span>
            </div>

            {sub.cheatingIncidents && sub.cheatingIncidents.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-rose-200 space-y-1">
                {sub.cheatingIncidents.map((inc, i) => (
                  <p key={i} className="text-xs text-rose-800">
                    • <b>Pelanggaran #{i + 1}:</b> Meninggalkan halaman pada <b>Soal No. {inc.questionNumber}</b> selama <b>{inc.durationSeconds} detik</b> ({new Date(inc.timestamp).toLocaleTimeString('id-ID')}).
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* AI Analysis Action & Result Box (req 4, 15, 18, 28, 41) */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/60 to-sky-50/80 rounded-2xl border border-indigo-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Koreksi Pintar dengan Analisis AI (Gemini 3.8 Flash)</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  AI membedah kesesuaian pertanyaan dengan jawaban siswa (menganalisis teks maupun foto tulisan tangan).
                </p>
              </div>

              <button
                type="button"
                disabled={analyzingAi}
                onClick={handleRequestAiAnalysis}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center justify-center gap-2 shrink-0 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {analyzingAi ? 'Menganalisis Jawaban...' : 'Minta Analisis AI'}
                </span>
              </button>
            </div>

            {aiReport && (
              <div className="bg-white rounded-xl p-4 border border-indigo-100 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-900 border-b border-slate-100 pb-2">
                  <span>Rangkuman Penilaian AI Belajarin:</span>
                  <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                    Saran Nilai Total: {aiReport.suggestedTotal} / {sub.maxScore}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {aiReport.overall}
                </p>
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg font-semibold">
                  ℹ️ Pengingat: Nilai akhir dan feedback tetap ditentukan secara manual oleh Guru pengampu.
                </p>
              </div>
            )}
          </div>

          {/* Question by Question Correction (req 20, 24, 28, 44) */}
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Koreksi Butir Soal & Pemberian Nilai Manual
            </h3>

            {assignment.questions.map((q) => {
              const studentAns = sub.answers.find(
                (a) => a.questionId === q.id || a.questionNumber === q.number
              );
              const qState = perQuestionFeedback[q.number] || {
                score: 0,
                feedback: '',
              };
              const pqAi = aiReport?.perQuestion?.find(
                (p) => p.questionNumber === q.number
              );

              return (
                <div
                  key={q.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm"
                >
                  {/* Question Title & Max Points */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {q.number}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Soal Esai'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-slate-600">
                        Skor Siswa:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={q.points}
                        value={qState.score}
                        onChange={(e) =>
                          handleScoreChange(q.number, Number(e.target.value))
                        }
                        className="w-20 px-2 py-1 text-center font-bold text-sm rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-slate-500">/ {q.points} Poin</span>
                    </div>
                  </div>

                  {/* Question Content */}
                  <div>
                    <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                      {q.question}
                    </p>
                    {q.imageUrl && (
                      <img
                        src={q.imageUrl}
                        alt="Soal"
                        className="mt-2 max-h-48 rounded-xl object-contain border border-slate-200"
                      />
                    )}
                  </div>

                  {/* Kunci Jawaban / Rubrik */}
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600">
                    <span className="font-bold text-slate-700">
                      Kunci / Rubrik Acuan:
                    </span>{' '}
                    {q.type === 'pilihan_ganda'
                      ? `Opsi Benar: ${
                          q.options?.find((o) => o.id === q.correctOptionId)?.text ||
                          q.correctOptionId
                        }`
                      : q.sampleAnswer || '(Tidak ada kunci acuan khusus)'}
                  </div>

                  {/* Student's Answer */}
                  <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 space-y-2">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                      Jawaban Siswa:
                    </span>

                    {q.type === 'pilihan_ganda' ? (
                      <div>
                        {(() => {
                          const chosenOpt = q.options?.find(
                            (o) => o.id === studentAns?.selectedOptionId
                          );
                          const isMatch =
                            studentAns?.selectedOptionId === q.correctOptionId;
                          return (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-bold ${
                                  isMatch ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {chosenOpt?.text || studentAns?.selectedOptionId || '(Tidak memilih)'}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  isMatch
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {isMatch ? 'Sesuai Kunci' : 'Salah'}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-800 whitespace-pre-wrap font-medium">
                        {studentAns?.essayText || '(Siswa tidak mengisi teks jawaban)'}
                      </p>
                    )}

                    {/* Student's Uploaded Photo for this Question (req 22, 28) */}
                    {studentAns?.uploadedPhotoUrl && (
                      <div className="mt-3 pt-2 border-t border-indigo-200/50">
                        <span className="text-xs font-bold text-indigo-800 block mb-1.5 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          Foto Bukti Pengerjaan yang Diunggah Siswa:
                        </span>
                        <a
                          href={studentAns.uploadedPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block"
                        >
                          <img
                            src={studentAns.uploadedPhotoUrl}
                            alt="Bukti Pengerjaan"
                            className="max-h-60 rounded-xl border border-indigo-200 shadow-sm hover:opacity-95 transition"
                          />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* AI Detailed Feedback for this question if available (req 18, 41) */}
                  {pqAi && (
                    <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1 text-purple-800">
                          <Sparkles className="w-3.5 h-3.5" />
                          Analisis Mendalam AI Soal No. {q.number}:
                        </span>
                        <span className="text-[11px] bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                          Kesesuaian: {pqAi.matchScore}% | Rekomendasi: {pqAi.suggestedPoints} Poin
                        </span>
                      </div>
                      <p className="text-slate-700">{pqAi.analysis}</p>
                      {pqAi.photoAnalysis && pqAi.photoAnalysis !== '-' && (
                        <p className="text-indigo-800 font-medium">
                          📷 <b>Analisis Bukti Foto:</b> {pqAi.photoAnalysis}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Teacher's Per-Question Feedback Input (req 44) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Feedback / Catatan Koreksi Guru untuk Soal No. {q.number}:
                    </label>
                    <input
                      type="text"
                      value={qState.feedback}
                      onChange={(e) =>
                        handleQFeedbackChange(q.number, e.target.value)
                      }
                      placeholder="cth. Bagus, konsep diafragma dijelaskan sangat runtut..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overall Feedback Input */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Umpan Balik Keseluruhan untuk Siswa
            </label>
            <textarea
              rows={3}
              value={overallFeedback}
              onChange={(e) => setOverallFeedback(e.target.value)}
              placeholder="Tuliskan apresiasi, masukan umum, atau motivasi bagi siswa..."
              className="w-full p-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-800"
            ></textarea>
          </div>

          {/* Dialogue Section (Threaded feedback between Guru and Siswa, req 48) */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Percakapan Umpan Balik Dua Arah dengan Siswa
            </h4>

            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {(!sub.dialogue || sub.dialogue.length === 0) ? (
                <p className="text-xs text-slate-400 italic">
                  Belum ada percakapan umpan balik. Anda dapat menuliskan pesan atau balasan pertama di bawah.
                </p>
              ) : (
                sub.dialogue.map((dlg) => (
                  <div
                    key={dlg.id}
                    className={`p-3 rounded-xl text-xs ${
                      dlg.senderRole === 'guru'
                        ? 'bg-purple-100 text-purple-900 border border-purple-200 ml-6'
                        : 'bg-white text-slate-800 border border-slate-200 mr-6'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1 text-[11px]">
                      <span>{dlg.senderName} ({dlg.senderRole.toUpperCase()})</span>
                      <span className="text-slate-400 font-normal">
                        {new Date(dlg.timestamp).toLocaleTimeString('id-ID')}
                      </span>
                    </div>
                    <p>{dlg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendReply} className="flex gap-2 pt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Tulis balasan kepada siswa..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={sendingReply || !replyText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Balas</span>
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer: Total Score and Save Button */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-3xl">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">
              Akumulasi Nilai:
            </span>
            <div className="text-2xl font-black text-indigo-700">
              {currentTotalScore}{' '}
              <span className="text-sm font-normal text-slate-500">
                / {sub.maxScore} Poin
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={savingGrade}
              onClick={handleSaveGrading}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savingGrade ? 'Menyimpan...' : 'Simpan & Kirim Nilai'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
