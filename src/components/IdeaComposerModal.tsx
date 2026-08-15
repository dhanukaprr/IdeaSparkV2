import { useState, type FormEvent } from 'react';
import { Business, CATEGORIES, IdeaCategory, MAX_IDEA_LENGTH } from '../types';
import { X, Sparkles, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { submitIdea, getParticipantId } from '../api';
import confetti from 'canvas-confetti';

interface IdeaComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode: string;
  businesses: Business[];
  selectedBusinessId?: string;
  onIdeaSubmitted?: () => void;
}

export function IdeaComposerModal({
  isOpen,
  onClose,
  sessionCode,
  businesses,
  selectedBusinessId,
  onIdeaSubmitted,
}: IdeaComposerModalProps) {
  const [businessId, setBusinessId] = useState<string>(
    selectedBusinessId || (businesses.length > 0 ? businesses[0].id : '')
  );
  const [category, setCategory] = useState<IdeaCategory>('Product/Service');
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync if selectedBusinessId changes
  if (selectedBusinessId && businessId !== selectedBusinessId && (!isOpen || businessId === '')) {
    setBusinessId(selectedBusinessId);
  }

  if (!isOpen) return null;

  const currentBusiness = businesses.find((b) => b.id === businessId);
  const isClosed = currentBusiness?.isVotingClosed;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = text.trim();
    if (!trimmed) {
      setError('Please enter your idea.');
      return;
    }
    if (trimmed.length < 3) {
      setError('Idea must be at least 3 characters long.');
      return;
    }
    if (!businessId) {
      setError('Please select a business.');
      return;
    }

    try {
      setIsSubmitting(true);
      const participantId = getParticipantId();
      await submitIdea(sessionCode, {
        businessId,
        text: trimmed,
        category,
        participantId,
      });

      // Celebration effect
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899'],
        });
      } catch {
        // ignore
      }

      setSuccessMessage('Idea submitted to the live wall!');
      setText('');
      onIdeaSubmitted?.();

      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit idea. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div
        id="idea-composer-modal"
        className="bg-white border border-slate-200/80 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl shadow-indigo-500/20 relative my-8 overflow-hidden"
      >
        {/* Top vibrant gradient banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <button
          id="idea-composer-close"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-1 mt-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/25">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              CLASSROOM SUGGESTION ENGINE
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Post Anonymous Idea</h3>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-3">
          Your creative suggestions will be synced immediately to the classroom wall.
        </p>

        {error && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Target Business Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
              Select Business / Product *
            </label>
            <select
              id="idea-business-select"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type}) {b.isVotingClosed ? '— [Submissions Closed]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector (6 Innovation Categories) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5">
              Innovation Category *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    id={`category-btn-${cat.name.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setCategory(cat.name)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                      isSelected
                        ? `${cat.activeChip} shadow-md`
                        : `${cat.pillBg} hover:opacity-90`
                    }`}
                  >
                    <div className="truncate text-[11px]">{cat.name}</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-600 mt-1.5">
              {CATEGORIES.find((c) => c.name === category)?.description}
            </p>
          </div>

          {/* Idea Textarea */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                Your Improvement Idea *
              </label>
              <span className={`text-xs font-mono font-bold ${text.length > MAX_IDEA_LENGTH ? 'text-rose-600' : 'text-slate-400'}`}>
                {text.length}/{MAX_IDEA_LENGTH}
              </span>
            </div>
            <textarea
              id="idea-text-input"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_IDEA_LENGTH}
              placeholder="What concrete enhancement, customer touchpoint, marketing angle, or business model tweak would unlock growth?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner"
              disabled={isClosed}
            />
          </div>

          {isClosed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold">
              Submissions are currently closed for this business by the lecturer.
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              id="idea-composer-cancel"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="idea-composer-submit"
              disabled={isSubmitting || !text.trim() || isClosed}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/25 transition-all"
            >
              {isSubmitting ? (
                <span>Posting...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Idea</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
