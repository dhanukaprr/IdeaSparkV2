import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchSession,
  getLecturerKey,
  subscribeSessionEvents,
  SessionFetchResult,
} from './api';
import { SessionPublicState } from './types';
import { JoinView } from './student/JoinView';
import { BusinessPicker } from './student/BusinessPicker';
import { StudentWall } from './student/StudentWall';
import { ProjectorWall } from './lecturer/ProjectorWall';
import { LecturerDashboard } from './lecturer/LecturerDashboard';
import { IdeaComposerModal } from './components/IdeaComposerModal';
import { QRCodeModal } from './components/QRCodeModal';
import { CreateSessionModal } from './lecturer/CreateSessionModal';
import {
  Sparkles,
  QrCode,
  Tv,
  Users,
  Settings,
  PlusCircle,
  Radio,
  LogOut,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Session code from URL query or fallback
  const getInitialCode = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const queryCode = params.get('code');
      if (queryCode) return queryCode.toUpperCase().trim();
      const saved = localStorage.getItem('ideaspark_last_code');
      if (saved) return saved;
    }
    return 'SPARK'; // Default sample session code
  };

  const [sessionCode, setSessionCode] = useState<string>(getInitialCode());
  const [session, setSession] = useState<SessionFetchResult | null>(null);
  const [currentView, setCurrentView] = useState<'student' | 'projector' | 'lecturer'>('student');
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lecturerKey, setLecturerKey] = useState<string | null>(null);

  // Modals
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerTargetBizId, setComposerTargetBizId] = useState<string | undefined>();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Sync lecturer key
  useEffect(() => {
    if (sessionCode) {
      const key = getLecturerKey(sessionCode);
      setLecturerKey(key);
    }
  }, [sessionCode]);

  // Load session data
  const loadSession = useCallback(
    async (codeToLoad: string, silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        const data = await fetchSession(codeToLoad);
        setSession(data);
        setSessionCode(codeToLoad);
        localStorage.setItem('ideaspark_last_code', codeToLoad);

        // Update URL query without full reload
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('code', codeToLoad);
          window.history.replaceState({}, '', url.toString());
        }

        // If there is an active focus from lecturer and user has no selected business, auto-focus
        if (!selectedBusinessId && data.activeBusinessId) {
          setSelectedBusinessId(data.activeBusinessId);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load session');
        setSession(null);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [selectedBusinessId]
  );

  // Initial fetch
  useEffect(() => {
    if (sessionCode) {
      loadSession(sessionCode);
    } else {
      setIsLoading(false);
    }
  }, [sessionCode, loadSession]);

  // Setup Real-time Firestore Live Subscription
  useEffect(() => {
    if (!sessionCode) return;

    // Direct Firestore real-time listener (updates instantaneously across all devices & Netlify)
    const unsubscribe = subscribeSessionEvents(
      sessionCode,
      (updatedState: SessionPublicState) => {
        setSession((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            ...updatedState,
            // Preserve local participant vote status and lecturer rights
            myVotes: prev.myVotes,
            isLecturer: prev.isLecturer,
          };
        });
      },
      (err) => {
        console.warn('Live subscription notice:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [sessionCode]);

  const handleJoinSession = (code: string) => {
    loadSession(code);
  };

  const handleOpenComposer = (bizId?: string) => {
    setComposerTargetBizId(bizId || selectedBusinessId || (session?.businesses[0]?.id));
    setIsComposerOpen(true);
  };

  const handleSessionCreated = (
    newCode: string,
    newLecturerKey: string,
    newSession: SessionPublicState
  ) => {
    setSessionCode(newCode);
    setLecturerKey(newLecturerKey);
    setSession({
      ...newSession,
      isLecturer: true,
      myVotes: {},
    });
    setCurrentView('lecturer');
  };

  const handleLeaveSession = () => {
    setSession(null);
    setSessionCode('');
    localStorage.removeItem('ideaspark_last_code');
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('code');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // If no session joined or error on join, show Join Screen
  if (!session && !isLoading) {
    return (
      <div className="min-h-screen bg-colorful-mesh text-slate-900 flex flex-col font-sans">
        <header className="h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-8 shadow-xs">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-black text-xl sm:text-2xl tracking-tighter bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                IDEASPARK
              </span>
            </div>
            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-widest uppercase text-slate-500 hidden xs:inline">
              CREATIVITY & INNOVATION // EBM
            </span>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Lecturer: New Session</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <JoinView
            onJoin={handleJoinSession}
            initialCode={sessionCode}
            isLoading={isLoading}
            error={error}
          />
        </main>

        <footer className="h-10 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm flex items-center px-6 justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="flex gap-4 sm:gap-8">
            <span className="flex items-center gap-1.5 text-blue-600">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              REAL-TIME SYNC
            </span>
            <span className="hidden sm:inline text-slate-600">ANONYMOUS 3-VOTE RULE</span>
          </div>
          <div className="flex gap-4 sm:gap-8">
            <span className="text-emerald-600 font-bold">SYSTEM ONLINE</span>
          </div>
        </footer>

        <CreateSessionModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSessionCreated={handleSessionCreated}
        />
      </div>
    );
  }

  // Projector Fullscreen Mode
  if (currentView === 'projector' && session) {
    return (
      <div className="min-h-screen bg-colorful-mesh-dark text-white font-sans flex flex-col">
        {/* Floating Quick Return Bar */}
        <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
          <button
            onClick={() => setCurrentView('student')}
            className="px-4 py-2 bg-slate-900/90 hover:bg-blue-600 text-white border border-slate-700/80 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-black/40 backdrop-blur-md transition-all"
          >
            ← Exit Projector View
          </button>
        </div>

        <ProjectorWall
          session={session}
          lecturerKey={lecturerKey}
          onOpenLecturerPanel={() => setCurrentView('lecturer')}
          onRefresh={() => loadSession(sessionCode, true)}
        />
      </div>
    );
  }

  const activeBusiness = session?.businesses.find((b) => b.id === selectedBusinessId);
  const myVotesForActiveBiz =
    selectedBusinessId && session?.myVotes && session.myVotes[selectedBusinessId]
      ? session.myVotes[selectedBusinessId]
      : [];

  return (
    <div className="min-h-screen bg-colorful-mesh text-slate-900 flex flex-col font-sans">
      {/* Universal Colorful Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo & Session Code Badge */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0">
            <div
              onClick={() => {
                setSelectedBusinessId(null);
                setCurrentView('student');
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-black text-xl sm:text-2xl tracking-tighter bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                IDEASPARK
              </span>
            </div>

            <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>

            {session && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-lg px-3 py-1 text-xs">
                <span className="text-[9px] uppercase font-black tracking-widest text-blue-600 hidden md:inline">
                  PIN:
                </span>
                <span className="font-mono font-black text-xs sm:text-sm text-blue-950">
                  {session.code}
                </span>
                <button
                  id="header-qr-btn"
                  onClick={() => setIsQrOpen(true)}
                  className="text-blue-600 hover:text-blue-800 border-l border-blue-200 pl-2 transition-colors"
                  title="Show QR Code"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Center: Role / View Switcher (Colorful Pill Switcher) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold gap-1">
            <button
              id="nav-student-btn"
              onClick={() => setCurrentView('student')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                currentView === 'student'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Student Wall</span>
            </button>

            <button
              id="nav-projector-btn"
              onClick={() => setCurrentView('projector')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                currentView === 'projector'
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Projector</span>
            </button>

            <button
              id="nav-lecturer-btn"
              onClick={() => setCurrentView('lecturer')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                currentView === 'lecturer'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lecturer</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <button
              id="header-post-idea-btn"
              onClick={() => handleOpenComposer()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md shadow-indigo-500/25 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Post Idea</span>
            </button>

            <button
              onClick={handleLeaveSession}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all"
              title="Leave / Switch Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main App Body */}
      <main className="flex-1">
        {isLoading && !session ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-600">
              Connecting to live wall...
            </p>
          </div>
        ) : currentView === 'lecturer' && session ? (
          <LecturerDashboard
            session={session}
            lecturerKey={lecturerKey || ''}
            onOpenProjector={() => setCurrentView('projector')}
            onRefresh={() => loadSession(sessionCode, true)}
          />
        ) : session && selectedBusinessId && activeBusiness ? (
          <StudentWall
            sessionCode={session.code}
            business={activeBusiness}
            businesses={session.businesses}
            ideas={session.ideas}
            myVotes={myVotesForActiveBiz}
            onSelectBusiness={(id) => setSelectedBusinessId(id)}
            onBackToBusinesses={() => setSelectedBusinessId(null)}
            onOpenSubmitModal={(bizId) => handleOpenComposer(bizId)}
            onVoteUpdated={() => loadSession(session.code, true)}
          />
        ) : session ? (
          <BusinessPicker
            businesses={session.businesses}
            ideas={session.ideas}
            myVotes={session.myVotes || {}}
            onSelectBusiness={(id) => setSelectedBusinessId(id)}
            onOpenSubmitModal={(bizId) => handleOpenComposer(bizId)}
          />
        ) : null}
      </main>

      {/* Footer Technical Metric Bar */}
      {session && (
        <footer className="h-11 border-t border-slate-200 bg-white/90 backdrop-blur-md flex items-center px-6 justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="flex gap-4 sm:gap-8">
            <span className="text-slate-800">ROOM: <span className="font-mono text-blue-600 font-bold">{session.code}</span></span>
            <span className="hidden sm:inline text-indigo-600">{session.ideas.length} IDEAS</span>
            <span className="hidden sm:inline text-rose-600">{session.ideas.reduce((s, i) => s + i.votesCount, 0)} TOTAL VOTES</span>
          </div>
          <div className="flex gap-4 sm:gap-8 items-center">
            <span className="hidden md:inline text-slate-600">{session.cohort || 'EBM'}</span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              SYNC ONLINE
            </span>
          </div>
        </footer>
      )}

      {/* Idea Composer Modal */}
      {session && (
        <IdeaComposerModal
          isOpen={isComposerOpen}
          onClose={() => setIsComposerOpen(false)}
          sessionCode={session.code}
          businesses={session.businesses}
          selectedBusinessId={composerTargetBizId || selectedBusinessId || undefined}
          onIdeaSubmitted={() => loadSession(session.code, true)}
        />
      )}

      {/* QR Code Modal */}
      {session && (
        <QRCodeModal
          isOpen={isQrOpen}
          onClose={() => setIsQrOpen(false)}
          sessionCode={session.code}
        />
      )}

      {/* Lecturer Create Session Modal */}
      <CreateSessionModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSessionCreated={handleSessionCreated}
      />
    </div>
  );
}
