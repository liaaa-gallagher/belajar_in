import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Image as ImageIcon,
  Save,
  Clock,
  Calendar,
  Layers,
  HelpCircle,
  Upload,
  X,
  FileText,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import {
  AssignmentItem,
  AssignmentType,
  ClassRoom,
  QuestionItem,
  QuestionOption,
  User,
} from '../types';
import { apiFetch } from '../utils/api';

interface AssignmentBuilderProps {
  initialData?: AssignmentItem | null;
  classes: ClassRoom[];
  currentUser: User;
  onSaved: (item: AssignmentItem) => void;
  onCancel: () => void;
}

export const AssignmentBuilder: React.FC<AssignmentBuilderProps> = ({
  initialData,
  classes,
  currentUser,
  onSaved,
  onCancel,
}) => {
  const [classId, setClassId] = useState(
    initialData?.classId || classes[0]?.id || ''
  );
  const [type, setType] = useState<AssignmentType>(initialData?.type || 'lkpd');
  const [chapter, setChapter] = useState(
    initialData?.chapter || 'Bab 1: Struktur & Fungsi Organ'
  );
  const [chapterOrder, setChapterOrder] = useState<number>(
    initialData?.chapterOrder || 1
  );
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [instructions, setInstructions] = useState(
    initialData?.instructions ||
      'Kerjakan dengan teliti. Dilarang berpindah halaman/tab selama pengerjaan karena sistem mencatat durasi perpindahan.'
  );

  // Date and Time (req 17, 37)
  const defaultPublish = initialData?.publishDate
    ? new Date(initialData.publishDate).toISOString().slice(0, 16)
    : new Date().toISOString().slice(0, 16);
  const defaultDeadline = initialData?.deadline
    ? new Date(initialData.deadline).toISOString().slice(0, 16)
    : new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16);

  const [publishDate, setPublishDate] = useState(defaultPublish);
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [durationMinutes, setDurationMinutes] = useState(
    initialData?.durationMinutes || 45
  );

  // Questions List
  const [questions, setQuestions] = useState<QuestionItem[]>(
    initialData?.questions || [
      {
        id: 'q-init-1',
        number: 1,
        type: 'pilihan_ganda',
        question: '',
        points: 25,
        options: [
          { id: 'opt-a', text: '' },
          { id: 'opt-b', text: '' },
          { id: 'opt-c', text: '' },
          { id: 'opt-d', text: '' },
        ],
        correctOptionId: 'opt-a',
        sampleAnswer: '',
      },
    ]
  );

  const [saving, setSaving] = useState(false);

  // Add Question
  const handleAddQuestion = (qType: 'pilihan_ganda' | 'esai') => {
    const nextNum = questions.length + 1;
    const newQ: QuestionItem = {
      id: 'q-' + Math.random().toString(36).slice(2, 8),
      number: nextNum,
      type: qType,
      question: '',
      points: qType === 'pilihan_ganda' ? 20 : 30,
      options:
        qType === 'pilihan_ganda'
          ? [
              { id: 'opt-a', text: '' },
              { id: 'opt-b', text: '' },
              { id: 'opt-c', text: '' },
              { id: 'opt-d', text: '' },
            ]
          : undefined,
      correctOptionId: qType === 'pilihan_ganda' ? 'opt-a' : undefined,
      sampleAnswer: '',
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length === 1) {
      alert('Minimal harus ada 1 butir pertanyaan.');
      return;
    }
    const filtered = questions.filter((_, i) => i !== idx);
    const renumbered = filtered.map((q, i) => ({ ...q, number: i + 1 }));
    setQuestions(renumbered);
  };

  // Upload image to Question (req 24, 36)
  const handleUploadQuestionImage = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setQuestions((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], imageUrl: base64 };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Upload image to Option (req 24, 36: "pilihan jawaban dapat diisi dengan foto")
  const handleUploadOptionImage = (
    qIdx: number,
    optIdx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setQuestions((prev) => {
        const next = [...prev];
        const opts = [...(next[qIdx].options || [])];
        opts[optIdx] = { ...opts[optIdx], imageUrl: base64 };
        next[qIdx] = { ...next[qIdx], options: opts };
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  // Save Assignment
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !chapter.trim()) {
      alert('Judul materi dan bab wajib diisi.');
      return;
    }
    if (questions.some((q) => !q.question.trim())) {
      alert('Pastikan semua teks pertanyaan terisi.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        classId,
        type,
        chapter,
        chapterOrder: Number(chapterOrder) || 1,
        title: title.trim(),
        description,
        instructions,
        publishDate: new Date(publishDate).toISOString(),
        deadline: new Date(deadline).toISOString(),
        durationMinutes: Number(durationMinutes) || 45,
        questions,
        createdBy: currentUser.id,
        createdByName: currentUser.nama,
      };

      let result: AssignmentItem;
      if (initialData?.id) {
        result = await apiFetch<AssignmentItem>(`/api/assignments/${initialData.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        result = await apiFetch<AssignmentItem>('/api/assignments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      alert('Materi / Tugas berhasil disimpan!');
      onSaved(result);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-24">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
            Editor Soal Mirip Google Form
          </span>
          <h1 className="text-2xl font-black text-slate-800 mt-1">
            {initialData ? 'Edit Materi & Soal' : 'Buat Materi Baru (LKPD, Bank Soal, UH)'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan & Publikasikan'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Configuration Box */}
        <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Pengaturan Materi & Kelas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pilih Kelas Target:
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tipe Materi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'lkpd', label: 'LKPD' },
                  { id: 'bank_soal', label: 'Bank Soal' },
                  { id: 'evaluasi', label: 'Evaluasi UH' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as AssignmentType)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      type === t.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bab Pembelajaran (Untuk Runtutan Pengerjaan Siswa):
              </label>
              <input
                type="text"
                required
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="cth. Bab 1: Sistem Pernapasan Manusia"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Urutan Bab:
              </label>
              <input
                type="number"
                min={1}
                value={chapterOrder}
                onChange={(e) => setChapterOrder(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Tugas / Lembar Kerja:
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="cth. LKPD 1: Eksplorasi Organ & Mekanisme Respirasi"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Singkat Materi:
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan ringkasan tujuan pembelajaran materi ini..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Scheduling (Publish date & Deadline, req 17, 37) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jadwal Waktu Terbit (Muncul ke Siswa):
              </label>
              <input
                type="datetime-local"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tenggat Waktu (Deadline):
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Batas Waktu Pengerjaan (Menit):
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Questions Builder Section (GForm-like, req 3, 24, 36) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Daftar Butir Pertanyaan ({questions.length})
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAddQuestion('pilihan_ganda')}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                + Pilihan Ganda
              </button>
              <button
                type="button"
                onClick={() => handleAddQuestion('esai')}
                className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                + Soal Esai
              </button>
            </div>
          </div>

          {questions.map((q, qIdx) => (
            <div
              key={q.id}
              className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 space-y-4 relative"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center">
                    {q.number}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Esai'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <label className="text-xs font-semibold text-slate-500">
                      Poin:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={q.points}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setQuestions((prev) => {
                          const next = [...prev];
                          next[qIdx] = { ...next[qIdx], points: val };
                          return next;
                        });
                      }}
                      className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                    title="Hapus Soal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teks Pertanyaan Soal No. {q.number}:
                </label>
                <textarea
                  rows={3}
                  required
                  value={q.question}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuestions((prev) => {
                      const next = [...prev];
                      next[qIdx] = { ...next[qIdx], question: val };
                      return next;
                    });
                  }}
                  placeholder="Tuliskan pertanyaan soal di sini..."
                  className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Upload Image to Question (req 24, 36) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lampiran Gambar / Ilustrasi Soal:
                </label>
                {q.imageUrl ? (
                  <div className="relative inline-block p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={q.imageUrl}
                      alt="Soal"
                      className="max-h-48 rounded-lg object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setQuestions((prev) => {
                          const next = [...prev];
                          next[qIdx] = { ...next[qIdx], imageUrl: undefined };
                          return next;
                        });
                      }}
                      className="absolute top-2 right-2 p-1 bg-rose-600 text-white rounded-full shadow"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Gambar Soal (Opsional)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadQuestionImage(qIdx, e)}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Pilihan Ganda Options with Option Image (req 24, 36) */}
              {q.type === 'pilihan_ganda' ? (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilihan Jawaban & Kunci Benar (Tandai Radio):
                  </label>
                  {q.options?.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = q.correctOptionId === opt.id;

                    return (
                      <div
                        key={opt.id}
                        className={`p-3 rounded-2xl border transition ${
                          isCorrect
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={isCorrect}
                            onChange={() => {
                              setQuestions((prev) => {
                                const next = [...prev];
                                next[qIdx] = {
                                  ...next[qIdx],
                                  correctOptionId: opt.id,
                                };
                                return next;
                              });
                            }}
                            className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <span className="w-6 h-6 rounded-lg bg-white border border-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {letter}
                          </span>

                          <input
                            type="text"
                            required
                            value={opt.text}
                            onChange={(e) => {
                              const textVal = e.target.value;
                              setQuestions((prev) => {
                                const next = [...prev];
                                const opts = [...(next[qIdx].options || [])];
                                opts[optIdx] = { ...opts[optIdx], text: textVal };
                                next[qIdx] = { ...next[qIdx], options: opts };
                                return next;
                              });
                            }}
                            placeholder={`Teks pilihan ${letter}`}
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />

                          {/* Image upload per option (req 24, 36) */}
                          <label className="p-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-600 rounded-lg text-xs cursor-pointer transition">
                            <ImageIcon className="w-4 h-4" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleUploadOptionImage(qIdx, optIdx, e)
                              }
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Display option image if any */}
                        {opt.imageUrl && (
                          <div className="mt-2 pl-12 relative inline-block">
                            <img
                              src={opt.imageUrl}
                              alt={`Pilihan ${letter}`}
                              className="max-h-28 rounded-lg object-contain border border-slate-200"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setQuestions((prev) => {
                                  const next = [...prev];
                                  const opts = [...(next[qIdx].options || [])];
                                  opts[optIdx] = {
                                    ...opts[optIdx],
                                    imageUrl: undefined,
                                  };
                                  next[qIdx] = { ...next[qIdx], options: opts };
                                  return next;
                                });
                              }}
                              className="absolute top-1 right-1 p-0.5 bg-rose-600 text-white rounded-full shadow"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Essay Sample Answer / Rubric */
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kunci Jawaban / Rubrik Acuan Guru (Dipakai AI untuk Mengoreksi, req 15, 18):
                  </label>
                  <textarea
                    rows={3}
                    value={q.sampleAnswer || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions((prev) => {
                        const next = [...prev];
                        next[qIdx] = { ...next[qIdx], sampleAnswer: val };
                        return next;
                      });
                    }}
                    placeholder="Tuliskan poin-poin kunci atau langkah perhitungan yang wajib ada pada jawaban esai siswa..."
                    className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Save Action */}
        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-2 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan & Publikasikan Materi'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
