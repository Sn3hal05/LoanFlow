import React, { useState } from 'react';
import api from '../../services/api';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink
} from 'lucide-react';

const DocumentReviewModal = ({ isOpen, onClose, application, documents, onRefresh }) => {
  const [remarksMap, setRemarksMap] = useState({});
  const [submittingDocId, setSubmittingDocId] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  if (!isOpen || !application) return null;

  const handleVerify = async (docId, newStatus) => {
    setSubmittingDocId(docId);
    setError(null);
    setSuccessMsg(null);

    try {
      const remarks = remarksMap[docId] || '';
      const res = await api.patch(`/documents/${docId}/verify`, {
        status: newStatus,
        remarks,
      });

      if (res.data.statusUpdated) {
        setSuccessMsg(`All mandatory documents verified! Application automatically moved to ${res.data.applicationStatus}.`);
      } else {
        setSuccessMsg(`Document marked as ${newStatus}.`);
      }

      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating document status');
    } finally {
      setSubmittingDocId(null);
    }
  };

  const verifiedCount = documents.filter((d) => d.status === 'VERIFIED').length;
  const mandatoryCount = documents.filter((d) => d.isMandatory).length;
  const allVerified = documents.filter((d) => d.isMandatory).every((d) => d.status === 'VERIFIED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              <span>Officer Document Verification Workbench</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review applicant documentation against product criteria for Application #{application.applicationNumber}
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
        <div className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Applicant Snapshot */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Applicant</span>
              <span className="font-semibold text-slate-900">{application.applicantId?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Product</span>
              <span className="font-semibold text-slate-900">{application.loanProductId?.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Requested Loan</span>
              <span className="font-semibold text-slate-900 font-mono">
                ${application.requestedAmount?.toLocaleString()} ({application.requestedTenureMonths} mo)
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Credit Score</span>
              <span className="font-semibold text-indigo-600 font-mono">{application.creditScore}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">DTI Ratio</span>
              <span className="font-semibold text-slate-900 font-mono">{application.calculatedDtiRatio}%</span>
            </div>
          </div>

          {/* Verification Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
              <span className="text-slate-600">Verification Completeness</span>
              <span className="text-indigo-600 font-semibold font-mono">
                {verifiedCount} / {mandatoryCount} mandatory verified
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 transition-all duration-300 rounded-full"
                style={{
                  width: `${(verifiedCount / Math.max(1, mandatoryCount)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Documents Checklist List */}
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition bg-white"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{doc.title}</span>
                        {doc.isMandatory && (
                          <span className="text-[10px] text-rose-600 font-medium">*Mandatory</span>
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                            doc.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : doc.status === 'SUBMITTED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : doc.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{doc.description}</p>

                      {doc.originalName && (
                        <div className="mt-1 text-[11px] text-indigo-600 flex items-center gap-1 font-mono">
                          <span>Attached: {doc.originalName}</span>
                          <span className="text-slate-400">({Math.round(doc.size / 1024)} KB)</span>
                        </div>
                      )}

                      {/* Verification remark input */}
                      <div className="mt-2">
                        <input
                          type="text"
                          placeholder="Optional audit remarks or rejection notes..."
                          value={remarksMap[doc._id] ?? doc.verificationRemarks ?? ''}
                          onChange={(e) =>
                            setRemarksMap({ ...remarksMap, [doc._id]: e.target.value })
                          }
                          className="w-full text-xs rounded-md border border-slate-200 px-2.5 py-1.5 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Verification action buttons */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center">
                    <button
                      type="button"
                      disabled={submittingDocId === doc._id}
                      onClick={() => handleVerify(doc._id, 'VERIFIED')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                        doc.status === 'VERIFIED'
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{doc.status === 'VERIFIED' ? 'Verified' : 'Verify'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={submittingDocId === doc._id}
                      onClick={() => handleVerify(doc._id, 'REJECTED')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                        doc.status === 'REJECTED'
                          ? 'bg-rose-600 text-white cursor-default'
                          : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            {allVerified
              ? '✓ All mandatory documents verified.'
              : 'Verify remaining documents to advance application.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentReviewModal;
