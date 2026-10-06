import React from 'react';
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  Search, 
  AlertCircle, 
  ThumbsUp, 
  XCircle, 
  FileCheck, 
  Banknote 
} from 'lucide-react';

export const STATUS_CONFIG = {
  'Enquiry-Submitted': {
    label: 'Enquiry Submitted',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Clock,
    dot: 'bg-blue-500',
  },
  'Documents-Pending': {
    label: 'Documents Pending',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: FileText,
    dot: 'bg-amber-500',
  },
  'Documents-Verified': {
    label: 'Documents Verified',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: CheckCircle2,
    dot: 'bg-teal-500',
  },
  'Under-Review': {
    label: 'Under Review',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: Search,
    dot: 'bg-indigo-500',
  },
  'More-Info-Requested': {
    label: 'More Info Requested',
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: AlertCircle,
    dot: 'bg-orange-500',
  },
  'Approved': {
    label: 'Approved (Pending Terms)',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: ThumbsUp,
    dot: 'bg-emerald-500',
  },
  'Rejected': {
    label: 'Rejected',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: XCircle,
    dot: 'bg-rose-500',
  },
  'Terms-Accepted-by-Applicant': {
    label: 'Terms Accepted',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: FileCheck,
    dot: 'bg-cyan-500',
  },
  'Disbursed': {
    label: 'Disbursed',
    color: 'bg-green-100 text-green-800 border-green-300 font-semibold',
    icon: Banknote,
    dot: 'bg-green-600',
  },
};

const StatusBadge = ({ status, size = 'md', showIcon = true }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
    dot: 'bg-slate-400',
  };

  const Icon = config.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium tracking-wide shadow-xs transition-colors ${config.color} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
