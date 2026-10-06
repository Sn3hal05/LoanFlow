import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  Send, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle, 
  AlertCircle 
} from 'lucide-react';

const RecommendationModal = ({ isOpen, onClose, application, onSuccess }) => {
  const [recommendation, setRecommendation] = useState('RECOMMEND_APPROVAL');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !application) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Please provide verification findings and notes for the underwriter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let targetStatus = 'Under-Review';
      if (recommendation === 'REQUEST_MORE_INFO') {
        targetStatus = 'More-Info-Requested';
      }

      await api.patch(`/applications/${application._id}/status`, {
        targetStatus,
        recommendation,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error submitting recommendation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Forward Application to Underwriting
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Application #{application.applicationNumber} — Record Officer Recommendation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Recommendation Options */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
              Officer Recommendation
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setRecommendation('RECOMMEND_APPROVAL')}
                className={`p-3 rounded-xl border text-center transition ${
                  recommendation === 'RECOMMEND_APPROVAL'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-emerald-600" />
                <span className="text-xs block">Recommend Approval</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation('RECOMMEND_REJECTION')}
                className={`p-3 rounded-xl border text-center transition ${
                  recommendation === 'RECOMMEND_REJECTION'
                    ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <ThumbsDown className="h-4 w-4 mx-auto mb-1 text-rose-600" />
                <span className="text-xs block">Recommend Reject</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendation('REQUEST_MORE_INFO')}
                className={`p-3 rounded-xl border text-center transition ${
                  recommendation === 'REQUEST_MORE_INFO'
                    ? 'border-orange-600 bg-orange-50 text-orange-800 ring-2 ring-orange-500/20 font-semibold'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                }`}
              >
                <HelpCircle className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                <span className="text-xs block">Request More Info</span>
              </button>
            </div>
          </div>

          {/* Notes textarea */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Verification Audit Notes
            </label>
            <textarea
              rows={4}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. All documents verified against state ID and tax databases. Applicant has continuous employment and clean banking history..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{loading ? 'Submitting...' : 'Submit to Underwriting'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecommendationModal;
