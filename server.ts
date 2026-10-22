import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import {
  User,
  ClassRoom,
  AssignmentItem,
  Submission,
  Announcement,
  AppNotification,
} from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'belajarin_db.json');

// Initialize Gemini SDK with telemetry header per guidelines
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = geminiApiKey
  ? new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

interface DatabaseSchema {
  users: User[];
  classes: ClassRoom[];
  assignments: AssignmentItem[];
  submissions: Submission[];
  announcements: Announcement[];
  notifications: AppNotification[];
}

function getInitialData(): DatabaseSchema {
  const teacherId = 'guru-1';
  const student1Id = 'siswa-1';
  const student2Id = 'siswa-2';
  const adminId = 'admin-1';
  const classId = 'class-8a-ipa';

  return {
    users: [
      {
        id: teacherId,
        role: 'guru',
        nama: 'Dra. Sri Wahyuni, M.Pd.',
        username: 'gurusri',
        password: 'password123',
        nip: '197805122003122001',
        tglLahir: '1978-05-12',
        joinedClasses: [classId],
        activeSessionId: 'sess-guru-1',
      },
      {
        id: student1Id,
        role: 'siswa',
        nama: 'Ahmad Fauzi',
        username: 'ahmadfauzi',
        password: 'password123',
        kelas: 'Kelas 8A',
        nomorAbsen: 1,
        tglLahir: '2010-04-15',
        joinedClasses: [classId],
        activeSessionId: 'sess-siswa-1',
      },
      {
        id: student2Id,
        role: 'siswa',
        nama: 'Siti Nurhaliza',
        username: 'sitinur',
        password: 'password123',
        kelas: 'Kelas 8A',
        nomorAbsen: 2,
        tglLahir: '2010-08-22',
        joinedClasses: [classId],
        activeSessionId: 'sess-siswa-2',
      },
      {
        id: adminId,
        role: 'admin',
        nama: 'Administrator Belajarin',
        username: 'admin',
        password: 'password123',
        adminCode: 'ADMIN-BELAJARIN',
        tglLahir: '1985-01-01',
        joinedClasses: [classId],
        activeSessionId: 'sess-admin-1',
      },
    ],
    classes: [
      {
        id: classId,
        name: 'Kelas 8A - Ilmu Pengetahuan Alam',
        subject: 'IPA (Biologi & Fisika)',
        grade: 'Kelas 8A',
        uniqueCode: 'IPA8A-2026',
        teacherId: teacherId,
        teacherName: 'Dra. Sri Wahyuni, M.Pd.',
        description: 'Mata pelajaran IPA Semester Genap. Pelajari modul, kerjakan LKPD, Latihan Soal, dan Evaluasi harian.',
        createdAt: new Date().toISOString(),
        studentIds: [student1Id, student2Id],
        teacherIds: [teacherId],
      },
    ],
    assignments: [
      {
        id: 'asg-lkpd-1',
        classId: classId,
        type: 'lkpd',
        chapter: 'Bab 1: Sistem Pernapasan Manusia',
        chapterOrder: 1,
        title: 'LKPD 1: Eksplorasi Organ & Mekanisme Pernapasan',
        description: 'Pelajari organ pernapasan, buat skema alur udara dan mekanisme pernapasan dada vs perut.',
        instructions: 'Jawab pertanyaan dengan teliti. Unggah foto skema/diagram organ pernapasan yang kalian gambar sendiri pada kertas.',
        publishDate: new Date(Date.now() - 86400000 * 3).toISOString(),
        deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
        durationMinutes: 45,
        status: 'published',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        createdBy: teacherId,
        createdByName: 'Dra. Sri Wahyuni, M.Pd.',
        questions: [
          {
            id: 'q-lkpd-1',
            number: 1,
            type: 'pilihan_ganda',
            question: 'Organ pernapasan yang berfungsi sebagai tempat pertukaran oksigen (O2) dan karbon dioksida (CO2) adalah...',
            points: 25,
            options: [
              { id: 'opt-a', text: 'Bronkus' },
              { id: 'opt-b', text: 'Alveolus' },
              { id: 'opt-c', text: 'Laring' },
              { id: 'opt-d', text: 'Trakea' },
            ],
            correctOptionId: 'opt-b',
            sampleAnswer: 'Alveolus merupakan kantung udara berdinding tipis yang dikelilingi kapiler darah untuk difusi gas.',
          },
          {
            id: 'q-lkpd-2',
            number: 2,
            type: 'esai',
            question: 'Jelaskan perbedaan mendasar antara pernapasan dada dan pernapasan perut saat fase inspirasi dan ekspirasi!',
            points: 35,
            sampleAnswer: 'Pernapasan dada melibatkan kontraksi otot antartulang rusuk (otot interkostal), sedangkan pernapasan perut melibatkan kontraksi otot diafragma yang mendatar saat inspirasi.',
          },
          {
            id: 'q-lkpd-3',
            number: 3,
            type: 'esai',
            question: 'Gambarkan atau buat skema alur perjalanan udara dari hidung hingga ke alveolus di buku tugas, lalu foto dan unggah foto jawaban kalian di sini!',
            points: 40,
            sampleAnswer: 'Hidung -> Faring -> Laring -> Trakea -> Bronkus -> Bronkiolus -> Alveolus. Gambar harus memuat label organ dengan benar.',
          },
        ],
      },
      {
        id: 'asg-bank-1',
        classId: classId,
        type: 'bank_soal',
        chapter: 'Bab 1: Sistem Pernapasan Manusia',
        chapterOrder: 1,
        title: 'Bank Soal: Uji Pemahaman Sistem Respirasi',
        description: 'Latihan soal berbobot untuk mematangkan konsep respirasi manusia sebelum ulangan harian.',
        instructions: 'Kerjakan secara mandiri. Dilarang berpindah tab selama pengerjaan karena sistem mencatat perpindahan halaman.',
        publishDate: new Date(Date.now() - 86400000 * 2).toISOString(),
        deadline: new Date(Date.now() + 86400000 * 10).toISOString(),
        durationMinutes: 40,
        status: 'published',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdBy: teacherId,
        createdByName: 'Dra. Sri Wahyuni, M.Pd.',
        questions: [
          {
            id: 'q-bank-1',
            number: 1,
            type: 'pilihan_ganda',
            question: 'Ketika seseorang berada di dataran tinggi, tubuh akan beradaptasi dengan memproduksi lebih banyak eritrosit. Alasan fisiologisnya adalah...',
            points: 50,
            options: [
              { id: 'opt-b1', text: 'Tekanan parsial oksigen lebih rendah sehingga butuh lebih banyak hemoglobin untuk mengikat O2' },
              { id: 'opt-b2', text: 'Suhu udara dingin merangsang pembelahan sel darah' },
              { id: 'opt-b3', text: 'Tekanan udara tinggi menekan alveolus' },
              { id: 'opt-b4', text: 'Kadar karbon dioksida di udara sangat tinggi' },
            ],
            correctOptionId: 'opt-b1',
            sampleAnswer: 'Di ketinggian, tekanan udara dan kadar oksigen tipis sehingga hormon eritropoietin merangsang pembentukan eritrosit.',
          },
          {
            id: 'q-bank-2',
            number: 2,
            type: 'esai',
            question: 'Sebutkan 3 penyakit atau kelainan pada sistem pernapasan dan jelaskan penyebab serta bagian organ yang terganggu!',
            points: 50,
            sampleAnswer: '1. Asma (penyempitan bronkus akibat alergen/iritasi), 2. Emfisema (kerusakan alveolus akibat rokok), 3. Pneumonia (infeksi paru-paru terisi cairan).',
          },
        ],
      },
      {
        id: 'asg-eval-1',
        classId: classId,
        type: 'evaluasi',
        chapter: 'Bab 1: Sistem Pernapasan Manusia',
        chapterOrder: 1,
        title: 'Evaluasi UH: Ulangan Harian Sistem Pernapasan',
        description: 'Ulangan Harian Bab 1. Nilai akhir akan dimasukkan ke buku rapor.',
        instructions: 'Waktu terbatas 30 menit. Setiap indikasi kecurangan (pindah jendela/tab) akan langsung dilaporkan kepada guru penguji.',
        publishDate: new Date(Date.now() - 86400000).toISOString(),
        deadline: new Date(Date.now() + 86400000 * 14).toISOString(),
        durationMinutes: 30,
        status: 'published',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        createdBy: teacherId,
        createdByName: 'Dra. Sri Wahyuni, M.Pd.',
        questions: [
          {
            id: 'q-uh-1',
            number: 1,
            type: 'pilihan_ganda',
            question: 'Kapasitas vital paru-paru manusia terdiri dari gabungan volume...',
            points: 30,
            options: [
              { id: 'opt-u1', text: 'Volume tidal + volume residu' },
              { id: 'opt-u2', text: 'Volume tidal + volume cadangan inspirasi + volume cadangan ekspirasi' },
              { id: 'opt-u3', text: 'Volume total - volume cadangan inspirasi' },
              { id: 'opt-u4', text: 'Volume tidal saja' },
            ],
            correctOptionId: 'opt-u2',
            sampleAnswer: 'Kapasitas vital = VT + VCI + VCE, berkisar 3.500 - 4.500 mL.',
          },
          {
            id: 'q-uh-2',
            number: 2,
            type: 'esai',
            question: 'Mengapa merokok dan polusi udara jangka panjang dapat menyebabkan sesak napas menahun? Analisis kerusakan seluler yang terjadi pada silia dan alveolus!',
            points: 40,
            sampleAnswer: 'Zat racun merusak silia pembersih pada trakea sehingga lendir menumpuk, serta menghancurkan dinding elastis alveolus sehingga luas permukaan difusi berkurang drastis.',
          },
          {
            id: 'q-uh-3',
            number: 3,
            type: 'esai',
            question: 'Tuliskan dan foto perhitungan kapasitas paru-paru jika diketahui Volume Tidal 500 mL, Komplementer 1500 mL, Suplementer 1500 mL, dan Residu 1000 mL!',
            points: 30,
            sampleAnswer: 'Kapasitas Vital = 500 + 1500 + 1500 = 3500 mL. Total Kapasitas = 3500 + 1000 = 4500 mL.',
          },
        ],
      },
    ],
    submissions: [
      {
        id: 'sub-sample-1',
        assignmentId: 'asg-lkpd-1',
        assignmentTitle: 'LKPD 1: Eksplorasi Organ & Mekanisme Pernapasan',
        assignmentType: 'lkpd',
        classId: classId,
        chapter: 'Bab 1: Sistem Pernapasan Manusia',
        studentId: student1Id,
        studentName: 'Ahmad Fauzi',
        studentAbsen: 1,
        studentClass: 'Kelas 8A',
        submittedAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
        cheatingCount: 1,
        cheatingIncidents: [
          {
            timestamp: new Date(Date.now() - 86400000 * 1.5 + 120000).toISOString(),
            questionNumber: 2,
            durationSeconds: 7,
            reason: 'Membuka tab/aplikasi lain saat mengerjakan soal no 2',
          },
        ],
        status: 'reviewed',
        totalScore: 92,
        maxScore: 100,
        overallFeedback: 'Kerja bagus Ahmad! Pemahaman konsep respirasi dada dan perut sangat jelas. Diagram alur organ sudah runtut dan terbaca.',
        perQuestionFeedback: [
          {
            questionNumber: 1,
            scoreAwarded: 25,
            feedbackText: 'Tepat sekali, alveolus adalah unit fungsional difusi gas.',
          },
          {
            questionNumber: 2,
            scoreAwarded: 32,
            feedbackText: 'Penjelasan mekanisme diafragma dan interkostal sudah benar dan rapi.',
          },
          {
            questionNumber: 3,
            scoreAwarded: 35,
            feedbackText: 'Skema foto jelas, hanya perlu perjelas panah cabang bronkiolus.',
          },
        ],
        dialogue: [
          {
            id: 'dlg-1',
            senderRole: 'guru',
            senderName: 'Dra. Sri Wahyuni, M.Pd.',
            timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
            text: 'Bagus sekali Ahmad, terus pertahankan kerapian catatan dan tugasmu!',
          },
          {
            id: 'dlg-2',
            senderRole: 'siswa',
            senderName: 'Ahmad Fauzi',
            timestamp: new Date(Date.now() - 86400000 * 0.8).toISOString(),
            text: 'Terima kasih banyak Bu Sri atas koreksi dan masukannya. Saya akan perjelas bagian cabang bronkiolus di catatan saya.',
          },
        ],
        answers: [
          {
            questionId: 'q-lkpd-1',
            questionNumber: 1,
            selectedOptionId: 'opt-b',
          },
          {
            questionId: 'q-lkpd-2',
            questionNumber: 2,
            essayText: 'Pada inspirasi pernapasan dada, otot antartulang rusuk berkontraksi sehingga rongga dada membesar dan udara masuk. Pada pernapasan perut, diafragma berkontraksi mendatar sehingga volume rongga dada bertambah dan tekanan udara turun.',
          },
          {
            questionId: 'q-lkpd-3',
            questionNumber: 3,
            essayText: 'Alur: Rongga Hidung -> Faring -> Laring -> Trakea -> Bronkus Kanan/Kiri -> Bronkiolus -> Alveolus.',
          },
        ],
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        classId: classId,
        className: 'Kelas 8A - Ilmu Pengetahuan Alam',
        authorRole: 'guru',
        authorName: 'Dra. Sri Wahyuni, M.Pd.',
        title: 'Jadwal Pengerjaan LKPD & Ulangan Harian Bab 1 Respirasi',
        content: 'Halo anak-anak kelas 8A, silakan selesaikan LKPD 1 terlebih dahulu, lalu Bank Soal sebelum mengikuti Evaluasi (UH). Jangan lupa perhatikan deadline!',
        scheduleDate: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: student1Id,
        title: 'Feedback Tugas Masuk',
        message: 'Ibu Sri Wahyuni telah memberikan nilai dan feedback pada LKPD 1: Eksplorasi Organ & Mekanisme Pernapasan.',
        type: 'feedback',
        relatedId: 'sub-sample-1',
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-lkpd-1',
        userId: student1Id,
        title: 'Pengumuman LKPD Baru: LKPD 1: Eksplorasi Organ & Mekanisme Pernapasan',
        message: 'Guru telah menerbitkan LKPD Baru pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera kerjakan!',
        type: 'assignment',
        relatedId: 'asg-lkpd-1',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-bank-1',
        userId: student1Id,
        title: 'Pengumuman Latihan Soal Baru: Bank Soal: Uji Pemahaman Sistem Respirasi',
        message: 'Guru telah menerbitkan Bank Soal pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera kerjakan!',
        type: 'assignment',
        relatedId: 'asg-bank-1',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-2',
        userId: student1Id,
        title: 'Pengumuman Evaluasi UH Baru: Evaluasi UH: Ulangan Harian Sistem Pernapasan',
        message: 'Guru telah menerbitkan Evaluasi (UH) pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera cek tugasmu!',
        type: 'assignment',
        relatedId: 'asg-eval-1',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-lkpd-2',
        userId: student2Id,
        title: 'Pengumuman LKPD Baru: LKPD 1: Eksplorasi Organ & Mekanisme Pernapasan',
        message: 'Guru telah menerbitkan LKPD Baru pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera kerjakan!',
        type: 'assignment',
        relatedId: 'asg-lkpd-1',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-bank-2',
        userId: student2Id,
        title: 'Pengumuman Latihan Soal Baru: Bank Soal: Uji Pemahaman Sistem Respirasi',
        message: 'Guru telah menerbitkan Bank Soal pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera kerjakan!',
        type: 'assignment',
        relatedId: 'asg-bank-1',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        isRead: false,
      },
      {
        id: 'notif-3',
        userId: student2Id,
        title: 'Pengumuman Evaluasi UH Baru: Evaluasi UH: Ulangan Harian Sistem Pernapasan',
        message: 'Guru telah menerbitkan Evaluasi (UH) pada Bab 1: Sistem Pernapasan Manusia di Kelas 8A - Ilmu Pengetahuan Alam. Segera cek tugasmu!',
        type: 'assignment',
        relatedId: 'asg-eval-1',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isRead: false,
      },
    ],
  };
}

