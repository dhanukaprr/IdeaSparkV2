import { Business, Idea, MAX_VOTES_PER_BUSINESS } from '../types';
import { ArrowRight, Lightbulb, CheckCircle, Lock, User, PlusCircle, Sparkles } from 'lucide-react';

interface BusinessPickerProps {
  businesses: Business[];
  ideas: Idea[];
  myVotes: Record<string, string[]>;
  onSelectBusiness: (businessId: string) => void;
  onOpenSubmitModal: (businessId?: string) => void;
}

// Deterministic vibrant color palettes for pitch cards
const CARD_COLOR_THEMES = [
  {
    border: 'border-blue-200 hover:border-blue-400',
    topBar: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    tag: 'bg-blue-500/10 text-blue-700',
    glow: 'hover:shadow-blue-500/15',
    titleHover: 'group-hover:text-blue-600',
    buttonColor: 'text-blue-600 group-hover:text-blue-700',
  },
  {
    border: 'border-purple-200 hover:border-purple-400',
    topBar: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    tag: 'bg-purple-500/10 text-purple-700',
    glow: 'hover:shadow-purple-500/15',
    titleHover: 'group-hover:text-purple-600',
    buttonColor: 'text-purple-600 group-hover:text-purple-700',
  },
  {
    border: 'border-emerald-200 hover:border-emerald-400',
    topBar: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    tag: 'bg-emerald-500/10 text-emerald-700',
    glow: 'hover:shadow-emerald-500/15',
    titleHover: 'group-hover:text-emerald-600',
    buttonColor: 'text-emerald-600 group-hover:text-emerald-700',
  },
  {
    border: 'border-amber-200 hover:border-amber-400',
    topBar: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    tag: 'bg-amber-500/10 text-amber-700',
    glow: 'hover:shadow-amber-500/15',
    titleHover: 'group-hover:text-amber-600',
    buttonColor: 'text-amber-600 group-hover:text-amber-700',
  },
  {
    border: 'border-rose-200 hover:border-rose-400',
    topBar: 'bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    tag: 'bg-rose-500/10 text-rose-700',
    glow: 'hover:shadow-rose-500/15',
    titleHover: 'group-hover:text-rose-600',
    buttonColor: 'text-rose-600 group-hover:text-rose-700',
  },
];

export function BusinessPicker({
  businesses,
  ideas,
  myVotes,
  onSelectBusiness,
  onOpenSubmitModal,
}: BusinessPickerProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CLASSROOM DIRECTORY // PITCH SELECTION</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Select a Venture Pitch
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Choose a presenter's product or service to post ideas and cast your 3 votes.
          </p>
        </div>
        <button
          id="picker-quick-submit-btn"
          onClick={() => onOpenSubmitModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/25 active:scale-95 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Post an Idea</span>
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-10 text-center shadow-sm">
          <div className="inline-flex p-4 rounded-2xl bg-blue-50 text-blue-600 mb-3">
            <Lightbulb className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">No businesses added yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Waiting for the lecturer to add the first entrepreneurial business or product concept.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businesses.map((business, index) => {
            const bizIdeas = ideas.filter((i) => i.businessId === business.id);
            const votesUsed = (myVotes[business.id] || []).length;
            const votesRemaining = Math.max(0, MAX_VOTES_PER_BUSINESS - votesUsed);
            const theme = CARD_COLOR_THEMES[index % CARD_COLOR_THEMES.length];

            return (
              <div
                key={business.id}
                id={`business-card-${business.id}`}
                onClick={() => onSelectBusiness(business.id)}
                className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all duration-200 flex flex-col justify-between relative group shadow-sm hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
                  theme.border
                } ${theme.glow} ${
                  business.isVotingClosed ? 'opacity-85 bg-slate-50/70' : ''
                }`}
              >
                {/* Colorful top bar accent strip */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${theme.topBar}`}></div>

                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3 mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.badge}`}>
                      {business.type || 'Product/Service'}
                    </span>

                    {business.isVotingClosed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        <Lock className="w-3 h-3" />
                        Closed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live Ideation
                      </span>
                    )}
                  </div>

                  <h3 className={`text-lg sm:text-xl font-black text-slate-900 ${theme.titleHover} transition-colors`}>
                    {business.name}
                  </h3>

                  {business.presenter && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>PRESENTER: <strong className="text-slate-800 font-bold">{business.presenter}</strong></span>
                    </div>
                  )}

                  {business.description && (
                    <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                      {business.description}
                    </p>
                  )}
                </div>

                {/* Footer Metrics & Action */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-slate-700 font-mono text-[11px] font-bold bg-slate-100 rounded-lg px-2.5 py-1 border border-slate-200">
                      <span>{bizIdeas.length} {bizIdeas.length === 1 ? 'IDEA' : 'IDEAS'}</span>
                    </span>

                    <span className={`flex items-center gap-1 font-mono text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                      votesRemaining === 0
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      <span>{votesRemaining}/{MAX_VOTES_PER_BUSINESS} VOTES LEFT</span>
                    </span>
                  </div>

                  <div className={`flex items-center gap-1 font-bold text-[11px] uppercase tracking-wider ${theme.buttonColor} transition-colors`}>
                    <span>Open Wall</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
