import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  Banknote, 
  CheckCircle2, 
  AlertCircle, 
  SendHorizontal,
  Building,
  CreditCard
} from 'lucide-react';

const DisbursementModal = ({ isOpen, onClose, application, decision, onSuccess }) => {
  const [bankAccountNumber, setBankAccountNumber] = useState('9843920192');
  const [bankName, setBankName] = useState('JPMorgan Chase Bank, NA');
  const [bankIfsc, setBankIfsc] = useState('CHASUS33');
  const [paymentMethod, setPaymentMethod] = useState('ACH');
  const [notes, setNotes] = useState('Loan disbursed following verified borrower acceptance of terms.');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !application) return null;

  const handleDisbursement = async (e) => {
    e.preventDefault();
    if (!bankAccountNumber) {
      setError('Please provide applicant bank account number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post(`/disbursement/${application._id}`, {
        bankAccountNumber,
        bankName,
        bankIfsc,
        paymentMethod,
        notes,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error executing fund disbursement');
    } finally {
      setLoading(false);
    }
  };

  const amountToDisburse = decision?.approvedAmount || application.requestedAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-green-50/60">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-700" />
              <span>Execute Loan Fund Disbursement</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Application #{application.applicationNumber} — Transfer net funds to borrower
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
        <form onSubmit={handleDisbursement} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Disbursement Summary Callout */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs">
            <div>
              <span className="text-emerald-800 block text-[11px]">Net Disbursable Principal</span>
              <span className="text-xl font-bold text-emerald-950 font-mono">
                ${amountToDisburse.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-emerald-800 block text-[11px]">Borrower</span>
              <span className="font-semibold text-slate-900">{application.applicantId?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Settlement Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="ACH">ACH (Direct Deposit)</option>
                <option value="NEFT">NEFT (Electronic Transfer)</option>
                <option value="RTGS">RTGS (High-Value Transfer)</option>
                <option value="IMPS">IMPS (Instant Settlement)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Bank / Depository Name
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                required
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Routing / IFSC Code
              </label>
              <input
                type="text"
                required
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Disbursement Authorization Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          {/* Footer */}
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
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Processing Transfer...</span>
              ) : (
                <>
                  <SendHorizontal className="h-4 w-4" />
                  <span>Execute Disbursement</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisbursementModal;
