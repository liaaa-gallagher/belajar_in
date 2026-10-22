import React, { useState, useEffect } from 'react';
import { User, AssignmentItem, Submission, AppNotification } from './types';
import { LoginRegisterView } from './components/LoginRegisterView';
import { Navbar } from './components/Navbar';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentWorkInterface } from './components/StudentWorkInterface';
import { StudentSelfResultView } from './components/StudentSelfResultView';
import { TeacherDashboard } from './components/TeacherDashboard';
import { SessionEnforcer } from './components/SessionEnforcer';
import { apiFetch } from './utils/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Student active view states
  const [activeAssignmentToWork, setActiveAssignmentToWork] =
    useState<AssignmentItem | null>(null);
  const [viewingResult, setViewingResult] = useState<{
    asg: AssignmentItem;
    sub: Submission;
  } | null>(null);

  // Restore session from localStorage on start
  useEffect(() => {
    const savedUser = localStorage.getItem('belajarin_user');
    const savedSession = localStorage.getItem('belajarin_session_id');

    if (savedUser && savedSession) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setCurrentSessionId(savedSession);
      } catch (e) {
        localStorage.removeItem('belajarin_user');
        localStorage.removeItem('belajarin_session_id');
      }
    }
    setLoadingInitial(false);
  }, []);

  const handleLoginSuccess = (user: User, sessionId: string) => {
    setCurrentUser(user);
    setCurrentSessionId(sessionId);
    localStorage.setItem('belajarin_user', JSON.stringify(user));
    localStorage.setItem('belajarin_session_id', sessionId);
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (e) {
        // ignore
      }
    }
    setCurrentUser(null);
    setCurrentSessionId(null);
    setActiveAssignmentToWork(null);
    setViewingResult(null);
    localStorage.removeItem('belajarin_user');
    localStorage.removeItem('belajarin_session_id');
  };

  const handleForcedLogout = (reason: string) => {
    handleLogout();
  };

  // Notification click routing
  const handleSelectNotification = async (notif: AppNotification) => {
    if (!currentUser) return;

    if (notif.relatedId) {
      if (notif.type === 'feedback' || notif.type === 'reply') {
        // Fetch submission and corresponding assignment
        try {
          const sub = await apiFetch<Submission>(
            `/api/submissions/${notif.relatedId}`
          );
          const asg = await apiFetch<AssignmentItem>(
            `/api/assignments/${sub.assignmentId}`
          );
          if (currentUser.role === 'siswa') {
            setActiveAssignmentToWork(null);
            setViewingResult({ asg, sub });
          }
        } catch (e) {
          console.error(e);
        }
      } else if (notif.type === 'assignment') {
        try {
          const asg = await apiFetch<AssignmentItem>(
            `/api/assignments/${notif.relatedId}`
          );
          if (currentUser.role === 'siswa') {
            setViewingResult(null);
            setActiveAssignmentToWork(asg);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-500">Memuat belajarin...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Login / Register View
  if (!currentUser) {
    return <LoginRegisterView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* 1 Akun 1 Perangkat Enforcement Background Watcher (req 5, 31) */}
      <SessionEnforcer
        currentUser={currentUser}
        currentSessionId={currentSessionId}
        onForcedLogout={handleForcedLogout}
      />

      {/* Main Top Navigation */}
      <Navbar
        user={currentUser}
        onLogout={handleLogout}
        onSelectNotification={handleSelectNotification}
      />

      {/* Main App Content */}
      <main className="flex-1">
        {currentUser.role === 'siswa' ? (
          activeAssignmentToWork ? (
            /* Student Test / Exam Working Interface */
            <StudentWorkInterface
              assignment={activeAssignmentToWork}
              user={currentUser}
              onSubmitted={(sub) => {
                setActiveAssignmentToWork(null);
                setViewingResult({ asg: activeAssignmentToWork, sub });
              }}
              onCancel={() => setActiveAssignmentToWork(null)}
            />
          ) : viewingResult ? (
            /* Student Self Progress / Reviewing Submitted Document (PDF Export) */
            <StudentSelfResultView
              assignment={viewingResult.asg}
              submission={viewingResult.sub}
              currentUser={currentUser}
              onBack={() => setViewingResult(null)}
              onUpdatedSubmission={(newSub) =>
                setViewingResult({ asg: viewingResult.asg, sub: newSub })
              }
            />
          ) : (
            /* Student Dashboard */
            <StudentDashboard
              user={currentUser}
              onStartAssignment={(asg) => {
                setViewingResult(null);
                setActiveAssignmentToWork(asg);
              }}
              onViewResult={(asg, sub) => {
                setActiveAssignmentToWork(null);
                setViewingResult({ asg, sub });
              }}
            />
          )
        ) : (
          /* Teacher / Admin Portal */
          <TeacherDashboard user={currentUser} />
        )}
      </main>

      {/* Subtle Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white/70 text-center text-xs text-slate-400">
        <p>
          belajarin &copy; {new Date().getFullYear()} • Platform Pembelajaran & Evaluasi Digital Terpadu
        </p>
      </footer>
    </div>
  );
}
