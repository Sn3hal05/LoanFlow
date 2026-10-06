import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import WorkflowTimeline from '../components/common/WorkflowTimeline';
import DocumentUploadModal from '../components/applicant/DocumentUploadModal';
import DocumentReviewModal from '../components/officer/DocumentReviewModal';
import TermsAcceptanceModal from '../components/applicant/TermsAcceptanceModal';
import UnderwritingReviewModal from '../components/approver/UnderwritingReviewModal';
import DisbursementModal from '../components/approver/DisbursementModal';
import AIRiskPanel from '../components/approver/AIRiskPanel';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  Banknote,
  Send,
  Sliders,
  FileCheck
} from 'lucide-react';

const ApplicationDetailView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [isDocUploadOpen, setIsDocUploadOpen] = useState(false);
  const [isDocReviewOpen, setIsDocReviewOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isUnderwriteModalOpen, setIsUnderwriteModalOpen] = useState(false);
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/applications/${id}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Error loading application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplicationDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading comprehensive application records...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Application Not Found</h3>
        <p className="text-xs text-slate-500">{error || 'Could not locate requested application.'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { application, documents = [], notes = [], decision, disbursement } = data;

  const isApplicant = role === 'applicant';
  const isOfficer = role === 'loan_officer';
  const isApprover = role === 'approver' || role === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Role based CTA shortcuts */}
          {isApplicant && application.status === 'Approved' && (
            <button
              onClick={() => setIsTermsModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Review & Accept Terms</span>
            </button>
          )}

          {isApplicant &&
            ['Documents-Pending', 'More-Info-Requested'].includes(application.status) && (
              <button
                onClick={() => setIsDocUploadOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <FileText className="h-4 w-4" />
                <span>Upload Documents</span>
              </button>
            )}

          {isOfficer && (
            <button
              onClick={() => setIsDocReviewOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <FileCheck className="h-4 w-4" />
              <span>Verify Documents</span>
            </button>
          )}

          {isApprover && application.status === 'Under-Review' && (
            <button
              onClick={() => setIsUnderwriteModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition flex items-center gap-1.5 shadow-xs"
            >
              <Sliders className="h-4 w-4" />
              <span>Underwriting Decision</span>
            </button>
          )}

          {isApprover && application.status === 'Terms-Accepted-by-Applicant' && (
            <button
              onClick={() => setIsDisburseModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <Banknote className="h-4 w-4" />
              <span>Disburse Funds</span>
            </button>
          )}
        </div>
      </div>

      {/* Application Master Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-sm font-bold text-slate-900">
                {application.applicationNumber}
              </span>
              <StatusBadge status={application.status} size="lg" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              {application.loanProductId?.name}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Submitted on {new Date(application.createdAt).toLocaleString()} by{' '}
              <strong className="text-slate-800">{application.applicantId?.name}</strong> (
              {application.applicantId?.email})
            </p>
          </div>

          <div className="text-right bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
            <span className="text-[11px] text-slate-500 block">Requested Loan Amount</span>
            <span className="text-xl font-bold text-indigo-700 font-mono">
              ${application.requestedAmount?.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Tenure: {application.requestedTenureMonths} months ({application.loanProductId?.baseInterestRate}% base APR)
            </span>
          </div>
        </div>
      </div>

      {/* Visual Workflow Timeline */}
      <WorkflowTimeline application={application} />

      {/* 2-Column Grid of Detail Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Financial Profile & Server-Side Pre-Check */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-indigo-600" />
              <span>Underwriting & Algorithmic Pre-Check</span>
            </h3>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                application.eligibilityStatus === 'ELIGIBLE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {application.eligibilityStatus}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Monthly Income</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">
                ${application.monthlyIncome?.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Existing Debt</span>
              <span className="font-semibold text-slate-900 font-mono text-sm">
                ${application.existingMonthlyDebt?.toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[11px] text-slate-400 block">Credit Score</span>
              <span
                className={`font-semibold font-mono text-sm ${
                  application.creditScore >= 700 ? 'text-emerald-600' : 'text-slate-900'
                }`}
              >
                {application.creditScore}
              </span>
            </div>
          </div>

          {/* DTI & EMI summary */}
          <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs flex items-center justify-between">
            <div>
              <span className="font-semibold text-indigo-950 block">Calculated DTI Ratio</span>
              <span className="text-[11px] text-indigo-700">
                (Debt + Proposed EMI) / Income
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-indigo-950 font-mono">
                {application.calculatedDtiRatio}%
              </span>
              <span className="text-[10px] text-indigo-700 block">
                Policy Max: {application.loanProductId?.maxDtiRatio}%
              </span>
            </div>
          </div>

          {/* Rule-by-rule breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">Automated Policy Rules</h4>
            <div className="space-y-1.5 text-xs">
              {application.eligibilityRemarks && application.eligibilityRemarks.length > 0 ? (
                application.eligibilityRemarks.map((rem, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border flex items-start gap-2 ${
                      rem.passed
                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                        : 'bg-rose-50/40 border-rose-100 text-rose-900'
                    }`}
                  >
                    {rem.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="text-[11px] leading-relaxed">{rem.message}</span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 italic text-[11px]">No rule audit records stored.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Card: Required Document Checklist */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span>Document Compliance Checklist</span>
            </h3>
            <span className="text-xs text-slate-500">
              {documents.filter((d) => d.status === 'VERIFIED').length} / {documents.length} verified
            </span>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {documents.map((doc) => (
              <div key={doc._id} className="p-3 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{doc.title}</span>
                    {doc.isMandatory && (
                      <span className="text-[10px] text-rose-600 font-medium">*Req</span>
                    )}
                  </div>
                  {doc.originalName && (
                    <span className="text-[11px] text-slate-400 block font-mono">
                      {doc.originalName}
                    </span>
                  )}
                  {doc.verificationRemarks && (
                    <span className="text-[11px] text-amber-700 block italic">
                      Note: {doc.verificationRemarks}
                    </span>
                  )}
                </div>

                <div className="shrink-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
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
              </div>
            ))}
          </div>

          {/* Action to open doc modal */}
          <div className="pt-1">
            {isApplicant && (
              <button
                onClick={() => setIsDocUploadOpen(true)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Open Document Upload Center
              </button>
            )}

            {isOfficer && (
              <button
                onClick={() => setIsDocReviewOpen(true)}
                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-semibold transition"
              >
                Open Document Verification Workbench
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AI Credit Risk Assessment (Underwriters & Officers) */}
      {(isOfficer || isApprover) && (
        <AIRiskPanel applicationId={application._id} />
      )}

      {/* Underwriting Sanction Decision Section (if decision exists) */}
      {decision && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              <span>Official Underwriting Sanction Decision</span>
            </h3>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                decision.decision === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {decision.decision}
            </span>
          </div>

          {decision.decision === 'APPROVED' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                  <span className="text-[11px] text-emerald-800 block">Approved Amount</span>
                  <span className="text-base font-bold text-emerald-950 font-mono">
                    ${decision.approvedAmount.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Sanctioned APR</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {decision.approvedInterestRate}%
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] text-slate-500 block">Tenure</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {decision.approvedTenureMonths} mo
                  </span>
                </div>
                <div className="bg-indigo-50/70 p-3 rounded-lg border border-indigo-100">
                  <span className="text-[11px] text-indigo-800 block">Monthly EMI</span>
                  <span className="text-base font-bold text-indigo-950 font-mono">
                    ${decision.monthlyEmi.toLocaleString()}
                  </span>
                </div>
              </div>

              {decision.decisionNote && (
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                  "{decision.decisionNote}" — Underwriter {decision.approverId?.name}
                </p>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500">
                  Borrower Acceptance Status:{' '}
                  <strong className={decision.applicantAccepted ? 'text-emerald-600' : 'text-amber-600'}>
                    {decision.applicantAccepted ? 'Accepted & Signed ✓' : 'Awaiting Borrower Acceptance'}
                  </strong>
                </span>

                {isApplicant && !decision.applicantAccepted && (
                  <button
                    onClick={() => setIsTermsModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition shadow-xs"
                  >
                    Accept Approved Terms
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <span className="font-semibold block">Fixed Reason: {decision.rejectionReason}</span>
                <span className="mt-1 block">{decision.decisionNote}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disbursement Card (if disbursed) */}
      {disbursement && (
        <div className="bg-white rounded-xl border border-green-300 p-6 shadow-xs space-y-4 bg-gradient-to-r from-green-50/50 to-emerald-50/30">
          <div className="flex items-center justify-between border-b border-green-200 pb-3">
            <h3 className="text-sm font-bold text-green-900 flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-700" />
              <span>Official Disbursement Voucher & Receipt</span>
            </h3>
            <span className="text-xs font-mono font-bold bg-green-200/80 text-green-900 px-2.5 py-0.5 rounded-full">
              {disbursement.transactionReference}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-lg border border-green-200">
              <span className="text-[11px] text-slate-500 block">Disbursed Amount</span>
              <span className="text-base font-bold text-green-800 font-mono">
                ${disbursement.amount.toLocaleString()}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-green-200">
              <span className="text-[11px] text-slate-500 block">Settlement Method</span>
              <span className="text-base font-bold text-slate-900 font-mono">
                {disbursement.paymentMethod}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-green-200">
              <span className="text-[11px] text-slate-500 block">Depository Bank</span>
              <span className="text-xs font-bold text-slate-900 block truncate">
                {disbursement.bankName}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ...{disbursement.bankAccountNumber.slice(-4)}
              </span>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-green-200">
              <span className="text-[11px] text-slate-500 block">First EMI Due</span>
              <span className="text-base font-bold text-indigo-700 font-mono">
                {new Date(disbursement.firstEmiDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isDocUploadOpen}
        onClose={() => setIsDocUploadOpen(false)}
        application={application}
        documents={documents}
        onRefresh={fetchApplicationDetails}
      />

      <DocumentReviewModal
        isOpen={isDocReviewOpen}
        onClose={() => setIsDocReviewOpen(false)}
        application={application}
        documents={documents}
        onRefresh={fetchApplicationDetails}
      />

      <TermsAcceptanceModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        application={application}
        decision={decision}
        onSuccess={fetchApplicationDetails}
      />

      <UnderwritingReviewModal
        isOpen={isUnderwriteModalOpen}
        onClose={() => setIsUnderwriteModalOpen(false)}
        application={application}
        documents={documents}
        notes={notes}
        onRefresh={fetchApplicationDetails}
      />

      <DisbursementModal
        isOpen={isDisburseModalOpen}
        onClose={() => setIsDisburseModalOpen(false)}
        application={application}
        decision={decision}
        onSuccess={fetchApplicationDetails}
      />
    </div>
  );
};

export default ApplicationDetailView;
