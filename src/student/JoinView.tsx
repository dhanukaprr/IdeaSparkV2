import { useState, type FormEvent } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Users, Lightbulb } from 'lucide-react';

interface JoinViewProps {
  onJoin: (code: string) => void;
  initialCode?: string;
  isLoading?: boolean;
  error?: string | null;
}

export function JoinView({ onJoin, initialCode = '', isLoading = false, error = null }: JoinViewProps) {
  const [code, setCode] = useState(initialCode.toUpperCase());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (cleanCode) {
      onJoin(cleanCode);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-xl shadow-indigo-500/10 text-center relative overflow-hidden">
      {/* Decorative colorful glow corners */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-gradient-to-tr from-pink-400/20 to-amber-400/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 mb-4">
        <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
          Creativity & Innovation EBM
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-2">
        <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
          IDEASPARK
        </span>
      </h1>
      <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto mb-6">
        Real-time interactive classroom ideation and live anonymous pitch voting.
      </p>

      {error && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-left shadow-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
        <div className="text-left">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
            Enter 4-Letter Session Code
          </label>
          <input
            id="join-session-input"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. SPARK"
            maxLength={6}
            autoFocus
            className="w-full text-center tracking-widest text-2xl sm:text-3xl font-black font-mono py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 transition-all uppercase shadow-inner"
          />
        </div>

        <button
          id="join-session-submit-btn"
          type="submit"
          disabled={!code.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
        >
          {isLoading ? (
            <span>Connecting to Wall...</span>
          ) : (
            <>
              <span>Join Live Wall</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-3 gap-2.5 text-center text-xs">
        <div className="border border-emerald-100 rounded-xl p-2.5 bg-emerald-50/60 flex flex-col items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900">Anonymous</span>
          <span className="text-[9px] text-emerald-700/80">No sign-up</span>
        </div>
        <div className="border border-blue-100 rounded-xl p-2.5 bg-blue-50/60 flex flex-col items-center gap-1">
          <Zap className="w-4 h-4 text-blue-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">Real-time</span>
          <span className="text-[9px] text-blue-700/80">Instant sync</span>
        </div>
        <div className="border border-amber-100 rounded-xl p-2.5 bg-amber-50/60 flex flex-col items-center gap-1">
          <Users className="w-4 h-4 text-amber-600" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900">3 Votes</span>
          <span className="text-[9px] text-amber-700/80">Per venture</span>
        </div>
      </div>
    </div>
  );
}