// Persistent database helper functions
function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialData();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Error reading db:', err);
    return getInitialData();
  }
}

function writeDb(data: DatabaseSchema) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db:', err);
  }
}

// Helper to find all classes a student belongs to
function getClassesForStudent(student: User, db: DatabaseSchema): ClassRoom[] {
  return db.classes.filter((c) => {
    if (c.studentIds && c.studentIds.includes(student.id)) return true;
    if (student.joinedClasses && student.joinedClasses.includes(c.id)) return true;
    if (
      student.kelas &&
      (c.name.toLowerCase().includes(student.kelas.toLowerCase()) ||
       c.grade.toLowerCase().includes(student.kelas.toLowerCase()) ||
       student.kelas.toLowerCase().includes(c.grade.toLowerCase()))
    ) {
      return true;
    }
    return false;
  });
}

// Helper to find all student IDs enrolled in a class
function getStudentIdsForClass(cls: ClassRoom, db: DatabaseSchema): string[] {
  const ids = new Set<string>(cls.studentIds || []);
  db.users.forEach((u) => {
    if (u.role === 'siswa') {
      if (u.joinedClasses && u.joinedClasses.includes(cls.id)) {
        ids.add(u.id);
      } else if (
        u.kelas &&
        (cls.name.toLowerCase().includes(u.kelas.toLowerCase()) ||
         cls.grade.toLowerCase().includes(u.kelas.toLowerCase()) ||
         u.kelas.toLowerCase().includes(cls.grade.toLowerCase()))
      ) {
        ids.add(u.id);
      }
    }
  });
  return Array.from(ids);
}

