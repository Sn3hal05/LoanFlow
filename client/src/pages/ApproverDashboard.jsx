import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import UnderwritingReviewModal from '../components/approver/UnderwritingReviewModal';
import DisbursementModal from '../components/approver/DisbursementModal';
import AnalyticsDashboard from '../components/common/AnalyticsDashboard';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  Banknote, 
  ArrowRight, 
  Clock, 
  ThumbsUp, 
  XCircle,
  Sliders,
  DollarSign,
  BarChart2
} from 'lucide-react';

const ApproverDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('UNDERWRITING'); // 'UNDERWRITING' | 'DISBURSEMENT' | 'ALL' | 'ANALYTICS'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedAppForDecision, setSelectedAppForDecision] = useState(null);
  const [decisionDocs, setDecisionDocs] = useState([]);
  const [decisionNotes, setDecisionNotes] = useState([]);
  const [selectedAppForDisbursement, setSelectedAppForDisbursement] = useState(null);
  const [disbursementDecision, setDisbursementDecision] = useState(null);

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

  const handleOpenDecision = async (app) => {
    try {
      setSelectedAppForDecision(app);
      const res = await api.get(`/applications/${app._id}`);
      setDecisionDocs(res.data.documents || []);
      setDecisionNotes(res.data.notes || []);
    } catch (err) {
      console.error('Failed to load app data:', err);
    }
  };

  const handleOpenDisbursement = async (app) => {
    try {
      setSelectedAppForDisbursement(app);
      const res = await api.get(`/applications/${app._id}`);
      setDisbursementDecision(res.data.decision);
    } catch (err) {
      console.error('Failed to load disbursement data:', err);
    }
  };

  // KPIs
  const underReviewCount = applications.filter((a) => a.status === 'Under-Review').length;
  const readyForDisbursementCount = applications.filter(
    (a) => a.status === 'Terms-Accepted-by-Applicant'
  ).length;
  const disbursedTotal = applications
    .filter((a) => a.status === 'Disbursed')
    .reduce((sum, a) => sum + (a.requestedAmount || 0), 0);

  // Tab filtering
  const filteredApps = applications.filter((app) => {
    let matchesTab = true;
    if (activeTab === 'UNDERWRITING') {
      matchesTab = app.status === 'Under-Review';
    } else if (activeTab === 'DISBURSEMENT') {
      matchesTab = app.status === 'Terms-Accepted-by-Applicant';
    }

    const matchesSearch =
      !searchQuery ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.loanProductId?.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium mb-2 border border-purple-500/30">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" />
            <span>Credit Underwriting & Approver Authority</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Underwriting Terminal — {user?.name}</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
            Evaluate credit eligibility, sanction tailored loan terms (amount, tenure, APR), enforce fixed institutional rejection reasons, and disburse sanctioned funds.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Underwriting Queue</span>
            <p className="text-2xl font-bold text-purple-950 mt-0.5">{underReviewCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
            <Banknote className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Ready for Disbursement</span>
            <p className="text-2xl font-bold text-cyan-950 mt-0.5">{readyForDisbursementCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Volume Disbursed</span>
            <p className="text-2xl font-bold text-slate-900 font-mono mt-0.5">
              ${disbursedTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Controls & Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('UNDERWRITING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'UNDERWRITING'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Underwriting Queue ({underReviewCount})
          </button>

          <button
            onClick={() => setActiveTab('DISBURSEMENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'DISBURSEMENT'
                ? 'bg-cyan-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Disbursement Terminal ({readyForDisbursementCount})
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Applications ({applications.length})
          </button>

          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ANALYTICS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart2 className="h-3.5 w-3.5" />
            Analytics
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by applicant or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Analytics Tab */}
      {activeTab === 'ANALYTICS' && <AnalyticsDashboard />}

      {/* Table of Applications */}
      {activeTab !== 'ANALYTICS' && (
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Application Ref</th>
                <th className="px-5 py-3">Applicant Profile</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Requested Amount</th>
                <th className="px-5 py-3">Risk Metrics (FICO / DTI)</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Decision / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading underwriter queue...
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No applications currently matching this view.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      <Link
                        to={`/applications/${app._id}`}
                        className="hover:text-purple-600 hover:underline"
                      >
                        {app.applicationNumber}
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{app.applicantId?.name}</div>
                      <div className="text-[11px] text-slate-400">{app.applicantId?.email}</div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-800">{app.loanProductId?.name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        Base: {app.loanProductId?.baseInterestRate}%
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <div className="font-semibold text-slate-900">
                        ${app.requestedAmount?.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">{app.requestedTenureMonths} mo</div>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <span
                        className={`font-semibold ${
                          app.creditScore >= 700 ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {app.creditScore} FICO
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        DTI: {app.calculatedDtiRatio}% (Max: {app.loanProductId?.maxDtiRatio || 45}%)
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {/* Underwriting Decision Trigger */}
                      {app.status === 'Under-Review' && (
                        <button
                          onClick={() => handleOpenDecision(app)}
                          className="px-3 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-semibold transition shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>Review & Decide</span>
                        </button>
                      )}

                      {/* Disbursement Trigger */}
                      {app.status === 'Terms-Accepted-by-Applicant' && (
                        <button
                          onClick={() => handleOpenDisbursement(app)}
                          className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs inline-flex items-center gap-1.5"
                        >
                          <Banknote className="h-3 w-3" />
                          <span>Disburse Loan</span>
                        </button>
                      )}

                      <Link
                        to={`/applications/${app._id}`}
                        className="px-2 py-1 text-slate-400 hover:text-purple-600 transition inline-block align-middle"
                        title="View Full Lifecycle"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modals */}
      <UnderwritingReviewModal
        isOpen={!!selectedAppForDecision}
        onClose={() => setSelectedAppForDecision(null)}
        application={selectedAppForDecision}
        documents={decisionDocs}
        notes={decisionNotes}
        onRefresh={fetchApplications}
      />

      <DisbursementModal
        isOpen={!!selectedAppForDisbursement}
        onClose={() => setSelectedAppForDisbursement(null)}
        application={selectedAppForDisbursement}
        decision={disbursementDecision}
        onSuccess={fetchApplications}
      />
    </div>
  );
};

export default ApproverDashboard;
