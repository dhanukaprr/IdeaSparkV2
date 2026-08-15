import { useState, type FormEvent } from 'react';
import { Sparkles, Plus, Trash2, X, ArrowRight, Layers } from 'lucide-react';
import { createSession } from '../api';
import { SessionPublicState } from '../types';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (code: string, lecturerKey: string, session: SessionPublicState) => void;
}

export function CreateSessionModal({ isOpen, onClose, onSessionCreated }: CreateSessionModalProps) {
  const [title, setTitle] = useState('Creativity & Innovation Live Pitch Session');
  const [cohort, setCohort] = useState('Higher Diploma in Entrepreneurial Business Management');
  const [businesses, setBusinesses] = useState<
    { name: string; type: string; presenter: string; description: string }[]
  >([
    {
      name: '',
      type: 'Product/Service',
      presenter: '',
      description: '',
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddBusinessRow = () => {
    setBusinesses([
      ...businesses,
      { name: '', type: 'Product/Service', presenter: '', description: '' },
    ]);
  };

  const handleRemoveBusinessRow = (index: number) => {
    setBusinesses(businesses.filter((_, i) => i !== index));
  };

  const handleBusinessChange = (index: number, field: string, value: string) => {
    const updated = [...businesses];
    (updated[index] as any)[field] = value;
    setBusinesses(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validBusinesses = businesses.filter((b) => b.name.trim().length > 0);

    try {
      setIsSubmitting(true);
      const result = await createSession({
        title: title.trim() || 'Creativity & Innovation Session',
        cohort: cohort.trim(),
        initialBusinesses: validBusinesses,
      });

      onSessionCreated(result.code, result.lecturerKey, result.session);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto font-sans">
      <div
        id="create-session-modal"
        className="bg-white border border-slate-200/80 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 relative my-8 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-2 mt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              NEW COHORT WORKSPACE
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create Classroom Session
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600">
          Set up student pitches or businesses for live anonymous crowdsourcing.
        </p>

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Session Topic / Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Batch 2026 Innovation Pitch"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Cohort / Course Name
              </label>
              <input
                type="text"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                placeholder="e.g. Higher Diploma EBM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Initial Businesses Setup */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Businesses / Products to Pitch
                </label>
                <p className="text-[11px] text-slate-500">
                  Add student entrepreneurs, products, or service concepts (you can add more later).
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBusinessRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Pitch</span>
              </button>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {businesses.map((b, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                      PITCH #{idx + 1}
                    </span>
                    {businesses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBusinessRow(idx)}
                        className="text-rose-600 hover:text-rose-800 p-1 rounded-md hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={b.name}
                      onChange={(e) => handleBusinessChange(idx, 'name', e.target.value)}
                      placeholder="Business Name (e.g. EcoSip Bottles)"
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <input
                      type="text"
                      value={b.presenter}
                      onChange={(e) => handleBusinessChange(idx, 'presenter', e.target.value)}
                      placeholder="Presenter Name (e.g. Samantha)"
                      className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <input
                    type="text"
                    value={b.description}
                    onChange={(e) => handleBusinessChange(idx, 'description', e.target.value)}
                    placeholder="Brief 1-line description of product or concept..."
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/25 active:scale-95 transition-all"
            >
              {isSubmitting ? (
                <span>Creating Session...</span>
              ) : (
                <>
                  <span>Launch Live Wall</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
