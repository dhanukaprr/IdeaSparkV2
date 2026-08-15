import { useState, useMemo } from 'react';
import { Business, CATEGORIES, Idea, IdeaCategory, MAX_VOTES_PER_BUSINESS } from '../types';
import {
  Heart,
  PlusCircle,
  ChevronLeft,
  Filter,
  ArrowUpDown,
  Lock,
  Lightbulb,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { toggleVote, getParticipantId } from '../api';

interface StudentWallProps {
  sessionCode: string;
  business: Business;
  businesses: Business[];
  ideas: Idea[];
  myVotes: string[]; // idea IDs this participant voted for on this business
  onSelectBusiness: (businessId: string) => void;
  onBackToBusinesses: () => void;
  onOpenSubmitModal: (businessId: string) => void;
  onVoteUpdated?: () => void;
}

export function StudentWall({
  sessionCode,
  business,
  businesses,
  ideas,
  myVotes,
  onSelectBusiness,
  onBackToBusinesses,
  onOpenSubmitModal,
  onVoteUpdated,
}: StudentWallProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'votes' | 'newest'>('votes');
  const [votingIdeaId, setVotingIdeaId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const bizIdeas = useMemo(() => {
    return ideas.filter((i) => i.businessId === business.id);
  }, [ideas, business.id]);

  const filteredIdeas = useMemo(() => {
    let result = [...bizIdeas];
    if (selectedCategory !== 'All') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (sortBy === 'votes') {
      result.sort((a, b) => b.votesCount - a.votesCount || b.createdAt - a.createdAt);
    } else {
      result.sort((a, b) => b.createdAt - a.createdAt);
    }
    return result;
  }, [bizIdeas, selectedCategory, sortBy]);

  const votesUsed = myVotes.length;
  const votesRemaining = Math.max(0, MAX_VOTES_PER_BUSINESS - votesUsed);

  const handleVoteClick = async (idea: Idea) => {
    if (business.isVotingClosed) {
      setFeedbackNotice('Voting is closed for this business.');
      setTimeout(() => setFeedbackNotice(null), 3000);
      return;
    }

    const hasVoted = myVotes.includes(idea.id);

    if (!hasVoted && votesRemaining <= 0) {
      setFeedbackNotice(
        `You have used all ${MAX_VOTES_PER_BUSINESS} votes for ${business.name}. Tap any previously voted idea to unvote and free up a vote.`
      );
      setTimeout(() => setFeedbackNotice(null), 4000);
      return;
    }

    try {
      setVotingIdeaId(idea.id);
      const participantId = getParticipantId();
      await toggleVote(sessionCode, {
        businessId: business.id,
        ideaId: idea.id,
        participantId,
      });
      onVoteUpdated?.();
    } catch (err: any) {
      setFeedbackNotice(err.message || 'Failed to update vote.');
      setTimeout(() => setFeedbackNotice(null), 3000);
    } finally {
      setVotingIdeaId(null);
    }
  };

  const getCategoryTheme = (catName: IdeaCategory) => {
    const cat = CATEGORIES.find((c) => c.name === catName);
    return (
      cat || {
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

  const formatTime = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5 sm:py-6 pb-24">
      {/* Top Breadcrumb & Switcher */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          id="student-back-btn"
          onClick={onBackToBusinesses}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-xs transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-blue-600" />
          <span>All Ventures</span>
        </button>

        {businesses.length > 1 && (
          <select
            id="student-biz-switch-select"
            value={business.id}
            onChange={(e) => onSelectBusiness(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 px-3.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.type})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Business Hero Card with Vibrant Gradient Top Strip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 mt-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              {business.type}
            </span>
            {business.presenter && (
              <span className="text-xs text-slate-600">
                PRESENTER: <strong className="text-slate-800 font-bold">{business.presenter}</strong>
              </span>
            )}
          </div>

          {business.isVotingClosed ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
              <Lock className="w-3 h-3 text-slate-500" />
              Voting Closed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Ideation Active
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-2">
          {business.name}
        </h1>

        {business.description && (
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl mb-4">
            {business.description}
          </p>
        )}

        {/* Voting Budget Tracker (Colorful slots) */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-purple-50/70 p-3.5 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
              Vote Budget:
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((slotNum) => {
                const isVoted = slotNum <= votesUsed;
                return (
                  <div
                    key={slotNum}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      isVoted
                        ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm shadow-rose-500/30 ring-2 ring-rose-300'
                        : 'bg-white text-slate-400 border border-slate-200 shadow-inner'
                    }`}
                  >
                    {isVoted ? <Heart className="w-3.5 h-3.5 fill-white" /> : slotNum}
                  </div>
                );
              })}
            </div>
            <span className="text-xs font-bold text-slate-800">
              {votesRemaining === 0
                ? 'All 3 Votes Cast!'
                : `${votesRemaining} OF ${MAX_VOTES_PER_BUSINESS} VOTES AVAILABLE`}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Click card vote button. Click again to withdraw vote.</span>
          </div>
        </div>
      </div>

      {/* Notice Toast */}
      {feedbackNotice && (
        <div className="mb-4 p-3.5 bg-slate-900 text-white text-xs rounded-xl shadow-lg border border-slate-700 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-blue-400 hover:underline text-xs uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter and Action Bar */}
      <div className="space-y-3 mb-6">
        {/* Top Controls Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-3.5 h-3.5 text-blue-600" />
            <span>CATEGORIES ({bizIdeas.length} IDEAS)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="student-sort-toggle"
              onClick={() => setSortBy(sortBy === 'votes' ? 'newest' : 'votes')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 shadow-xs"
            >
              <ArrowUpDown className="w-3 h-3 text-indigo-600" />
              <span>{sortBy === 'votes' ? 'Top Voted' : 'Newest First'}</span>
            </button>

            <button
              id="student-submit-idea-header-btn"
              onClick={() => onOpenSubmitModal(business.id)}
              disabled={business.isVotingClosed}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm shadow-indigo-500/25 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Idea</span>
            </button>
          </div>
        </div>

        {/* 6 Category Filter Chips with Vibrant Category Theming */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            id="filter-cat-all"
            onClick={() => setSelectedCategory('All')}
            className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-xl transition-all ${
              selectedCategory === 'All'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All ({bizIdeas.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = bizIdeas.filter((i) => i.category === cat.name).length;
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                id={`filter-cat-${cat.name.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap rounded-xl transition-all flex items-center gap-2 border ${
                  isSelected
                    ? `${cat.activeChip}`
                    : `${cat.pillBg}`
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-white/30 text-white' : 'bg-white text-slate-800 border border-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ideas List Grid */}
      {filteredIdeas.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center shadow-xs">
          <div className="inline-flex p-4 bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 rounded-2xl mb-3">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            {selectedCategory === 'All'
              ? 'No ideas submitted yet for this business'
              : `No ideas in ${selectedCategory} yet`}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-5">
            Be the first to propose a creative improvement, customer touchpoint, or business model tweak!
          </p>
          <button
            id="student-empty-submit-btn"
            onClick={() => onOpenSubmitModal(business.id)}
            disabled={business.isVotingClosed}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post the First Idea</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIdeas.map((idea) => {
            const hasVoted = myVotes.includes(idea.id);
            const theme = getCategoryTheme(idea.category);
            const isProcessing = votingIdeaId === idea.id;

            return (
              <div
                key={idea.id}
                id={`idea-card-${idea.id}`}
                className={`bg-white border rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative group transition-all duration-200 shadow-xs hover:shadow-md ${
                  hasVoted
                    ? 'border-rose-300 bg-gradient-to-b from-rose-50/30 to-white ring-2 ring-rose-400/20'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Category Pill & Time */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.badgeBg}`}
                    >
                      {idea.category}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(idea.createdAt)}</span>
                    </span>
                  </div>

                  {/* Idea Content */}
                  <p className="text-sm sm:text-base font-medium text-slate-800 leading-relaxed mb-4">
                    {idea.text}
                  </p>
                </div>

                {/* Footer: Vote Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] font-medium text-slate-500">
                    {hasVoted ? (
                      <span className="text-rose-600 font-bold flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        Voted by you
                      </span>
                    ) : (
                      <span className="text-slate-400">Anonymous author</span>
                    )}
                  </div>

                  <button
                    id={`vote-btn-${idea.id}`}
                    onClick={() => handleVoteClick(idea)}
                    disabled={isProcessing || business.isVotingClosed}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 ${
                      hasVoted
                        ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30 hover:bg-rose-600 active:scale-95'
                        : 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 border border-slate-200 active:scale-95'
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 transition-transform ${
                        hasVoted ? 'fill-white stroke-white scale-110' : 'text-slate-500 group-hover:text-rose-500'
                      }`}
                    />
                    <span className="font-mono font-black">{idea.votesCount}</span>
                    <span className="text-[10px]">
                      {hasVoted ? 'Voted' : 'Vote'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-5 right-5 sm:hidden z-40">
        <button
          id="student-fab-submit-btn"
          onClick={() => onOpenSubmitModal(business.id)}
          disabled={business.isVotingClosed}
          className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 active:scale-95 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/40"
        >
          <Sparkles className="w-4 h-4" />
          <span>Post Idea</span>
        </button>
      </div>
    </div>
  );
}
