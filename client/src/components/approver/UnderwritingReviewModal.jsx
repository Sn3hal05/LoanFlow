import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  Percent, 
  HelpCircle,
  FileText
} from 'lucide-react';

const FIXED_REASONS = [
  { code: 'LOW_CREDIT_SCORE', label: 'Credit Score Below Minimum Policy Threshold' },
  { code: 'INSUFFICIENT_INCOME', label: 'Reported Income Insufficient for Debt Volume' },
  { code: 'HIGH_DEBT_TO_INCOME', label: 'Debt-To-Income (DTI) Ratio Exceeds Ceiling' },
  { code: 'INCOMPLETE_DOCUMENTS', label: 'Required Documentation Incomplete or Unverifiable' },
  { code: 'UNACCEPTABLE_COLLATERAL', label: 'Collateral or Asset Evaluation Deficient' },
  { code: 'POLICY_EXCEPTION', label: 'Does Not Satisfy Institutional Risk Policy' },
];

const UnderwritingReviewModal = ({ isOpen, onClose, application, documents, notes, onRefresh }) => {
  const [activeTab, setActiveTab] = useState('APPROVE'); // 'APPROVE' | 'REJECT' | 'MORE_INFO'

  // Approval terms state
  const [approvedAmount, setApprovedAmount] = useState(application?.requestedAmount || 25000);
  const [approvedTenureMonths, setApprovedTenureMonths] = useState(application?.requestedTenureMonths || 36);
  const [approvedInterestRate, setApprovedInterestRate] = useState(
    application?.loanProductId?.baseInterestRate || 10.5
  );
  const [approvalNote, setApprovalNote] = useState('Applicant meets credit underwriting standards.');

  // Rejection state
  const [rejectionReason, setRejectionReason] = useState('HIGH_DEBT_TO_INCOME');
  const [rejectionRemarks, setRejectionRemarks] = useState('');

  // More info state
  const [moreInfoNote, setMoreInfoNote] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !application) return null;

  // Calculate live EMI for approved terms
  const calculateLiveEmi = () => {
    const p = Number(approvedAmount) || 0;
    const n = Number(approvedTenureMonths) || 1;
    const r = (Number(approvedInterestRate) || 0) / 12 / 100;
    if (r <= 0) return Math.round(p / n);
    const factor = Math.pow(1 + r, n);
    return Math.round(((p * r * factor) / (factor - 1)) * 100) / 100;
  };

  const liveEmi = calculateLiveEmi();

  // Edge case check: Any unverified mandatory document?
  const unverifiedDocs = documents.filter((d) => d.isMandatory && d.status !== 'VERIFIED');
  const hasUnverifiedDocs = unverifiedDocs.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'APPROVE') {
        if (hasUnverifiedDocs) {
          setError(
            `Strict Policy Violation: Cannot approve application while mandatory documents are unverified (${unverifiedDocs.map((d) => d.title).join(', ')}).`
          );
          setLoading(false);
          return;
        }

        await api.post(`/underwriting/${application._id}/decision`, {
          decision: 'APPROVED',
          approvedAmount: Number(approvedAmount),
          approvedTenureMonths: Number(approvedTenureMonths),
          approvedInterestRate: Number(approvedInterestRate),
          decisionNote: approvalNote,
        });
      } else if (activeTab === 'REJECT') {
        if (!rejectionReason) {
          setError('Please select a fixed rejection reason.');
          setLoading(false);
          return;
        }

        await api.post(`/underwriting/${application._id}/decision`, {
          decision: 'REJECTED',
          rejectionReason,
          decisionNote: rejectionRemarks || 'Underwriter determined risk profile non-compliant.',
        });
      } else if (activeTab === 'MORE_INFO') {
        await api.post(`/underwriting/${application._id}/decision`, {
          decision: 'REQUEST_MORE_INFO',
          decisionNote: moreInfoNote || 'Underwriter requested additional verification.',
        });
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error executing underwriting decision');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span>Credit Underwriting Decision Terminal</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Application #{application.applicationNumber} — Final Sanction & Risk Assessment
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Decision Blocked</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Risk Scorecard & Profile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Applicant Credit Score</span>
              <span
                className={`text-base font-bold font-mono ${
                  application.creditScore < (application.loanProductId?.minCreditScore || 650)
                    ? 'text-rose-600'
                    : 'text-emerald-600'
                }`}
              >
                {application.creditScore}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Policy Min: {application.loanProductId?.minCreditScore}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Monthly Income</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                ${application.monthlyIncome?.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Debt: ${application.existingMonthlyDebt?.toLocaleString()}/mo
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Projected DTI Ratio</span>
              <span
                className={`text-base font-bold font-mono ${
                  application.calculatedDtiRatio > (application.loanProductId?.maxDtiRatio || 45)
                    ? 'text-rose-600'
                    : 'text-slate-900'
                }`}
              >
                {application.calculatedDtiRatio}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Max Allowed: {application.loanProductId?.maxDtiRatio}%
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
              <span className="text-[11px] text-slate-500 block">Documents Status</span>
              <span
                className={`text-sm font-bold ${
                  hasUnverifiedDocs ? 'text-amber-600' : 'text-emerald-600'
                }`}
              >
                {hasUnverifiedDocs
                  ? `${unverifiedDocs.length} Unverified`
                  : 'All Verified ✓'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {documents.length} required docs
              </span>
            </div>
          </div>

          {/* Officer Notes if available */}
          {notes && notes.length > 0 && (
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-950 mb-1">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                <span>Loan Officer Verification Report ({notes[0].authorName}):</span>
              </div>
              <p className="text-indigo-900 italic">{notes[0].remarks}</p>
              <span className="text-[10px] text-indigo-700 font-mono mt-1 block">
                Recommendation: {notes[0].recommendation}
              </span>
            </div>
          )}

          {/* Decision Tabs */}
          <div>
            <div className="flex border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('APPROVE')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
                  activeTab === 'APPROVE'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Approve & Configure Terms
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('REJECT')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
                  activeTab === 'REJECT'
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Reject with Fixed Reason
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('MORE_INFO')}
                className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition ${
                  activeTab === 'MORE_INFO'
                    ? 'border-orange-600 text-orange-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Request Additional Info
              </button>
            </div>
          </div>

          {/* Tab 1: Approve Terms */}
          {activeTab === 'APPROVE' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {hasUnverifiedDocs && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Warning: Server will block approval until all mandatory documents are marked
                    VERIFIED by a Loan Officer.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sanction Amount ($)
                  </label>
                  <input
                    type="number"
                    min={100}
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    required
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Requested: ${application.requestedAmount?.toLocaleString()}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={approvedTenureMonths}
                    onChange={(e) => setApprovedTenureMonths(e.target.value)}
                    required
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Requested: {application.requestedTenureMonths} mo
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sanction APR (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={approvedInterestRate}
                    onChange={(e) => setApprovedInterestRate(e.target.value)}
                    required
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono font-semibold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Base Rate: {application.loanProductId?.baseInterestRate}%
                  </span>
                </div>
              </div>

              {/* Calculated Monthly EMI Display */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-emerald-800 font-semibold block">Calculated Monthly EMI</span>
                  <span className="text-[11px] text-emerald-700">
                    Reducing balance amortization over {approvedTenureMonths} months
                  </span>
                </div>
                <span className="text-lg font-bold text-emerald-950 font-mono">
                  ${liveEmi.toLocaleString()}
                  <span className="text-xs font-normal text-emerald-700">/mo</span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Underwriter Sanction Note
                </label>
                <input
                  type="text"
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="e.g. Approved with preferential APR based on debt profile..."
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Reject */}
          {activeTab === 'REJECT' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                  Fixed Institutional Rejection Reason
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2.5 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {FIXED_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.code} — {r.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  *This fixed reason will be permanently recorded and displayed directly on the
                  applicant dashboard timeline.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Underwriter Detailed Audit Explanation
                </label>
                <textarea
                  rows={3}
                  required
                  value={rejectionRemarks}
                  onChange={(e) => setRejectionRemarks(e.target.value)}
                  placeholder="Detail the underwriting factors that prompted rejection..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {/* Tab 3: Request More Info */}
          {activeTab === 'MORE_INFO' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Clarification or Document Requests
                </label>
                <textarea
                  rows={3}
                  required
                  value={moreInfoNote}
                  onChange={(e) => setMoreInfoNote(e.target.value)}
                  placeholder="Specify what additional records or clarifications are required..."
                  className="w-full text-xs rounded-lg border border-slate-300 p-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (activeTab === 'APPROVE' && hasUnverifiedDocs)}
              className={`px-5 py-2 rounded-lg text-white text-xs font-semibold transition shadow-xs flex items-center gap-2 disabled:opacity-50 ${
                activeTab === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : activeTab === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              {loading ? (
                <span>Executing Decision...</span>
              ) : activeTab === 'APPROVE' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sanction & Approve Terms</span>
                </>
              ) : activeTab === 'REJECT' ? (
                <>
                  <XCircle className="h-4 w-4" />
                  <span>Execute Formal Rejection</span>
                </>
              ) : (
                <>
                  <HelpCircle className="h-4 w-4" />
                  <span>Request More Information</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UnderwritingReviewModal;
