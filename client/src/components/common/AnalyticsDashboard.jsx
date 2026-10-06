import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  TrendingUp, Users, CheckCircle, XCircle, DollarSign, BarChart2,
  Clock, Award, Loader2, RefreshCw, AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'];

const STATUS_LABEL_MAP = {
  'Documents-Pending': 'Docs Pending',
  'Documents-Verified': 'Docs Verified',
  'Under-Review': 'Under Review',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
  'Terms-Accepted-by-Applicant': 'Terms Accepted',
  'Disbursed': 'Disbursed',
  'More-Info-Required': 'More Info',
  'Enquiry-Submitted': 'Enquiry',
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/ai/analytics');
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load analytics');
      toast.error('Analytics load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-200">
        <AlertCircle className="w-5 h-5 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
        <button onClick={fetchAnalytics} className="ml-auto text-xs text-red-600 underline">Retry</button>
      </div>
    );
  }

  const { overview, statusBreakdown, productBreakdown, monthlyTrend, rejectionReasons, recentApplications } = data || {};

  const statusChartData = (statusBreakdown || []).map((s) => ({
    name: STATUS_LABEL_MAP[s._id] || s._id,
    value: s.count,
  }));

  const monthlyChartData = (monthlyTrend || []).map((m) => ({
    month: MONTH_NAMES[(m._id?.month || 1) - 1],
    Applications: m.count,
  }));

  const KPICard = ({ icon: Icon, label, value, sub, color = 'indigo' }) => {
    const colors = {
      indigo: 'bg-indigo-50 text-indigo-600',
      green: 'bg-green-50 text-green-600',
      red: 'bg-red-50 text-red-600',
      purple: 'bg-purple-50 text-purple-600',
      amber: 'bg-amber-50 text-amber-600',
    };
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color] || colors.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Platform Analytics</h2>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={Users} label="Total Applications" value={overview?.totalApplications || 0} />
        <KPICard icon={CheckCircle} label="Approval Rate" value={`${overview?.approvalRate || 0}%`} color="green" />
        <KPICard icon={XCircle} label="Rejection Rate" value={`${overview?.rejectionRate || 0}%`} color="red" />
        <KPICard icon={Award} label="Avg Credit Score" value={overview?.avgCreditScore || '—'} sub="FICO score" color="purple" />
        <KPICard icon={TrendingUp} label="Avg DTI Ratio" value={`${overview?.avgDti || 0}%`} sub="Debt-to-income" color="amber" />
        <KPICard
          icon={DollarSign}
          label="Total Disbursed"
          value={`$${((overview?.totalDisbursed || 0) / 1000).toFixed(0)}K`}
          sub={`${overview?.disbursedCount || 0} loans`}
          color="green"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Monthly Applications (Last 6 Months)</p>
          {monthlyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Applications" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>

        {/* Status pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Application Status Breakdown</p>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {statusChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Product breakdown bar chart */}
      {productBreakdown && productBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm font-semibold text-gray-900 mb-4">Applications by Loan Product</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={productBreakdown.map((p) => ({ name: p._id, count: p.count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent activity table */}
      {recentApplications && recentApplications.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Recent Applications</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Application</th>
                  <th className="px-5 py-3 text-left font-medium">Applicant</th>
                  <th className="px-5 py-3 text-left font-medium">Product</th>
                  <th className="px-5 py-3 text-left font-medium">Amount</th>
                  <th className="px-5 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentApplications.map((app) => (
                  <tr key={app._id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-indigo-600">{app.applicationNumber}</td>
                    <td className="px-5 py-3 text-gray-700">{app.applicantId?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{app.loanProductId?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-700">${app.requestedAmount?.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700">{app.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