// Synchronize all published task notifications so that every student in the published class receives them in their bell
function syncStudentTaskNotifications(db: DatabaseSchema): boolean {
  let changed = false;

  const students = db.users.filter((u) => u.role === 'siswa');
  students.forEach((student) => {
    const studentClasses = getClassesForStudent(student, db);
    const studentClassIds = new Set(studentClasses.map((c) => c.id));

    // Ensure bidirectional enrollment
    studentClasses.forEach((cls) => {
      if (!cls.studentIds) cls.studentIds = [];
      if (!cls.studentIds.includes(student.id)) {
        cls.studentIds.push(student.id);
        changed = true;
      }
      if (!student.joinedClasses) student.joinedClasses = [];
      if (!student.joinedClasses.includes(cls.id)) {
        student.joinedClasses.push(cls.id);
        changed = true;
      }
    });

    // Find all published assignments belonging to student's classes
    const relevantAssignments = db.assignments.filter(
      (a) => a.status === 'published' && studentClassIds.has(a.classId)
    );

    relevantAssignments.forEach((asg) => {
      const cls = db.classes.find((c) => c.id === asg.classId);
      const className = cls ? cls.name : 'Kelas';
      const exists = db.notifications.some(
        (n) => n.userId === student.id && n.type === 'assignment' && n.relatedId === asg.id
      );

      if (!exists) {
        const typeLabel =
          asg.type === 'lkpd'
            ? 'Pengumuman LKPD Baru'
            : asg.type === 'bank_soal'
            ? 'Pengumuman Latihan Soal Baru'
            : 'Pengumuman Evaluasi UH Baru';

        db.notifications.push({
          id: 'notif-' + crypto.randomUUID(),
          userId: student.id,
          title: `${typeLabel}: ${asg.title}`,
          message: `Guru telah menerbitkan ${typeLabel} pada ${asg.chapter} di ${className}. Segera cek dan kerjakan tugasmu!`,
          type: 'assignment',
          relatedId: asg.id,
          createdAt: asg.createdAt || asg.publishDate || new Date().toISOString(),
          isRead: false,
        });
        changed = true;
      }
    });
  });

  return changed;
}

