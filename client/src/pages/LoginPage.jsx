import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  User, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  ShieldCheck,
  FileCheck2
} from 'lucide-react';

const LoginPage = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('applicant.sarah@demo.com');
  const [password, setPassword] = useState('password123');

  // Register fields
  const [name, setName] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState(6000);
  const [creditScore, setCreditScore] = useState(740);
  const [existingMonthlyDebt, setExistingMonthlyDebt] = useState(500);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register({
          name,
          email,
          password,
          monthlyIncome: Number(monthlyIncome),
          creditScore: Number(creditScore),
          existingMonthlyDebt: Number(existingMonthlyDebt),
        });
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (userEmail) => {
    setLoading(true);
    setError(null);
    try {
      await login(userEmail, 'password123');
      navigate('/');
    } catch (err) {
      setError('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-md shadow-indigo-200">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
          LoanFlow Tracker
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          End-to-End Loan Application, Verification & Underwriting Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Personas Panel */}
        <div className="mb-6 bg-white border border-indigo-100 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-2.5">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span>1-Click Quick Demo Personas</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('applicant.sarah@demo.com')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">Sarah Jenkins</p>
                <p className="text-[11px] text-slate-500">Applicant • Fresh Enquiry</p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                Applicant
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('applicant.laura@demo.com')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">Laura Bennett</p>
                <p className="text-[11px] text-slate-500">Applicant • Approved Sanction Terms</p>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                Applicant
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('officer.marcus@bank.com')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">Marcus Vance</p>
                <p className="text-[11px] text-slate-500">Loan Officer • Document Verification</p>
              </div>
              <span className="text-[10px] font-mono bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                Loan Officer
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('approver.elena@bank.com')}
              className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 text-left transition flex items-center justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">Elena Rostova</p>
                <p className="text-[11px] text-slate-500">Approver / Underwriter • Sanction & Disburse</p>
              </div>
              <span className="text-[10px] font-mono bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                Approver
              </span>
            </button>
          </div>
        </div>

        {/* Main Login / Register Card */}
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200/80 sm:px-10">
          <div className="flex border-b border-slate-200 mb-6">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition ${
                !isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 pb-3 text-xs font-semibold text-center border-b-2 transition ${
                isRegister
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Register Applicant
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {isRegister && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Income ($)</label>
                  <input
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Score</label>
                  <input
                    type="number"
                    value={creditScore}
                    onChange={(e) => setCreditScore(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">Debt ($)</label>
                  <input
                    type="number"
                    value={existingMonthlyDebt}
                    onChange={(e) => setExistingMonthlyDebt(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
