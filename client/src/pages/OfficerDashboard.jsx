import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/common/StatusBadge';
import DocumentReviewModal from '../components/officer/DocumentReviewModal';
import RecommendationModal from '../components/officer/RecommendationModal';
import { 
  FileCheck2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  UserCheck,
  Send
} from 'lucide-react';

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [selectedAppForReview, setSelectedAppForReview] = useState(null);
  const [selectedAppDocs, setSelectedAppDocs] = useState([]);
  const [selectedAppForRecommend, setSelectedAppForRecommend] = useState(null);

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

  const handleOpenReview = async (app) => {
    try {
      setSelectedAppForReview(app);
      const res = await api.get(`/applications/${app._id}`);
      setSelectedAppDocs(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  // Status Filter options
  const filterOptions = [
    { id: 'ALL', label: 'All Applications' },
    { id: 'Documents-Pending', label: 'Docs Pending' },
    { id: 'Documents-Verified', label: 'Docs Verified' },
    { id: 'More-Info-Requested', label: 'More Info' },
    { id: 'Under-Review', label: 'Under Review' },
  ];

  const filteredApps = applications.filter((app) => {
    const matchesStatus = selectedStatus === 'ALL' || app.status === selectedStatus;
    const matchesSearch =
      !searchQuery ||
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.applicantId?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.loanProductId?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // KPIs
  const docsPendingCount = applications.filter((a) => a.status === 'Documents-Pending').length;
  const docsVerifiedCount = applications.filter((a) => a.status === 'Documents-Verified').length;
  const moreInfoCount = applications.filter((a) => a.status === 'More-Info-Requested').length;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-2 border border-indigo-500/30">
            <FileCheck2 className="h-3.5 w-3.5 text-indigo-400" />
            <span>Loan Officer Workbench</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Officer Queue — {user?.name}</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Verify submitted borrower records, ensure strict document compliance, and forward verified files to credit underwriting.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total in Queue</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{applications.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-amber-600 font-medium">Docs Pending Verification</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{docsPendingCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-teal-600 font-medium">Fully Verified (Ready)</span>
          <p className="text-2xl font-bold text-teal-900 mt-1">{docsVerifiedCount}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <span className="text-xs text-orange-600 font-medium">Clarifications Pending</span>
          <p className="text-2xl font-bold text-orange-900 mt-1">{moreInfoCount}</p>
        </div>
      </div>

      {/* Controls & Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSelectedStatus(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedStatus === opt.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by applicant or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 border-b border-slate-200 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3">Application Ref</th>
                <th className="px-5 py-3">Applicant Profile</th>
                <th className="px-5 py-3">Loan Product</th>
                <th className="px-5 py-3">Requested Loan</th>
                <th className="px-5 py-3">Credit Score / DTI</th>
                <th className="px-5 py-3">Current Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    Loading officer queue...
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    No matching applications in this queue.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      <Link
                        to={`/applications/${app._id}`}
                        className="hover:text-indigo-600 hover:underline"
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
                      <span className="text-[10px] text-slate-400 block">
                        {app.loanProductId?.category} Loan
                      </span>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <div className="font-semibold text-slate-900">
                        ${app.requestedAmount?.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400">{app.requestedTenureMonths} months</div>
                    </td>

                    <td className="px-5 py-4 font-mono">
                      <span
                        className={`font-semibold ${
                          app.creditScore >= 700 ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {app.creditScore} FICO
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        DTI: {app.calculatedDtiRatio}%
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={app.status} size="sm" />
                    </td>

                    <td className="px-5 py-4 text-right space-x-2">
                      {/* Review Docs Action */}
                      <button
                        onClick={() => handleOpenReview(app)}
                        className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                      >
                        Verify Docs
                      </button>

                      {/* Recommend / Forward Action */}
                      {app.status === 'Documents-Verified' && (
                        <button
                          onClick={() => setSelectedAppForRecommend(app)}
                          className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition inline-flex items-center gap-1 shadow-xs"
                        >
                          <Send className="h-3 w-3" />
                          <span>Forward</span>
                        </button>
                      )}

                      <Link
                        to={`/applications/${app._id}`}
                        className="px-2 py-1 text-slate-400 hover:text-indigo-600 transition inline-block align-middle"
                        title="View Full Detail"
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

      {/* Modals */}
      <DocumentReviewModal
        isOpen={!!selectedAppForReview}
        onClose={() => setSelectedAppForReview(null)}
        application={selectedAppForReview}
        documents={selectedAppDocs}
        onRefresh={() => {
          fetchApplications();
          if (selectedAppForReview) handleOpenReview(selectedAppForReview);
        }}
      />

      <RecommendationModal
        isOpen={!!selectedAppForRecommend}
        onClose={() => setSelectedAppForRecommend(null)}
        application={selectedAppForRecommend}
        onSuccess={fetchApplications}
      />
    </div>
  );
};

export default OfficerDashboard;
