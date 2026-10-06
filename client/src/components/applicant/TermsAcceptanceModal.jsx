import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  CheckCircle2, 
  FileSignature, 
  DollarSign, 
  Calendar, 
  Percent, 
  AlertCircle 
} from 'lucide-react';

const TermsAcceptanceModal = ({ isOpen, onClose, application, decision, onSuccess }) => {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !application || !decision) return null;

  const handleAcceptTerms = async () => {
    if (!agreed) {
      setError('You must agree to the loan terms and conditions to proceed.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/applications/${application._id}/accept-terms`);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error accepting loan terms');
    } finally {
      setLoading(false);
    }
  };

  const totalPayable = decision.monthlyEmi * decision.approvedTenureMonths;
  const totalInterest = totalPayable - decision.approvedAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-emerald-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-emerald-600" />
              <span>Review & Accept Approved Loan Terms</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Application #{application.applicationNumber} — Official Underwriter Sanction Offer
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
        <div className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Underwriter Note Callout */}
          {decision.decisionNote && (
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-1">Underwriter Remarks:</span>
              <p className="italic">{decision.decisionNote}</p>
            </div>
          )}

          {/* Sanctioned Terms Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-emerald-50/60 border border-emerald-200/60 p-3 rounded-xl text-center">
              <span className="text-[11px] text-emerald-800 block">Sanctioned Amount</span>
              <span className="text-base font-bold text-emerald-950 font-mono">
                ${decision.approvedAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">
                Req: ${application.requestedAmount.toLocaleString()}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <span className="text-[11px] text-slate-500 block">Fixed APR</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {decision.approvedInterestRate}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Annual</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-center">
              <span className="text-[11px] text-slate-500 block">Tenure</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {decision.approvedTenureMonths} mo
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {Math.round((decision.approvedTenureMonths / 12) * 10) / 10} yrs
              </span>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-200/60 p-3 rounded-xl text-center">
              <span className="text-[11px] text-indigo-800 block">Monthly EMI</span>
              <span className="text-base font-bold text-indigo-950 font-mono">
                ${decision.monthlyEmi.toLocaleString()}
              </span>
              <span className="text-[10px] text-indigo-600 block mt-0.5">Monthly</span>
            </div>
          </div>

          {/* Financial Breakdown Table */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/70 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Principal Sanction Amount:</span>
              <span className="font-semibold text-slate-900 font-mono">
                ${decision.approvedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Estimated Total Interest:</span>
              <span className="font-semibold text-slate-900 font-mono">
                ${Math.max(0, Math.round(totalInterest)).toLocaleString()}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-medium text-slate-900">
              <span>Total Repayment Obligation:</span>
              <span className="font-bold text-indigo-600 font-mono text-sm">
                ${Math.round(totalPayable).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Checkbox agreement */}
          <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-4 w-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span className="text-xs text-slate-600 leading-relaxed">
              I have reviewed the sanctioned loan terms, repayment schedule, and agreed interest rate. 
              I formally execute this credit offer and authorize the institution to disburse the net loan proceeds 
              to my designated primary bank account.
            </span>
          </label>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition"
          >
            Review Later
          </button>
          <button
            type="button"
            disabled={!agreed || loading}
            onClick={handleAcceptTerms}
            className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Executing Agreement...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Accept Loan Terms</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TermsAcceptanceModal;
