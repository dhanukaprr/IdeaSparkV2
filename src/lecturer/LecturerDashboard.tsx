import { useState, type FormEvent } from 'react';
import {
  Business,
  CATEGORIES,
  Idea,
  SessionPublicState,
} from '../types';
import {
  addBusiness,
  updateBusiness,
  deleteBusiness,
  resetBusiness,
  setActiveBusiness,
} from '../api';
import {
  Plus,
  Tv,
  Lock,
  Unlock,
  RotateCcw,
  Trash2,
  Edit2,
  Download,
  CheckCircle,
  Lightbulb,
  Heart,
  Radio,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react';

interface LecturerDashboardProps {
  session: SessionPublicState;
  lecturerKey: string;
  onOpenProjector: () => void;
  onRefresh: () => void;
}

export function LecturerDashboard({
  session,
  lecturerKey,
  onOpenProjector,
  onRefresh,
}: LecturerDashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBiz, setEditingBiz] = useState<Business | null>(null);
  const [resettingBiz, setResettingBiz] = useState<Business | null>(null);
  const [deletingBiz, setDeletingBiz] = useState<Business | null>(null);

  // Add/Edit Form State
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState('Product/Service');
  const [bizPresenter, setBizPresenter] = useState('');
  const [bizDescription, setBizDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const handleOpenAddModal = () => {
    setBizName('');
    setBizType('Product/Service');
    setBizPresenter('');
    setBizDescription('');
    setFormError(null);
    setActionError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (biz: Business) => {
    setEditingBiz(biz);
    setBizName(biz.name);
    setBizType(biz.type || 'Product/Service');
    setBizPresenter(biz.presenter || '');
    setBizDescription(biz.description || '');
    setFormError(null);
    setActionError(null);
  };

  const handleSaveBusiness = async (e: FormEvent) => {
    e.preventDefault();
    if (!bizName.trim()) {
      setFormError('Business name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingBiz) {
        await updateBusiness(
          session.code,
          editingBiz.id,
          {
            name: bizName.trim(),
            type: bizType.trim(),
            presenter: bizPresenter.trim(),
            description: bizDescription.trim(),
          },
          lecturerKey
        );
        setEditingBiz(null);
      } else {
        await addBusiness(
          session.code,
          {
            name: bizName.trim(),
            type: bizType.trim(),
            presenter: bizPresenter.trim(),
            description: bizDescription.trim(),
          },
          lecturerKey
        );
        setShowAddModal(false);
      }
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVoting = async (biz: Business) => {
    try {
      await updateBusiness(
        session.code,
        biz.id,
        { isVotingClosed: !biz.isVotingClosed },
        lecturerKey
      );
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetFocus = async (bizId: string) => {
    try {
      await setActiveBusiness(session.code, bizId, lecturerKey);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmReset = async () => {
    if (!resettingBiz) return;
    try {
      setIsActionLoading(true);
      setActionError(null);
      await resetBusiness(session.code, resettingBiz.id, lecturerKey);
      setResettingBiz(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to reset ideas for this business.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingBiz) return;
    try {
      setIsActionLoading(true);
      setActionError(null);
      await deleteBusiness(session.code, deletingBiz.id, lecturerKey);
      setDeletingBiz(null);
      onRefresh();
    } catch (err: any) {
      console.error(err);
      setActionError(err.message || 'Failed to delete business.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const exportReport = () => {
    let md = `# IdeaSpark Session Report\n`;
    md += `**Topic:** ${session.title}\n`;
    md += `**Cohort:** ${session.cohort || 'EBM Creativity & Innovation'}\n`;
    md += `**Session Code:** ${session.code}\n`;
    md += `**Date:** ${new Date(session.createdAt).toLocaleDateString()}\n\n`;
    md += `---\n\n`;

    for (const biz of session.businesses) {
      const bizIdeas = session.ideas.filter((i) => i.businessId === biz.id);
      bizIdeas.sort((a, b) => b.votesCount - a.votesCount);

      md += `## Business: ${biz.name} (${biz.type})\n`;
      if (biz.presenter) md += `*Presenter:* ${biz.presenter}\n`;
      if (biz.description) md += `*Description:* ${biz.description}\n`;
      md += `*Total Ideas:* ${bizIdeas.length} | *Total Votes:* ${bizIdeas.reduce((s, i) => s + i.votesCount, 0)}\n\n`;

      if (bizIdeas.length === 0) {
        md += `*No ideas recorded.*\n\n`;
      } else {
        md += `| Rank | Category | Votes | Improvement Idea |\n`;
        md += `|---|---|---|---|\n`;
        bizIdeas.forEach((idea, idx) => {
          md += `| #${idx + 1} | ${idea.category} | ${idea.votesCount} | ${idea.text.replace(/\|/g, '\\|')} |\n`;
        });
        md += `\n`;
      }
      md += `---\n\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IdeaSpark-${session.code}-Report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans">
      {/* Lecturer Top Architectural Header with Gradient Accent */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl shadow-slate-900/20 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs">
              LECTURER CONTROL PANEL
            </span>
            <span className="text-xs font-mono text-slate-300">
              SESSION CODE: <strong className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{session.code}</strong>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{session.title}</h1>
          <p className="text-xs text-slate-400 mt-1">{session.cohort}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            id="lecturer-launch-projector"
            onClick={onOpenProjector}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Tv className="w-4 h-4" />
            <span>Open Projector Wall</span>
          </button>

          <button
            id="lecturer-export-report"
            onClick={exportReport}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-700 transition-all shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Export (.md)</span>
          </button>
        </div>
      </div>

      {/* Businesses Management Section Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-0.5">
            CLASSROOM VENTURES
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Presented Businesses & Products ({session.businesses.length})
          </h2>
          <p className="text-xs text-slate-600 font-sans">
            Control voting states, set room focus, or reset activity for each pitch.
          </p>
        </div>

        <button
          id="lecturer-add-biz-btn"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Venture</span>
        </button>
      </div>

      {/* Business Cards List */}
      <div className="space-y-4">
        {session.businesses.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center shadow-xs">
            <Lightbulb className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">No businesses added yet</h3>
            <p className="text-xs text-slate-500 mb-4 font-mono">
              Add products or ventures presenting in this classroom session.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
            >
              Add First Business
            </button>
          </div>
        ) : (
          session.businesses.map((biz) => {
            const bizIdeas = session.ideas.filter((i) => i.businessId === biz.id);
            const totalVotes = bizIdeas.reduce((sum, i) => sum + i.votesCount, 0);
            const isFocused = session.activeBusinessId === biz.id;

            return (
              <div
                key={biz.id}
                id={`lecturer-biz-item-${biz.id}`}
                className={`bg-white p-5 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md relative overflow-hidden ${
                  isFocused
                    ? 'border-blue-400 ring-2 ring-blue-500/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Accent strip on focus */}
                {isFocused && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {biz.type}
                      </span>
                      {isFocused && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-600 text-white shadow-xs">
                          <Radio className="w-3 h-3 animate-pulse text-white" />
                          Projector Focused
                        </span>
                      )}
                      {biz.isVotingClosed ? (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-500" />
                          Voting Closed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Accepting Ideas & Votes
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{biz.name}</h3>

                    {biz.presenter && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Presenter: <strong className="text-slate-800 font-bold">{biz.presenter}</strong>
                      </p>
                    )}

                    {biz.description && (
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl font-sans leading-relaxed">
                        {biz.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <span className="flex items-center gap-1.5 font-bold text-slate-700 bg-slate-100 rounded-lg px-2.5 py-1 border border-slate-200">
                        <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                        {bizIdeas.length} {bizIdeas.length === 1 ? 'idea' : 'ideas'}
                      </span>
                      <span className="flex items-center gap-1.5 font-bold text-rose-700 bg-rose-50 rounded-lg px-2.5 py-1 border border-rose-200">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    <button
                      id={`focus-btn-${biz.id}`}
                      onClick={() => handleSetFocus(biz.id)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 border ${
                        isFocused
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isFocused ? 'Focused' : 'Set Focus'}</span>
                    </button>

                    <button
                      id={`toggle-voting-${biz.id}`}
                      onClick={() => handleToggleVoting(biz)}
                      className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-1 border ${
                        biz.isVotingClosed
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {biz.isVotingClosed ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-amber-600" />}
                      <span>{biz.isVotingClosed ? 'Reopen Voting' : 'Close Voting'}</span>
                    </button>

                    <button
                      id={`edit-biz-${biz.id}`}
                      onClick={() => handleOpenEditModal(biz)}
                      className="p-2 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                      title="Edit business"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      id={`reset-biz-${biz.id}`}
                      onClick={() => setResettingBiz(biz)}
                      className="p-2 text-amber-700 hover:bg-amber-50 border border-amber-200 rounded-xl transition-colors"
                      title="Reset ideas and votes"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      id={`delete-biz-${biz.id}`}
                      onClick={() => setDeletingBiz(biz)}
                      className="p-2 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors"
                      title="Delete business"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Business Modal */}
      {(showAddModal || editingBiz) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200/80 rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

            <button
              onClick={() => {
                setShowAddModal(false);
                setEditingBiz(null);
              }}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1 mt-1">
              VENTURE REGISTRY
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-1 tracking-tight">
              {editingBiz ? 'Edit Business Details' : 'Add New Business / Product'}
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Enter details for the student entrepreneur presentation.
            </p>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Business / Product Name *
                </label>
                <input
                  type="text"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  placeholder="e.g. PurePulse Organic Tea"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Industry / Type
                  </label>
                  <input
                    type="text"
                    value={bizType}
                    onChange={(e) => setBizType(e.target.value)}
                    placeholder="e.g. Agri-Tech"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                    Presenter Name
                  </label>
                  <input
                    type="text"
                    value={bizPresenter}
                    onChange={(e) => setBizPresenter(e.target.value)}
                    placeholder="e.g. Dinuka"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-1">
                  Description / Value Proposition
                </label>
                <textarea
                  rows={3}
                  value={bizDescription}
                  onChange={(e) => setBizDescription(e.target.value)}
                  placeholder="Brief summary of what this business does or sells..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none shadow-inner"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingBiz(null);
                  }}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-500/25 transition-all"
                >
                  {isSubmitting ? 'Saving...' : editingBiz ? 'Update Venture' : 'Add Venture'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {resettingBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            <div className="inline-flex p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-1">
              Reset Ideas for {resettingBiz.name}?
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              This will permanently clear all {session.ideas.filter((i) => i.businessId === resettingBiz.id).length} submitted ideas and votes for this business only.
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-left">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => {
                  setResettingBiz(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleConfirmReset}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
              >
                {isActionLoading ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl text-center">
            <div className="inline-flex p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-600 mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 mb-1">
              Delete {deletingBiz.name}?
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              This business and all its ideas will be permanently deleted from the session.
            </p>

            {actionError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-left">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => {
                  setDeletingBiz(null);
                  setActionError(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-delete-business-btn"
                disabled={isActionLoading}
                onClick={handleConfirmDelete}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md"
              >
                {isActionLoading ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