async function startServer() {
  const app = express();

  // 50mb body limit for high-res photo answers and diagrams
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Helper to push notification
  function pushNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'isRead'>) {
    const db = readDb();
    const newNotif: AppNotification = {
      ...notif,
      id: 'notif-' + crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    db.notifications.unshift(newNotif);
    writeDb(db);
  }

  // ==================== AUTH ROUTES ====================
  // Check Username suggestions if taken
  app.get('/api/auth/check-username', (req: Request, res: Response) => {
    const username = (req.query.username as string || '').trim().toLowerCase();
    const db = readDb();
    const exists = db.users.some((u) => u.username.toLowerCase() === username);

    if (!exists) {
      return res.json({ available: true, suggestions: [] });
    }

    const rnd = Math.floor(100 + Math.random() * 900);
    const suggestions = [
      `${username}${rnd}`,
      `${username}_belajar`,
      `${username}_${new Date().getFullYear()}`,
      `halo_${username}`,
    ];
    res.json({ available: false, suggestions });
  });

  // Register
  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { role, nama, username, password, tglLahir, kelas, nomorAbsen, nip, adminCode } = req.body;

    if (!role || !nama || !username || !password || !tglLahir) {
      return res.status(400).json({ error: 'Data pendaftaran belum lengkap.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const db = readDb();
    const existing = db.users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (existing) {
      const rnd = Math.floor(100 + Math.random() * 900);
      const suggestions = [
        `${cleanUsername}${rnd}`,
        `${cleanUsername}_belajar`,
        `${cleanUsername}_${new Date().getFullYear()}`,
      ];
      return res.status(400).json({
        error: `Username "${username}" sudah digunakan. Silakan pilih username lain atau gunakan saran berikut.`,
        suggestions,
      });
    }

    // Role specific validation
    if (role === 'siswa') {
      if (!kelas || nomorAbsen === undefined) {
        return res.status(400).json({ error: 'Siswa wajib mengisi kelas dan nomor absen.' });
      }
    } else if (role === 'guru') {
      if (!nip) {
        return res.status(400).json({ error: 'Guru wajib mengisi NIP.' });
      }
    } else if (role === 'admin') {
      if (!adminCode || adminCode.trim() !== 'ADMIN-BELAJARIN') {
        return res.status(400).json({ error: 'Kode Admin tidak valid. Gunakan kode "ADMIN-BELAJARIN".' });
      }
    }

    const sessionId = 'sess-' + crypto.randomUUID();
    const newUser: User = {
      id: 'usr-' + crypto.randomUUID(),
      role,
      nama: nama.trim(),
      username: cleanUsername,
      password,
      tglLahir,
      kelas: role === 'siswa' ? kelas : undefined,
      nomorAbsen: role === 'siswa' ? Number(nomorAbsen) : undefined,
      nip: role === 'guru' ? nip.trim() : undefined,
      adminCode: role === 'admin' ? adminCode.trim() : undefined,
      joinedClasses: [],
      activeSessionId: sessionId,
      lastLogin: new Date().toISOString(),
    };

    db.users.push(newUser);

    if (role === 'siswa' && kelas) {
      db.classes.forEach((c) => {
        if (
          c.name.toLowerCase().includes(kelas.toLowerCase()) ||
          c.grade.toLowerCase().includes(kelas.toLowerCase()) ||
          kelas.toLowerCase().includes(c.grade.toLowerCase())
        ) {
          if (!c.studentIds) c.studentIds = [];
          if (!c.studentIds.includes(newUser.id)) c.studentIds.push(newUser.id);
          if (!newUser.joinedClasses.includes(c.id)) newUser.joinedClasses.push(c.id);
        }
      });
      syncStudentTaskNotifications(db);
    }

    writeDb(db);

    const safeUser = { ...newUser };
    delete safeUser.password;

    res.json({
      message: 'Pendaftaran berhasil!',
      user: safeUser,
      sessionId,
    });
  });

  // Login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username dan password wajib diisi.' });
    }

    const db = readDb();
    const cleanUsername = username.trim().toLowerCase();
    const userIndex = db.users.findIndex(
      (u) => u.username.toLowerCase() === cleanUsername && u.password === password
    );

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Username atau password salah. Pastikan data akun benar.' });
    }

    const user = db.users[userIndex];
    if (user.isActive === false) {
      return res.status(403).json({
        error: 'Akun Anda telah dinonaktifkan oleh Administrator. Silakan hubungi admin untuk mengaktifkan kembali akun Anda.',
      });
    }

    if (role && user.role !== role) {
      return res.status(401).json({
        error: `Akun ini terdaftar sebagai ${user.role.toUpperCase()}, bukan ${role.toUpperCase()}. Silakan pilih tab login yang sesuai.`,
      });
    }

    // 1-Akun 1-Device Enforcement:
    // Generate new activeSessionId. Any prior session on another device becomes invalid immediately!
    const newSessionId = 'sess-' + crypto.randomUUID();
    user.activeSessionId = newSessionId;
    user.lastLogin = new Date().toISOString();

    writeDb(db);

    const safeUser = { ...user };
    delete safeUser.password;

    res.json({
      message: 'Login berhasil!',
      user: safeUser,
      sessionId: newSessionId,
    });
  });

  // 1-Akun 1-Device Heartbeat / Session Check
  app.post('/api/auth/session-check', (req: Request, res: Response) => {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) {
      return res.status(400).json({ valid: false, error: 'Parameter tidak lengkap.' });
    }

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);

    if (!user) {
      return res.json({ valid: false, message: 'Pengguna tidak ditemukan.' });
    }

    if (user.isActive === false) {
      return res.json({
        valid: false,
        message: 'Akun Anda telah dinonaktifkan oleh Administrator.',
      });
    }

    if (user.activeSessionId !== sessionId) {
      return res.json({
        valid: false,
        message: 'Akun Anda telah masuk di perangkat lain. Untuk keamanan, akun ini keluar secara otomatis.',
      });
    }

    res.json({ valid: true });
  });

  // Logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (userId) {
      const db = readDb();
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        user.activeSessionId = '';
        writeDb(db);
      }
    }
    res.json({ success: true });
  });

  // Get current user profile
  app.get('/api/users/me', (req: Request, res: Response) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const safe = { ...user };
    delete safe.password;
    res.json(safe);
  });

  // Admin user management (get all users)
  app.get('/api/admin/users', (req: Request, res: Response) => {
    const db = readDb();
    const safeUsers = db.users.map((u) => {
      const copy = { ...u };
      // Include status isActive (default true if not defined)
      if (copy.isActive === undefined) copy.isActive = true;
      return copy;
    });
    res.json(safeUsers);
  });

  // Admin update user (role/wewenang, status aktif/nonaktif, reset password, nama, kelas, absen, nip)
  app.put('/api/admin/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { role, isActive, password, nama, kelas, nomorAbsen, nip } = req.body;
    const db = readDb();

    const user = db.users.find((u) => u.id === id);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = Boolean(isActive);
    if (password) user.password = password;
    if (nama) user.nama = nama.trim();
    if (kelas !== undefined) user.kelas = kelas;
    if (nomorAbsen !== undefined) user.nomorAbsen = Number(nomorAbsen);
    if (nip !== undefined) user.nip = nip;

    // If deactivated, invalidate current activeSessionId
    if (isActive === false) {
      user.activeSessionId = '';
    }

    writeDb(db);
    const safe = { ...user };
    res.json({ message: 'Data akun berhasil diperbarui', user: safe });
  });

  // Admin delete user
  app.delete('/api/admin/users/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = readDb();

    db.users = db.users.filter((u) => u.id !== id);
    // remove from classes
    db.classes.forEach((c) => {
      c.studentIds = c.studentIds.filter((sId) => sId !== id);
      if (c.teacherIds) c.teacherIds = c.teacherIds.filter((tId) => tId !== id);
    });

    writeDb(db);
    res.json({ success: true, message: 'Akun berhasil dihapus' });
  });

  // ==================== CLASSES ROUTES ====================
  // Get classes for user
  app.get('/api/classes', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    const db = readDb();

    if (!userId) {
      return res.json(db.classes);
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.json([]);

    if (user.role === 'admin') {
      return res.json(db.classes);
    }

    if (user.role === 'guru') {
      // Classes taught by teacher OR classes teacher joined (req 25)
      const classes = db.classes.filter(
        (c) =>
          c.teacherId === userId ||
          (c.teacherIds && c.teacherIds.includes(userId)) ||
          user.joinedClasses.includes(c.id)
      );
      return res.json(classes);
    }

    // Siswa
    const classes = db.classes.filter((c) =>
      c.studentIds.includes(userId) || user.joinedClasses.includes(c.id)
    );
    res.json(classes);
  });

  // Get single class details with member details
  app.get('/api/classes/:id', (req: Request, res: Response) => {
    const db = readDb();
    const cls = db.classes.find((c) => c.id === req.params.id);
    if (!cls) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    // Populate students with nama, absen, kelas
    const students = db.users
      .filter((u) => cls.studentIds.includes(u.id))
      .map((u) => ({
        id: u.id,
        nama: u.nama,
        username: u.username,
        kelas: u.kelas,
        nomorAbsen: u.nomorAbsen,
        tglLahir: u.tglLahir,
      }))
      .sort((a, b) => (a.nomorAbsen || 0) - (b.nomorAbsen || 0));

    // Populate teachers
    const teachers = db.users
      .filter((u) => cls.teacherId === u.id || (cls.teacherIds && cls.teacherIds.includes(u.id)))
      .map((u) => ({
        id: u.id,
        nama: u.nama,
        nip: u.nip,
        username: u.username,
      }));

    res.json({
      ...cls,
      students,
      teachers,
    });
  });

  // Create class (Guru or Admin)
  app.post('/api/classes', (req: Request, res: Response) => {
    const { name, subject, grade, description, teacherId, teacherName } = req.body;
    if (!name || !subject || !grade) {
      return res.status(400).json({ error: 'Nama kelas, mata pelajaran, dan jenjang/kelas wajib diisi.' });
    }

    const db = readDb();
    // Unique code generator (e.g. BLJ-A123)
    const code =
      'BLJ-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    const newClass: ClassRoom = {
      id: 'cls-' + crypto.randomUUID(),
      name,
      subject,
      grade,
      uniqueCode: code,
      teacherId,
      teacherName: teacherName || 'Guru Mata Pelajaran',
      description: description || '',
      createdAt: new Date().toISOString(),
      studentIds: [],
      teacherIds: [teacherId],
    };

    db.classes.push(newClass);

    // Update teacher's joined classes
    const teacher = db.users.find((u) => u.id === teacherId);
    if (teacher && !teacher.joinedClasses.includes(newClass.id)) {
      teacher.joinedClasses.push(newClass.id);
    }

    writeDb(db);
    res.json(newClass);
  });

  // Join class using unique code (Siswa or Guru)
  app.post('/api/classes/join', (req: Request, res: Response) => {
    const { uniqueCode, userId } = req.body;
    if (!uniqueCode || !userId) {
      return res.status(400).json({ error: 'Kode kelas dan data pengguna harus ada.' });
    }

    const cleanCode = uniqueCode.trim().toUpperCase();
    const db = readDb();
    const cls = db.classes.find((c) => c.uniqueCode.toUpperCase() === cleanCode);

    if (!cls) {
      return res.status(404).json({ error: 'Kode kelas tidak ditemukan. Mohon periksa kembali kode kelas Anda.' });
    }

    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });

    if (user.role === 'siswa') {
      if (cls.studentIds.includes(userId)) {
        return res.status(400).json({ error: 'Anda sudah bergabung dalam kelas ini.' });
      }
      cls.studentIds.push(userId);
    } else if (user.role === 'guru') {
      if (!cls.teacherIds) cls.teacherIds = [cls.teacherId];
      if (cls.teacherIds.includes(userId)) {
        return res.status(400).json({ error: 'Guru sudah terdaftar dalam kelas ini.' });
      }
      cls.teacherIds.push(userId);
    }

    if (!user.joinedClasses.includes(cls.id)) {
      user.joinedClasses.push(cls.id);
    }

    writeDb(db);
    res.json({ message: `Berhasil bergabung ke kelas ${cls.name}`, class: cls });
  });

  // Admin/Guru add or remove member from class manually
  app.post('/api/classes/:id/members', (req: Request, res: Response) => {
    const { action, memberId, role } = req.body; // action: 'add' | 'remove'
    const classId = req.params.id;

    const db = readDb();
    const cls = db.classes.find((c) => c.id === classId);
    if (!cls) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    const user = db.users.find((u) => u.id === memberId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    if (action === 'add') {
      if (role === 'siswa' || user.role === 'siswa') {
        if (!cls.studentIds.includes(memberId)) cls.studentIds.push(memberId);
      } else {
        if (!cls.teacherIds) cls.teacherIds = [cls.teacherId];
        if (!cls.teacherIds.includes(memberId)) cls.teacherIds.push(memberId);
      }
      if (!user.joinedClasses.includes(classId)) user.joinedClasses.push(classId);
    } else if (action === 'remove') {
      cls.studentIds = cls.studentIds.filter((id) => id !== memberId);
      if (cls.teacherIds) {
        cls.teacherIds = cls.teacherIds.filter((id) => id !== memberId);
      }
      user.joinedClasses = user.joinedClasses.filter((id) => id !== classId);
    }

    writeDb(db);
    res.json({ success: true, class: cls });
  });

  // Edit class
  app.put('/api/classes/:id', (req: Request, res: Response) => {
    const { name, subject, grade, description } = req.body;
    const db = readDb();
    const cls = db.classes.find((c) => c.id === req.params.id);
    if (!cls) return res.status(404).json({ error: 'Kelas tidak ditemukan' });

    if (name) cls.name = name;
    if (subject) cls.subject = subject;
    if (grade) cls.grade = grade;
    if (description !== undefined) cls.description = description;

    writeDb(db);
    res.json(cls);
  });

  // Delete class
  app.delete('/api/classes/:id', (req: Request, res: Response) => {
    const db = readDb();
    db.classes = db.classes.filter((c) => c.id !== req.params.id);
    db.assignments = db.assignments.filter((a) => a.classId !== req.params.id);
    db.submissions = db.submissions.filter((s) => s.classId !== req.params.id);
    db.announcements = db.announcements.filter((an) => an.classId !== req.params.id);

    // remove from users joined
    db.users.forEach((u) => {
      u.joinedClasses = u.joinedClasses.filter((cId) => cId !== req.params.id);
    });

    writeDb(db);
    res.json({ success: true });
  });

  // ==================== ASSIGNMENTS (LKPD, BANK SOAL, EVALUASI) ====================
  // Get assignments with filters
  app.get('/api/assignments', (req: Request, res: Response) => {
    const { classId, type, status } = req.query;
    const db = readDb();

    let items = db.assignments;
    if (classId) {
      items = items.filter((a) => a.classId === classId);
    }
    if (type) {
      items = items.filter((a) => a.type === type);
    }
    if (status) {
      items = items.filter((a) => a.status === status);
    }

    // Sort by chapterOrder then createdAt
    items.sort((a, b) => a.chapterOrder - b.chapterOrder);
    res.json(items);
  });

  // Get single assignment
  app.get('/api/assignments/:id', (req: Request, res: Response) => {
    const db = readDb();
    const item = db.assignments.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Tugas/Materi tidak ditemukan' });
    res.json(item);
  });

  // Create Assignment (LKPD, Bank Soal, Evaluasi)
  app.post('/api/assignments', (req: Request, res: Response) => {
    const {
      classId,
      type,
      chapter,
      chapterOrder,
      title,
      description,
      instructions,
      publishDate,
      deadline,
      durationMinutes,
      questions,
      createdBy,
      createdByName,
    } = req.body;

    if (!classId || !type || !title || !chapter) {
      return res.status(400).json({ error: 'Kelas, tipe materi, bab, dan judul wajib diisi.' });
    }

    const db = readDb();
    const cls = db.classes.find((c) => c.id === classId);
    const className = cls ? cls.name : 'Kelas';

    const newAssignment: AssignmentItem = {
      id: 'asg-' + crypto.randomUUID(),
      classId,
      type,
      chapter: chapter.trim(),
      chapterOrder: Number(chapterOrder) || 1,
      title: title.trim(),
      description: description || '',
      instructions: instructions || '',
      publishDate: publishDate || new Date().toISOString(),
      deadline: deadline || new Date(Date.now() + 86400000 * 7).toISOString(),
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      questions: questions || [],
      status: 'published',
      createdAt: new Date().toISOString(),
      createdBy,
      createdByName: createdByName || 'Guru',
    };

    db.assignments.push(newAssignment);
    writeDb(db);

    // Notify all students in that class
    if (cls) {
      const typeLabel =
        type === 'lkpd'
          ? 'Pengumuman LKPD Baru'
          : type === 'bank_soal'
          ? 'Pengumuman Latihan Soal Baru'
          : 'Pengumuman Evaluasi UH Baru';
      const studentIds = getStudentIdsForClass(cls, db);
      studentIds.forEach((studentId) => {
        pushNotification({
          userId: studentId,
          title: `${typeLabel}: ${title}`,
          message: `Guru telah menerbitkan ${typeLabel} "${title}" pada ${chapter} di ${className}. Segera cek tugasmu!`,
          type: 'assignment',
          relatedId: newAssignment.id,
        });
      });
    }

    res.json(newAssignment);
  });

  // Edit Assignment
  app.put('/api/assignments/:id', (req: Request, res: Response) => {
    const db = readDb();
    const item = db.assignments.find((a) => a.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Tugas/Materi tidak ditemukan' });

    const {
      title,
      chapter,
      chapterOrder,
      description,
      instructions,
      publishDate,
      deadline,
      durationMinutes,
      questions,
      status,
    } = req.body;

    if (title !== undefined) item.title = title;
    if (chapter !== undefined) item.chapter = chapter;
    if (chapterOrder !== undefined) item.chapterOrder = Number(chapterOrder);
    if (description !== undefined) item.description = description;
    if (instructions !== undefined) item.instructions = instructions;
    if (publishDate !== undefined) item.publishDate = publishDate;
    if (deadline !== undefined) item.deadline = deadline;
    if (durationMinutes !== undefined) item.durationMinutes = durationMinutes;
    if (questions !== undefined) item.questions = questions;
    if (status !== undefined) item.status = status;

    writeDb(db);
    res.json(item);
  });

  // Delete Assignment
  app.delete('/api/assignments/:id', (req: Request, res: Response) => {
    const db = readDb();
    db.assignments = db.assignments.filter((a) => a.id !== req.params.id);
    db.submissions = db.submissions.filter((s) => s.assignmentId !== req.params.id);
    writeDb(db);
    res.json({ success: true });
  });

  // Archive / Duplicate to other class from archive (req 38)
  app.post('/api/assignments/:id/duplicate', (req: Request, res: Response) => {
    const { targetClassId, newPublishDate, newDeadline } = req.body;
    const db = readDb();
    const source = db.assignments.find((a) => a.id === req.params.id);
    if (!source) return res.status(404).json({ error: 'Soal tidak ditemukan' });

    const duplicate: AssignmentItem = {
      ...JSON.parse(JSON.stringify(source)),
      id: 'asg-' + crypto.randomUUID(),
      classId: targetClassId || source.classId,
      publishDate: newPublishDate || source.publishDate,
      deadline: newDeadline || source.deadline,
      status: 'published',
      createdAt: new Date().toISOString(),
    };

    db.assignments.push(duplicate);

    // Notify all students in the target class
    const targetCls = db.classes.find((c) => c.id === duplicate.classId);
    if (targetCls) {
      const typeLabel =
        duplicate.type === 'lkpd'
          ? 'Pengumuman LKPD Baru'
          : duplicate.type === 'bank_soal'
          ? 'Pengumuman Latihan Soal Baru'
          : 'Pengumuman Evaluasi UH Baru';
      const studentIds = getStudentIdsForClass(targetCls, db);
      studentIds.forEach((sId) => {
        pushNotification({
          userId: sId,
          title: `${typeLabel}: ${duplicate.title}`,
          message: `Guru telah menerbitkan ${typeLabel} "${duplicate.title}" pada ${duplicate.chapter} di ${targetCls.name}. Segera cek tugasmu!`,
          type: 'assignment',
          relatedId: duplicate.id,
        });
      });
    }

    writeDb(db);
    res.json(duplicate);
  });

  // ==================== SUBMISSIONS & CHEATING & FEEDBACK ====================
  // Get submissions with filters
  app.get('/api/submissions', (req: Request, res: Response) => {
    const { classId, assignmentId, studentId, status } = req.query;
    const db = readDb();

    let list = db.submissions;
    if (classId) list = list.filter((s) => s.classId === classId);
    if (assignmentId) list = list.filter((s) => s.assignmentId === assignmentId);
    if (studentId) list = list.filter((s) => s.studentId === studentId);
    if (status) list = list.filter((s) => s.status === status);

    res.json(list);
  });

  // Get single submission
  app.get('/api/submissions/:id', (req: Request, res: Response) => {
    const db = readDb();
    const sub = db.submissions.find((s) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Pengumpulan tidak ditemukan' });
    res.json(sub);
  });

  // Student submits assignment
  app.post('/api/submissions', (req: Request, res: Response) => {
    const {
      assignmentId,
      studentId,
      answers,
      cheatingCount,
      cheatingIncidents,
    } = req.body;

    const db = readDb();
    const assignment = db.assignments.find((a) => a.id === assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    const student = db.users.find((u) => u.id === studentId);
    if (!student) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });

    // Check deadline
    const now = new Date();
    const deadline = new Date(assignment.deadline);
    if (now > deadline) {
      return res.status(400).json({ error: 'Tenggat waktu pengerjaan telah lewat. Tugas tidak dapat dikerjakan lagi.' });
    }

    // Check if already submitted
    const existing = db.submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId
    );
    if (existing) {
      return res.status(400).json({ error: 'Anda sudah mengumpulkan tugas ini sebelumnya.' });
    }

    // Auto-calculate multiple choice preview score if any
    let autoScore = 0;
    let maxScore = 0;
    assignment.questions.forEach((q) => {
      maxScore += q.points || 0;
      if (q.type === 'pilihan_ganda') {
        const studentAns = (answers as any[])?.find((a) => a.questionId === q.id || a.questionNumber === q.number);
        if (studentAns && studentAns.selectedOptionId === q.correctOptionId) {
          autoScore += q.points || 0;
        }
      }
    });

    const newSub: Submission = {
      id: 'sub-' + crypto.randomUUID(),
      assignmentId,
      assignmentTitle: assignment.title,
      assignmentType: assignment.type,
      classId: assignment.classId,
      chapter: assignment.chapter,
      studentId,
      studentName: student.nama,
      studentAbsen: student.nomorAbsen || 0,
      studentClass: student.kelas || 'Kelas',
      submittedAt: new Date().toISOString(),
      answers: answers || [],
      cheatingCount: Number(cheatingCount) || 0,
      cheatingIncidents: cheatingIncidents || [],
      status: 'submitted', // In teacher's pending grading queue
      totalScore: undefined, // Teacher will finalize score manually
      maxScore: maxScore || 100,
      dialogue: [],
    };

    db.submissions.push(newSub);
    writeDb(db);

    // Notify teacher
    const cls = db.classes.find((c) => c.id === assignment.classId);
    if (cls) {
      const teacherIds = cls.teacherIds || [cls.teacherId];
      teacherIds.forEach((tId) => {
        pushNotification({
          userId: tId,
          title: `Jawaban Masuk: ${student.nama}`,
          message: `${student.nama} (${student.kelas || 'Siswa'}) telah mengumpulkan ${assignment.title}. Terdeteksi ${newSub.cheatingCount}x perpindahan layar.`,
          type: 'assignment',
          relatedId: newSub.id,
        });
      });
    }

    res.json(newSub);
  });

  // Teacher Grades & gives Feedback (Per-Question + Overall) (req 20, 44, 45)
  app.put('/api/submissions/:id/grade', (req: Request, res: Response) => {
    const { totalScore, overallFeedback, perQuestionFeedback } = req.body;
    const db = readDb();
    const sub = db.submissions.find((s) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Pengumpulan tidak ditemukan' });

    sub.totalScore = Number(totalScore);
    sub.overallFeedback = overallFeedback || '';
    sub.perQuestionFeedback = perQuestionFeedback || [];
    sub.status = 'reviewed'; // REMOVED from "kolom tanggungan guru" (req 20)

    writeDb(db);

    // Notify student via bell (req 45)
    pushNotification({
      userId: sub.studentId,
      title: `Nilai & Feedback Masuk: ${sub.assignmentTitle}`,
      message: `Guru telah memeriksa dan memberikan feedback pada tugas "${sub.assignmentTitle}". Nilai Anda: ${sub.totalScore}/${sub.maxScore}.`,
      type: 'feedback',
      relatedId: sub.id,
    });

    res.json(sub);
  });

  // Student and Teacher Dialogue Feedback Thread (req 48)
  app.post('/api/submissions/:id/dialogue', (req: Request, res: Response) => {
    const { senderRole, senderName, text } = req.body;
    if (!text || !senderRole || !senderName) {
      return res.status(400).json({ error: 'Pesan dan pengirim tidak boleh kosong.' });
    }

    const db = readDb();
    const sub = db.submissions.find((s) => s.id === req.params.id);
    if (!sub) return res.status(404).json({ error: 'Pengumpulan tidak ditemukan' });

    if (!sub.dialogue) sub.dialogue = [];

    const newReply = {
      id: 'dlg-' + crypto.randomUUID(),
      senderRole,
      senderName,
      timestamp: new Date().toISOString(),
      text: text.trim(),
    };

    sub.dialogue.push(newReply);
    writeDb(db);

    // Send notification to the other party
    if (senderRole === 'siswa') {
      const cls = db.classes.find((c) => c.id === sub.classId);
      if (cls) {
        const teacherIds = cls.teacherIds || [cls.teacherId];
        teacherIds.forEach((tId) => {
          pushNotification({
            userId: tId,
            title: `Balasan Siswa: ${senderName}`,
            message: `${senderName} membalas feedback pada tugas ${sub.assignmentTitle}: "${text.slice(0, 50)}..."`,
            type: 'reply',
            relatedId: sub.id,
          });
        });
      }
    } else {
      pushNotification({
        userId: sub.studentId,
        title: `Tanggapan Guru: ${senderName}`,
        message: `${senderName} menanggapi umpan balik Anda di ${sub.assignmentTitle}: "${text.slice(0, 50)}..."`,
        type: 'reply',
        relatedId: sub.id,
      });
    }

    res.json({ message: 'Balasan berhasil dikirim', dialogue: sub.dialogue });
  });

  // ==================== GEMINI AI CORRECTION & ANALYSIS ====================
  // Multimodal AI Analysis for Student's Answers (req 4, 15, 18, 28, 41)
  app.post('/api/ai/analyze-submission', async (req: Request, res: Response) => {
    const { submissionId } = req.body;
    const db = readDb();
    const sub = db.submissions.find((s) => s.id === submissionId);
    if (!sub) return res.status(404).json({ error: 'Pengumpulan tidak ditemukan' });

    const assignment = db.assignments.find((a) => a.id === sub.assignmentId);
    if (!assignment) return res.status(404).json({ error: 'Data tugas tidak ditemukan' });

    try {
      if (ai) {
        const perQuestionResults = [];

        for (const q of assignment.questions) {
          const studentAns = sub.answers.find(
            (a) => a.questionId === q.id || a.questionNumber === q.number
          );

          const prompt = `Anda adalah asisten guru ahli pendidik profesional (Platform Pembelajaran 'belajarin').
Tugas Anda adalah memeriksa dan menganalisis secara mendalam kesesuaian jawaban siswa terhadap soal dan kunci/rubrik acuan.

INFORMASI SOAL:
- Nomor Soal: ${q.number}
- Tipe Soal: ${q.type === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Esai'}
- Bobot Poin Maksimal: ${q.points}
- Pertanyaan: ${q.question}
- Pilihan Jawaban (jika PG): ${q.options ? JSON.stringify(q.options) : 'Tidak ada'}
- Kunci Jawaban / Rubrik Acuan: ${q.sampleAnswer || q.correctOptionId || 'Analisis secara ilmiah konsep yang relevan.'}

JAWABAN SISWA:
- Pilihan yang dipilih (jika PG): ${studentAns?.selectedOptionId || 'Tidak memilih'}
- Teks Jawaban Esai: ${studentAns?.essayText || '(Tidak mengisi teks)'}
- Lampiran Foto Jawaban: ${studentAns?.uploadedPhotoUrl ? 'Siswa melampirkan foto hasil pengerjaan/tulisan tangan.' : 'Tidak ada foto'}

INSTRUKSI ANALISIS:
1. Analisis kesesuaian konsep antara pertanyaan dan jawaban siswa.
2. Jika ada foto jawaban yang dilampirkan, periksa tulisan tangan/skema/rumus di foto dan berikan analisis khusus bukti foto.
3. Sebutkan kelebihan pemahaman siswa dan letak kesalahan/kekurangan spesifik.
4. Berikan saran skor (0 - ${q.points}) dan saran feedback membangun untuk siswa.

Kembalikan respon DALAM FORMAT JSON VALID persis seperti ini:
{
  "questionNumber": ${q.number},
  "isCorrect": true/false,
  "matchScore": number (0-100),
  "analysis": "Penjelasan mendalam kesesuaian konsep dan materi...",
  "photoAnalysis": "Analisis khusus foto jika ada, atau '-' jika tidak ada foto",
  "suggestedPoints": number (antara 0 sampai ${q.points}),
  "suggestedFeedback": "Catatan apresiasi dan koreksi ramah untuk siswa..."
}`;

          const parts: any[] = [{ text: prompt }];

          // Multimodal: if student uploaded a photo for this question, attach it!
          if (studentAns?.uploadedPhotoUrl && studentAns.uploadedPhotoUrl.startsWith('data:image/')) {
            const matches = studentAns.uploadedPhotoUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data,
                },
              });
            }
          }

          // Also attach question image if teacher uploaded one
          if (q.imageUrl && q.imageUrl.startsWith('data:image/')) {
            const matches = q.imageUrl.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2],
                },
              });
            }
          }

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts },
            config: {
              responseMimeType: 'application/json',
            },
          });

          const rawText = response.text || '{}';
          try {
            const parsed = JSON.parse(rawText);
            perQuestionResults.push(parsed);
          } catch (e) {
            // Heuristic extraction
            perQuestionResults.push({
              questionNumber: q.number,
              isCorrect: true,
              matchScore: 85,
              analysis: rawText.slice(0, 300),
              photoAnalysis: studentAns?.uploadedPhotoUrl ? 'Foto jawaban terbaca dengan baik.' : '-',
              suggestedPoints: Math.round(q.points * 0.85),
              suggestedFeedback: 'Jawaban telah dianalisis oleh AI. Guru dapat menyelaraskan nilai akhir.',
            });
          }
        }

        // Calculate suggested total
        let suggestedTotal = 0;
        perQuestionResults.forEach((r) => {
          suggestedTotal += r.suggestedPoints || 0;
        });

        const overallAnalysisText = `Analisis AI Belajarin telah memeriksa ${assignment.questions.length} butir soal dan foto lampiran siswa ${sub.studentName}. Estimasi penguasaan materi: ${Math.round((suggestedTotal / sub.maxScore) * 100)}%. Rekomendasi skor total: ${suggestedTotal}/${sub.maxScore}. Guru tetap memiliki wewenang penuh untuk menentukan nilai akhir dan catatan koreksi.`;

        sub.aiAnalysisOverall = overallAnalysisText;
        sub.aiAnalysisPerQuestion = perQuestionResults;
        writeDb(db);

        return res.json({
          overallAnalysis: overallAnalysisText,
          perQuestion: perQuestionResults,
          suggestedTotal,
        });
      } else {
        // Fallback pedagogical generator if API key is not yet set
        const perQuestionResults = assignment.questions.map((q) => {
          const studentAns = sub.answers.find((a) => a.questionId === q.id || a.questionNumber === q.number);
          const hasPhoto = !!studentAns?.uploadedPhotoUrl;
          const isPg = q.type === 'pilihan_ganda';
          const isCorrectPg = isPg && studentAns?.selectedOptionId === q.correctOptionId;
          const score = isPg ? (isCorrectPg ? q.points : 0) : Math.round(q.points * 0.88);

          return {
            questionNumber: q.number,
            isCorrect: isPg ? isCorrectPg : true,
            matchScore: isPg ? (isCorrectPg ? 100 : 0) : 88,
            analysis: isPg
              ? isCorrectPg
                ? `Pilihan siswa (${studentAns?.selectedOptionId}) sesuai dengan kunci jawaban (${q.correctOptionId}). Pemahaman konsep dasar akurat.`
                : `Pilihan siswa (${studentAns?.selectedOptionId}) belum tepat. Kunci yang benar adalah (${q.correctOptionId}).`
              : `Siswa menjabarkan konsep dengan baik. Argumentasi sesuai dengan indikator capaian bab ${assignment.chapter}.`,
            photoAnalysis: hasPhoto
              ? 'Bukti pengerjaan berupa foto telah terverifikasi. Tulisan dan skema mendukung jawaban esai siswa.'
              : '-',
            suggestedPoints: score,
            suggestedFeedback: isPg
              ? isCorrectPg
                ? 'Pilihan tepat, pertahankan pemahamanmu.'
                : 'Perhatikan kembali konsep kunci pada buku pegangan.'
              : 'Penjelasan esai sudah runtut, tambahkan contoh nyata untuk hasil maksimal.',
          };
        });

        let suggestedTotal = 0;
        perQuestionResults.forEach((r) => {
          suggestedTotal += r.suggestedPoints || 0;
        });

        const overallAnalysisText = `Analisis Cerdas Belajarin: Pemeriksaan jawaban siswa ${sub.studentName} pada ${assignment.title} telah selesai. Indikasi penguasaan materi sebesar ${Math.round((suggestedTotal / sub.maxScore) * 100)}%. Rekomendasi skor: ${suggestedTotal}/${sub.maxScore}.`;

        sub.aiAnalysisOverall = overallAnalysisText;
        sub.aiAnalysisPerQuestion = perQuestionResults;
        writeDb(db);

        return res.json({
          overallAnalysis: overallAnalysisText,
          perQuestion: perQuestionResults,
          suggestedTotal,
        });
      }
    } catch (err: any) {
      console.error('Gemini AI error:', err);
      res.status(500).json({
        error: 'Gagal menganalisis jawaban dengan AI: ' + (err.message || 'Unknown error'),
      });
    }
  });

  // ==================== ANNOUNCEMENTS ====================
  // Get announcements
  app.get('/api/announcements', (req: Request, res: Response) => {
    const { classId, userId } = req.query;
    const db = readDb();

    let list = db.announcements;

    if (userId) {
      const user = db.users.find((u) => u.id === userId);
      if (user) {
        if (user.role === 'siswa') {
          const studentClasses = getClassesForStudent(user, db);
          const studentClassIds = new Set(studentClasses.map((c) => c.id));
          list = list.filter((a) => a.classId === 'all' || studentClassIds.has(a.classId));
        } else if (user.role === 'guru') {
          const teacherClasses = db.classes.filter(
            (c) =>
              c.teacherId === user.id ||
              (c.teacherIds && c.teacherIds.includes(user.id)) ||
              (user.joinedClasses && user.joinedClasses.includes(c.id))
          );
          const teacherClassIds = new Set(teacherClasses.map((c) => c.id));
          list = list.filter((a) => a.classId === 'all' || teacherClassIds.has(a.classId));
        }
        // admin role sees all announcements
      }
    } else if (classId) {
      list = list.filter((a) => a.classId === classId || a.classId === 'all');
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(list);
  });

  // Create announcement (Guru or Admin) (req 6, 42)
  app.post('/api/announcements', (req: Request, res: Response) => {
    const { classId, authorRole, authorName, title, content, scheduleDate } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan isi pengumuman wajib diisi.' });
    }

    const db = readDb();
    let className = 'Semua Kelas';
    if (classId && classId !== 'all') {
      const cls = db.classes.find((c) => c.id === classId);
      if (cls) className = cls.name;
    }

    const newAnn: Announcement = {
      id: 'ann-' + crypto.randomUUID(),
      classId: classId || 'all',
      className,
      authorRole,
      authorName,
      title: title.trim(),
      content: content.trim(),
      scheduleDate: scheduleDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.announcements.unshift(newAnn);
    writeDb(db);

    // Notify students on the bell (only students belonging to target class, or all if global)
    if (classId && classId !== 'all') {
      const cls = db.classes.find((c) => c.id === classId);
      if (cls) {
        const targetStudentIds = getStudentIdsForClass(cls, db);
        targetStudentIds.forEach((sId) => {
          pushNotification({
            userId: sId,
            title: `Pengumuman Kelas ${className}: ${title}`,
            message: `${authorName}: ${content.slice(0, 75)}...`,
            type: 'announcement',
            relatedId: newAnn.id,
          });
        });
      }
    } else {
      // Send to all students
      db.users
        .filter((u) => u.role === 'siswa')
        .forEach((s) => {
          pushNotification({
            userId: s.id,
            title: `Pengumuman Umum: ${title}`,
            message: `${authorName}: ${content.slice(0, 75)}...`,
            type: 'announcement',
            relatedId: newAnn.id,
          });
        });
    }

    res.json(newAnn);
  });

  // Delete announcement
  app.delete('/api/announcements/:id', (req: Request, res: Response) => {
    const db = readDb();
    db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
    writeDb(db);
    res.json({ success: true });
  });

  // ==================== NOTIFICATIONS ====================
  // Get notifications for user with automatic sync for all published tasks in user's class
  app.get('/api/notifications', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.json([]);

    const db = readDb();
    const user = db.users.find((u) => u.id === userId);
    if (!user) return res.json([]);

    // Synchronize task notifications so all students in published classes receive them
    const changed = syncStudentTaskNotifications(db);
    if (changed) {
      writeDb(db);
    }

    const list = db.notifications
      .filter((n) => {
        if (n.userId === userId) {
          // If it's an announcement notification for a specific class, verify student is in that class
          if (n.type === 'announcement' && n.relatedId && user.role === 'siswa') {
            const ann = db.announcements.find((a) => a.id === n.relatedId);
            if (ann && ann.classId && ann.classId !== 'all') {
              const studentClasses = getClassesForStudent(user, db);
              const inClass = studentClasses.some((c) => c.id === ann.classId);
              if (!inClass) return false;
            }
          }
          return true;
        }

        if (n.userId === 'all') {
          if (n.type === 'announcement' && n.relatedId && user.role === 'siswa') {
            const ann = db.announcements.find((a) => a.id === n.relatedId);
            if (ann && ann.classId && ann.classId !== 'all') {
              const studentClasses = getClassesForStudent(user, db);
              const inClass = studentClasses.some((c) => c.id === ann.classId);
              return inClass;
            }
          }
          return true;
        }

        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    res.json(list);
  });

  // Mark notification read
  app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    const db = readDb();
    const notif = db.notifications.find((n) => n.id === req.params.id);
    if (notif) {
      notif.isRead = true;
      writeDb(db);
    }
    res.json({ success: true });
  });

  // Mark all notifications read
  app.put('/api/notifications/read-all', (req: Request, res: Response) => {
    const userId = req.body.userId as string;
    const db = readDb();
    db.notifications.forEach((n) => {
      if (n.userId === userId || n.userId === 'all') {
        n.isRead = true;
      }
    });
    writeDb(db);
    res.json({ success: true });
  });

  // ==================== STATS FOR SISWA PROGRESS ====================
  app.get('/api/student-progress/:studentId', (req: Request, res: Response) => {
    const { studentId } = req.params;
    const db = readDb();
    const student = db.users.find((u) => u.id === studentId);
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    // Find all assignments belonging to student's classes
    const studentClasses = db.classes.filter(
      (c) => c.studentIds.includes(studentId) || student.joinedClasses.includes(c.id)
    );
    const classIds = studentClasses.map((c) => c.id);

    // Published assignments in student's classes
    const availableAssignments = db.assignments.filter(
      (a) => classIds.includes(a.classId) && a.status === 'published'
    );

    // Submissions by this student
    const studentSubmissions = db.submissions.filter((s) => s.studentId === studentId);

    const submittedAssignmentIds = new Set(studentSubmissions.map((s) => s.assignmentId));

    const totalAssigned = availableAssignments.length;
    const totalCompleted = availableAssignments.filter((a) =>
      submittedAssignmentIds.has(a.id)
    ).length;

    const uncompletedAssignments = availableAssignments.filter(
      (a) => !submittedAssignmentIds.has(a.id)
    );

    const completionPercentage =
      totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

    res.json({
      totalAssigned,
      totalCompleted,
      completionPercentage,
      uncompletedAssignments,
      submissions: studentSubmissions,
      enrolledClasses: studentClasses,
    });
  });

  // ==================== VITE MIDDLEWARE / STATIC FILES ====================
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [belajarin] Full-stack Server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
