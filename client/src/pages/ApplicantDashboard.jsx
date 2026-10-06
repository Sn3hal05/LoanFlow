import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import NewEnquiryModal from '../components/applicant/NewEnquiryModal';
import DocumentUploadModal from '../components/applicant/DocumentUploadModal';
import TermsAcceptanceModal from '../components/applicant/TermsAcceptanceModal';
import { 
  PlusCircle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Banknote,
  ShieldCheck,
  FileSignature
} from 'lucide-react';

const ApplicantDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [selectedAppForDocs, setSelectedAppForDocs] = useState(null);
  const [appDocs, setAppDocs] = useState([]);
  const [selectedAppForTerms, setSelectedAppForTerms] = useState(null);
  const [appDecision, setAppDecision] = useState(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/applications');
      setApplications(res.data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleOpenDocModal = async (app) => {
    try {
      setSelectedAppForDocs(app);
      const res = await api.get(`/applications/${app._id}`);
      setAppDocs(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load app documents:', err);
    }
  };

  const handleOpenTermsModal = async (app) => {
    try {
      setSelectedAppForTerms(app);
      const res = await api.get(`/applications/${app._id}`);
      setAppDecision(res.data.decision);
    } catch (err) {
      console.error('Failed to load app terms:', err);
    }
  };

  // KPIs
  const activeCount = applications.filter((a) => !['Rejected', 'Disbursed'].includes(a.status)).length;
  const disbursedTotal = applications
    .filter((a) => a.status === 'Disbursed')
    .reduce((sum, a) => sum + (a.requestedAmount || 0), 0);
  const actionRequiredCount = applications.filter(
    (a) => a.status === 'Documents-Pending' || a.status === 'More-Info-Requested' || a.status === 'Approved'
  ).length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-xs font-medium text-indigo-100 mb-2 border border-white/10">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Borrower Self-Service Portal</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome back, {user?.name}</h1>
            <p className="text-indigo-100 text-xs sm:text-sm mt-1 max-w-xl">
              Track your loan applications across every lifecycle stage from initial algorithmic assessment to fund disbursement.
            </p>
          </div>

          <button
            onClick={() => setIsEnquiryModalOpen(true)}
            className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 shrink-0"
          >
            <PlusCircle className="h-4 w-4 text-indigo-600" />
            <span>Apply for New Loan</span>
          </button>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">In-Progress Applications</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Action Required</span>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{actionRequiredCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Funds Disbursed</span>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
              ${disbursedTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Loan Applications</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time server-side tracking of your submitted loan enquiries
            </p>
          </div>
          <button
            onClick={fetchApplications}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading your applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No applications found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't submitted any loan enquiries yet. Choose a product and apply in 2 minutes.
            </p>
            <button
              onClick={() => setIsEnquiryModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Start Loan Application
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app._id} className="p-5 hover:bg-slate-50/50 transition">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {app.applicationNumber}
                      </span>
                      <StatusBadge status={app.status} />
                      <span className="text-xs text-slate-400">
                        • {new Date(app.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">
                        {app.loanProductId?.name || 'Loan Application'}
                      </p>
                      <span className="text-xs text-slate-500 font-mono">
                        (${app.requestedAmount?.toLocaleString()} requested for {app.requestedTenureMonths} mo)
                      </span>
                    </div>

                    {/* Stage specific banners */}
                    {app.status === 'Rejected' && (
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-800 mt-2">
                        <span className="font-semibold block text-rose-900">
                          Rejection Reason: {app.rejectionReason}
                        </span>
                        {app.rejectionRemarks && (
                          <span className="mt-0.5 block">{app.rejectionRemarks}</span>
                        )}
                      </div>
                    )}

                    {app.status === 'Approved' && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 mt-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold block text-emerald-900">
                            Loan Sanctioned! Terms ready for your review.
                          </span>
                          <span className="text-[11px] text-emerald-700">
                            Please review the sanctioned interest rate, tenure, and EMI to accept.
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenTermsModal(app)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 transition shrink-0 ml-3"
                        >
                          Review & Accept Terms
                        </button>
                      </div>
                    )}

                    {app.status === 'More-Info-Requested' && (
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-2.5 text-xs text-orange-800 mt-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold block text-orange-900">
                            Action Needed: Additional Document or Clarification Requested
                          </span>
                          <span className="text-[11px] text-orange-700">
                            Please update your document submissions to proceed with review.
                          </span>
                        </div>
                        <button
                          onClick={() => handleOpenDocModal(app)}
                          className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-semibold text-xs hover:bg-orange-700 transition shrink-0 ml-3"
                        >
                          Update Documents
                        </button>
                      </div>
                    )}

                    {app.status === 'Documents-Pending' && (
                      <div className="text-xs text-amber-700 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>Documents are pending upload. Upload required files to initiate officer review.</span>
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
                    {/* Document Upload Button */}
                    {['Documents-Pending', 'More-Info-Requested', 'Documents-Verified', 'Under-Review'].includes(
                      app.status
                    ) && (
                      <button
                        onClick={() => handleOpenDocModal(app)}
                        className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs transition flex items-center gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-slate-500" />
                        <span>Documents</span>
                      </button>
                    )}

                    {/* Full details link */}
                    <Link
                      to={`/applications/${app._id}`}
                      className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs transition flex items-center gap-1"
                    >
                      <span>Track Lifecycle</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <NewEnquiryModal
        isOpen={isEnquiryModalOpen}
        onClose={() => setIsEnquiryModalOpen(false)}
        onSuccess={fetchApplications}
      />

      <DocumentUploadModal
        isOpen={!!selectedAppForDocs}
        onClose={() => setSelectedAppForDocs(null)}
        application={selectedAppForDocs}
        documents={appDocs}
        onRefresh={() => {
          fetchApplications();
          if (selectedAppForDocs) handleOpenDocModal(selectedAppForDocs);
        }}
      />

      <TermsAcceptanceModal
        isOpen={!!selectedAppForTerms}
        onClose={() => setSelectedAppForTerms(null)}
        application={selectedAppForTerms}
        decision={appDecision}
        onSuccess={fetchApplications}
      />
    </div>
  );
};

export default ApplicantDashboard;
