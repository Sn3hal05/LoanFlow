import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Building2, 
  User, 
  ShieldCheck, 
  FileCheck2, 
  LogOut, 
  ChevronDown,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, role, logout, switchRole, demoAccounts } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (email) => {
    try {
      setSwitching(true);
      await switchRole(email);
      setDropdownOpen(false);
      navigate('/');
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'applicant':
        return { text: 'Applicant', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'loan_officer':
        return { text: 'Loan Officer', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'approver':
        return { text: 'Underwriter / Approver', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { text: role || 'Guest', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleMeta = getRoleLabel();

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                LoanFlow
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                  Tracker
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                MERN Lifecycle & Underwriting Platform
              </p>
            </div>
          </Link>

          {/* User Controls & Demo Switcher */}
          {user ? (
            <div className="flex items-center gap-3">
              {/* Quick Persona Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  disabled={switching}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition shadow-xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  <span className="hidden md:inline">Quick Demo Switcher</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Switch Role / Demo Persona
                      </p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => handleRoleSwitch('applicant.sarah@demo.com')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">Sarah Jenkins</p>
                          <p className="text-[11px] text-slate-500">Applicant (Fresh Enquiry)</p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
                          Applicant
                        </span>
                      </button>

                      <button
                        onClick={() => handleRoleSwitch('applicant.laura@demo.com')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">Laura Bennett</p>
                          <p className="text-[11px] text-slate-500">Applicant (Approved Terms)</p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-mono">
                          Applicant
                        </span>
                      </button>

                      <button
                        onClick={() => handleRoleSwitch('applicant.robert@demo.com')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">Robert Taylor</p>
                          <p className="text-[11px] text-slate-500">Applicant (Auto-Rejected)</p>
                        </div>
                        <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-100 font-mono">
                          Applicant
                        </span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={() => handleRoleSwitch('officer.marcus@bank.com')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">Marcus Vance</p>
                          <p className="text-[11px] text-slate-500">Loan Officer (Verifies Docs)</p>
                        </div>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-mono">
                          Officer
                        </span>
                      </button>

                      <button
                        onClick={() => handleRoleSwitch('approver.elena@bank.com')}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">Elena Rostova</p>
                          <p className="text-[11px] text-slate-500">Underwriter (Approves & Disburses)</p>
                        </div>
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-100 font-mono">
                          Approver
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Current Role Badge */}
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${roleMeta.color}`}
              >
                {role === 'approver' && <ShieldCheck className="h-3.5 w-3.5" />}
                {role === 'loan_officer' && <FileCheck2 className="h-3.5 w-3.5" />}
                {role === 'applicant' && <User className="h-3.5 w-3.5" />}
                <span>{roleMeta.text}</span>
              </span>

              {/* Notification Bell */}
              <NotificationBell />

              {/* Current User Info */}
              <div className="text-right hidden md:block">
                <p className="text-xs font-semibold text-slate-900 leading-none">{user.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
