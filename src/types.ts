export type UserRole = 'siswa' | 'guru' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  nama: string;
  username: string;
  password?: string;
  tglLahir: string;
  kelas?: string;
  nomorAbsen?: number;
  nip?: string;
  adminCode?: string;
  activeSessionId?: string;
  isActive?: boolean;
  lastLogin?: string;
  joinedClasses: string[];
}

export interface ClassRoom {
  id: string;
  name: string;
  subject: string;
  grade: string;
  uniqueCode: string;
  teacherId: string;
  teacherName: string;
  description: string;
  createdAt: string;
  studentIds: string[];
  teacherIds?: string[];
}

export type AssignmentType = 'lkpd' | 'bank_soal' | 'evaluasi';

export interface QuestionOption {
  id: string;
  text: string;
  imageUrl?: string;
}

export interface QuestionItem {
  id: string;
  number: number;
  type: 'pilihan_ganda' | 'esai';
  question: string;
  imageUrl?: string;
  options?: QuestionOption[];
  correctOptionId?: string;
  sampleAnswer?: string; // Kunci jawaban / rubrik acuan
  points: number;
}

export interface AssignmentItem {
  id: string;
  classId: string;
  type: AssignmentType;
  chapter: string; // e.g. "Bab 1: Struktur & Fungsi Sel"
  chapterOrder: number;
  title: string;
  description: string;
  instructions?: string;
  publishDate: string; // ISO
  deadline: string; // ISO
  durationMinutes?: number;
  questions: QuestionItem[];
  status: 'published' | 'archived' | 'draft';
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface CheatingIncident {
  timestamp: string;
  questionNumber: number;
  durationSeconds: number;
  reason: string;
}

export interface StudentAnswer {
  questionId: string;
  questionNumber: number;
  selectedOptionId?: string;
  essayText?: string;
  uploadedPhotoUrl?: string; // specific photo for this question only
}

export interface AiAnalysisPerQuestion {
  questionNumber: number;
  isCorrect?: boolean;
  matchScore: number;
  analysis: string;
  photoAnalysis?: string;
  suggestedPoints: number;
  suggestedFeedback: string;
}

export interface PerQuestionFeedback {
  questionNumber: number;
  scoreAwarded: number;
  feedbackText: string;
}

export interface FeedbackDialogue {
  id: string;
  senderRole: 'guru' | 'siswa' | 'admin';
  senderName: string;
  timestamp: string;
  text: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: AssignmentType;
  classId: string;
  chapter: string;
  studentId: string;
  studentName: string;
  studentAbsen: number;
  studentClass: string;
  submittedAt: string;
  answers: StudentAnswer[];
  cheatingCount: number;
  cheatingIncidents: CheatingIncident[];
  status: 'submitted' | 'reviewed'; // Once reviewed, removed from teacher pending queue
  totalScore?: number;
  maxScore: number;
  aiAnalysisOverall?: string;
  aiAnalysisPerQuestion?: AiAnalysisPerQuestion[];
  overallFeedback?: string;
  perQuestionFeedback?: PerQuestionFeedback[];
  dialogue?: FeedbackDialogue[];
}

export interface Announcement {
  id: string;
  classId: string; // class ID or 'all'
  className?: string;
  authorRole: 'guru' | 'admin';
  authorName: string;
  title: string;
  content: string;
  scheduleDate: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string; // specific user or 'class:<id>' or 'all'
  title: string;
  message: string;
  type: 'announcement' | 'assignment' | 'feedback' | 'reply';
  relatedId?: string;
  createdAt: string;
  isRead: boolean;
}
