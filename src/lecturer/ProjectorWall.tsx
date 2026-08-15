import { useState, useMemo, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Business, CATEGORIES, Idea, IdeaCategory, SessionPublicState } from '../types';
import {
  Sparkles,
  Maximize2,
  Minimize2,
  QrCode,
  Trophy,
  Grid,
  Columns3,
  Heart,
  Users,
  Lightbulb,
  CheckCircle2,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { updateBusiness } from '../api';

interface ProjectorWallProps {
  session: SessionPublicState;
  lecturerKey?: string | null;
  onOpenLecturerPanel: () => void;
  onRefresh?: () => void;
}

export function ProjectorWall({
  session,
  lecturerKey,
  onOpenLecturerPanel,
  onRefresh,
}: ProjectorWallProps) {
  const [selectedBizId, setSelectedBizId] = useState<string>(session.activeBusinessId || 'all');
  const [viewMode, setViewMode] = useState<'grid' | 'top' | 'categories'>('grid');
  const [showQrPanel, setShowQrPanel] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  const containerRef = useRef<HTMLDivElement | null>(null);

  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?code=${encodeURIComponent(session.code)}`
    : `https://ideaspark.app/?code=${session.code}`;

  // Generate QR code for projector
  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrUrl(url))
      .catch((err) => console.error('Failed to generate projector QR:', err));
  }, [joinUrl]);

  // Fullscreen listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const activeBusiness = useMemo(() => {
    if (selectedBizId === 'all') return null;
    return session.businesses.find((b) => b.id === selectedBizId) || null;
  }, [session.businesses, selectedBizId]);

  const relevantIdeas = useMemo(() => {
    if (selectedBizId === 'all') {
      return session.ideas;
    }
    return session.ideas.filter((i) => i.businessId === selectedBizId);
  }, [session.ideas, selectedBizId]);

  const topRankedIdeas = useMemo(() => {
    return [...relevantIdeas].sort((a, b) => b.votesCount - a.votesCount || b.createdAt - a.createdAt);
  }, [relevantIdeas]);

  const handleToggleVoting = async () => {
    if (!activeBusiness || !lecturerKey) return;
    try {
      await updateBusiness(
        session.code,
        activeBusiness.id,
        { isVotingClosed: !activeBusiness.isVotingClosed },
        lecturerKey
      );
      onRefresh?.();
    } catch (err) {
      console.error('Failed to toggle voting:', err);
    }
  };

  const getCategoryTheme = (catName: IdeaCategory) => {
    return (
      CATEGORIES.find((c) => c.name === catName) || {
        name: catName,
        description: '',
        badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
        badgeText: 'text-slate-700',
        badgeBorder: 'border-slate-200',
        cardAccent: 'border-l-slate-400',
        iconName: 'Lightbulb',
      }
    );
  };

  return (
    <div
      ref={containerRef}
      id="projector-wall-container"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 select-none font-sans relative overflow-x-hidden"
    >
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Projector Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 relative z-10">
        {/* Left: Branding & Session Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {session.title}
              </h1>
              <span className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>LIVE WALL</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {session.cohort || 'Higher Diploma in Entrepreneurial Business Management'}
            </p>
          </div>
        </div>

        {/* Center: Big Join Pill for Room Visibility */}
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3.5 sm:px-6 flex items-center justify-between gap-6 shadow-xl shadow-slate-950/50">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">
              JOIN ON MOBILE CAMERA
            </div>
            <div className="text-xs text-slate-300 font-mono">
              {typeof window !== 'undefined' ? window.location.host : 'ideaspark.app'}
            </div>
          </div>

          <div className="border-l border-slate-700/80 pl-6 text-right">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
              SESSION CODE
            </div>
            <div className="text-3xl font-black font-mono tracking-widest bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              {session.code}
            </div>
          </div>
        </div>

        {/* Right: Controls (View modes, QR toggle, Fullscreen) */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <button
            id="projector-qr-toggle"
            onClick={() => setShowQrPanel(!showQrPanel)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              showQrPanel
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle QR Code Panel"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden sm:inline">QR Code</span>
          </button>

          <button
            id="projector-fullscreen-btn"
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition-all shadow-xs"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {lecturerKey && (
            <button
              id="projector-lecturer-btn"
              onClick={onOpenLecturerPanel}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all"
            >
              Lecturer Panel
            </button>
          )}
        </div>
      </header>

      {/* Sub-Header: Business Switcher & Stats Bar */}
      <div className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 relative z-10">
        {/* Business Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            id="projector-tab-all"
            onClick={() => setSelectedBizId('all')}
            className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap rounded-xl transition-all ${
              selectedBizId === 'all'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700'
            }`}
          >
            All Ventures ({session.businesses.length})
          </button>

          {session.businesses.map((biz) => {
            const count = session.ideas.filter((i) => i.businessId === biz.id).length;
            const isSelected = selectedBizId === biz.id;
            return (
              <button
                key={biz.id}
                id={`projector-tab-${biz.id}`}
                onClick={() => setSelectedBizId(biz.id)}
                className={`px-4 py-2 text-xs sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap rounded-xl transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-indigo-500/25'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{biz.name}</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
                {biz.isVotingClosed && (
                  <Lock className="w-3.5 h-3.5 text-amber-400" title="Voting Closed" />
                )}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher (Grid / Top Ideas / Category Columns) */}
        <div className="flex items-center gap-3">
          {activeBusiness && lecturerKey && (
            <button
              id="projector-quick-toggle-voting"
              onClick={handleToggleVoting}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border ${
                activeBusiness.isVotingClosed
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              {activeBusiness.isVotingClosed ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Reopen Voting</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Close Voting</span>
                </>
              )}
            </button>
          )}

          <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              id="viewmode-grid"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Live Wall</span>
            </button>
            <button
              id="viewmode-top"
              onClick={() => setViewMode('top')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                viewMode === 'top'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Top Ideas</span>
            </button>
            <button
              id="viewmode-categories"
              onClick={() => setViewMode('categories')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                viewMode === 'categories'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6 mt-4 relative z-10">
        {/* Left/Main Column: Ideas Wall */}
        <div className="flex-1 min-w-0">
          {activeBusiness && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-slate-950/40 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                    FOCUSED VENTURE PITCH:
                  </span>
                  <h2 className="text-lg font-black text-white">{activeBusiness.name}</h2>
                  <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">({activeBusiness.type})</span>
                </div>
                {activeBusiness.description && (
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">{activeBusiness.description}</p>
                )}
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                <div className="text-right">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Submissions
                  </div>
                  <div className="text-xl font-black text-white font-mono">{relevantIdeas.length}</div>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                    Votes Cast
                  </div>
                  <div className="text-xl font-black text-rose-400 font-mono">
                    {relevantIdeas.reduce((sum, i) => sum + i.votesCount, 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {relevantIdeas.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl p-8 text-center bg-slate-900/40 shadow-xs">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-blue-400 mb-3 shadow-md">
                <Lightbulb className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold uppercase tracking-wider text-slate-200">Waiting for submissions...</h3>
              <p className="text-xs text-slate-400 max-w-md mt-1 font-mono">
                Scan the QR code or enter session code <strong className="text-white bg-blue-600 px-2 py-0.5 rounded-sm font-mono">{session.code}</strong> on your phone to submit creative ideas!
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* Live Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
              {topRankedIdeas.map((idea, index) => {
                const theme = getCategoryTheme(idea.category);
                const isTopThree = index < 3 && idea.votesCount > 0;
                const associatedBiz = session.businesses.find((b) => b.id === idea.businessId);

                return (
                  <div
                    key={idea.id}
                    className={`p-5 rounded-2xl border flex flex-col justify-between transition-all duration-200 relative overflow-hidden ${
                      isTopThree
                        ? 'bg-slate-900/90 border-indigo-500/40 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/80 border-slate-800 shadow-md shadow-slate-950/50 hover:border-slate-700'
                    }`}
                  >
                    {isTopThree && (
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-500"></div>
                    )}

                    <div>
                      {/* Category & Business Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${theme.badgeBg}`}
                        >
                          {idea.category}
                        </span>

                        {selectedBizId === 'all' && associatedBiz && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full truncate max-w-[140px]">
                            {associatedBiz.name}
                          </span>
                        )}
                      </div>

                      {/* Idea Text */}
                      <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed mb-4">
                        {idea.text}
                      </p>
                    </div>

                    {/* Votes Footer */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isTopThree && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-mono font-black rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-xs">
                            <Trophy className="w-3 h-3" />
                            #{index + 1}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 uppercase">Anonymous</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs shadow-xs">
                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                        <span className="font-mono text-sm">{idea.votesCount}</span>
                        <span className="text-[10px] text-slate-400 uppercase">votes</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'top' ? (
            /* Top Ideas Discussion Leaderboard */
            <div className="space-y-3 max-w-4xl mx-auto">
              <div className="text-center mb-6 pb-4 border-b border-slate-800">
                <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <span>Discussion Leaderboard — Top Rated Innovations</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono uppercase">
                  Ideas ranked live by anonymous student votes for classroom discussion
                </p>
              </div>

              {topRankedIdeas.slice(0, 10).map((idea, index) => {
                const theme = getCategoryTheme(idea.category);
                const associatedBiz = session.businesses.find((b) => b.id === idea.businessId);

                return (
                  <div
                    key={idea.id}
                    className={`p-5 rounded-2xl border flex items-center gap-4 sm:gap-6 transition-all ${
                      index === 0
                        ? 'bg-slate-900 border-amber-400/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30'
                        : index === 1
                        ? 'bg-slate-900 border-slate-400/60 shadow-lg'
                        : index === 2
                        ? 'bg-slate-900 border-indigo-400/60 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className="shrink-0 text-center">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-black font-mono text-xl ${
                          index === 0
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/25'
                            : index === 1
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 border-slate-300'
                            : index === 2
                            ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white border-indigo-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        #{index + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${theme.badgeBg}`}
                        >
                          {idea.category}
                        </span>
                        {associatedBiz && (
                          <span className="text-xs text-slate-400 truncate">
                            For: <strong className="text-slate-200">{associatedBiz.name}</strong>
                          </span>
                        )}
                      </div>
                      <p className="text-base sm:text-lg font-semibold text-white leading-snug">
                        {idea.text}
                      </p>
                    </div>

                    {/* Votes Pill */}
                    <div className="shrink-0 text-center bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2.5 shadow-xs">
                      <div className="flex items-center justify-center gap-1.5 text-rose-400 font-mono text-2xl font-black">
                        <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                        <span>{idea.votesCount}</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                        Votes
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 6 Category Matrix Columns */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4">
              {CATEGORIES.map((cat) => {
                const catIdeas = relevantIdeas.filter((i) => i.category === cat.name);
                catIdeas.sort((a, b) => b.votesCount - a.votesCount);

                return (
                  <div
                    key={cat.name}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col h-full shadow-md relative overflow-hidden"
                  >
                    <div className="pb-3 border-b border-slate-800 mb-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 truncate">
                          {cat.name}
                        </h4>
                        <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 rounded-full px-2.5 py-0.5 text-slate-300">
                          {catIdeas.length}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[600px] flex-1 pr-1">
                      {catIdeas.length === 0 ? (
                        <div className="text-[11px] text-slate-500 text-center py-6 font-mono">
                          No ideas yet
                        </div>
                      ) : (
                        catIdeas.map((idea) => (
                          <div
                            key={idea.id}
                            className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 shadow-xs"
                          >
                            <p className="leading-relaxed mb-2 font-medium">{idea.text}</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80 font-mono">
                              <span>VOTES</span>
                              <span className="font-bold text-rose-400 flex items-center gap-1">
                                <Heart className="w-3 h-3 fill-rose-500" />
                                {idea.votesCount}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar: Collapsible QR Code Panel */}
        {showQrPanel && (
          <aside className="w-72 shrink-0 hidden lg:flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

              <div className="text-[10px] uppercase tracking-wider text-blue-400 font-bold mb-1 mt-1">
                SCAN PHONE CAMERA
              </div>
              <p className="text-[11px] text-slate-400 mb-3">
                Opens live wall instantly. No app installation needed.
              </p>

              {/* QR Image */}
              <div className="bg-white p-2 rounded-2xl inline-block mb-3 shadow-md">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="Join Session QR Code"
                    className="w-48 h-48 object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                    Loading QR...
                  </div>
                )}
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                <div className="text-[9px] text-slate-400 uppercase font-bold">
                  OR ENTER CODE:
                </div>
                <div className="text-2xl font-black font-mono tracking-widest bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent mt-0.5">
                  {session.code}
                </div>
              </div>
            </div>

            {/* Room Summary Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Classroom Activity</span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 uppercase">Total Ideas:</span>
                  <span className="font-bold text-white font-mono text-sm">{session.ideas.length}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 uppercase">Total Votes Cast:</span>
                  <span className="font-bold text-rose-400 font-mono text-sm">
                    {session.totalVotes || session.ideas.reduce((s, i) => s + i.votesCount, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 uppercase">Active Ventures:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {session.businesses.length}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
