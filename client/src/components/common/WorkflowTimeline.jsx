import React from 'react';
import { 
  Check, 
  Clock, 
  X, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  CreditCard
} from 'lucide-react';

const STANDARD_STEPS = [
  { id: 'Enquiry-Submitted', label: 'Enquiry', desc: 'Eligibility Pre-Check' },
  { id: 'Documents-Pending', label: 'Documents', desc: 'Upload Checklist' },
  { id: 'Documents-Verified', label: 'Verified', desc: 'Officer Validation' },
  { id: 'Under-Review', label: 'Under Review', desc: 'Risk Assessment' },
  { id: 'Approved', label: 'Approved', desc: 'Terms Configured' },
  { id: 'Terms-Accepted-by-Applicant', label: 'Accepted', desc: 'Borrower Sign-Off' },
  { id: 'Disbursed', label: 'Disbursed', desc: 'Funds Credited' },
];

const WorkflowTimeline = ({ application }) => {
  if (!application) return null;

  const currentStatus = application.status;
  const isRejected = currentStatus === 'Rejected';
  const isMoreInfo = currentStatus === 'More-Info-Requested';

  // Determine active step index
  const stepIndexMap = {
    'Enquiry-Submitted': 0,
    'Documents-Pending': 1,
    'Documents-Verified': 2,
    'Under-Review': 3,
    'Approved': 4,
    'Terms-Accepted-by-Applicant': 5,
    'Disbursed': 6,
  };

  const currentStepIndex = isRejected
    ? -1
    : isMoreInfo
    ? 1
    : stepIndexMap[currentStatus] ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Application Lifecycle</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Server-side governed status flow from enquiry submission to loan disbursement
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-100 px-3 py-1 rounded-md text-slate-600">
          <span>Ref:</span>
          <span className="font-semibold text-slate-900">{application.applicationNumber}</span>
        </div>
      </div>

      {/* Stepper Graphic */}
      {!isRejected ? (
        <div className="relative mb-8">
          <div className="overflow-x-auto pb-4 pt-1">
            <div className="min-w-[640px] flex items-center justify-between relative">
              {/* Connecting background bar */}
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
              {/* Connecting active filled bar */}
              <div 
                className="absolute top-4 left-6 h-0.5 bg-indigo-600 transition-all duration-500 -z-0"
                style={{
                  width: `${(Math.max(0, currentStepIndex) / (STANDARD_STEPS.length - 1)) * 100}%`,
                }}
              />

              {STANDARD_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isFuture = idx > currentStepIndex;

                return (
                  <div key={step.id} className="flex flex-col items-center relative z-10">
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-300 ${
                        isCompleted
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isCurrent
                          ? 'bg-white border-2 border-indigo-600 text-indigo-600 ring-4 ring-indigo-50 shadow-sm'
                          : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium text-center ${
                        isCurrent
                          ? 'text-indigo-600 font-semibold'
                          : isCompleted
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="text-[10px] text-slate-400 text-center hidden sm:block">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Rejection Banner */
        <div className="mb-6 rounded-lg bg-rose-50 border border-rose-200 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-rose-600">
              <X className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-rose-900">Application Rejected</h4>
                {application.rejectedAt && (
                  <span className="text-xs text-rose-700">
                    {new Date(application.rejectedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-mono font-medium bg-rose-200/70 text-rose-900 px-2 py-0.5 rounded">
                  Reason: {application.rejectionReason}
                </span>
              </div>
              {application.rejectionRemarks && (
                <p className="mt-2 text-xs text-rose-800 leading-relaxed bg-white/70 p-2.5 rounded border border-rose-200">
                  {application.rejectionRemarks}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Special State Callouts */}
      {isMoreInfo && (
        <div className="mb-6 rounded-lg bg-orange-50 border border-orange-200 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-orange-900">Action Required: More Information Requested</h4>
            <p className="text-xs text-orange-800 mt-1">
              The reviewing officer or underwriter has requested clarifications or updated document uploads. Please review the checklist below.
            </p>
          </div>
        </div>
      )}

      {/* Audit History Log */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          <span>Timeline Event Log</span>
        </h4>
        <div className="space-y-3">
          {application.timeline && application.timeline.length > 0 ? (
            application.timeline.slice().reverse().map((entry, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs">
                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
                  <User className="h-3 w-3" />
                </div>
                <div className="flex-1 bg-slate-50/70 rounded-md p-2.5 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600 mb-1">
                    <span className="font-medium text-slate-900">
                      {entry.changedByName || 'System'}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        ({entry.role})
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-indigo-700 font-medium text-[11px] mb-1">
                    {entry.fromStatus && (
                      <>
                        <span className="text-slate-500">{entry.fromStatus}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                      </>
                    )}
                    <span>{entry.toStatus}</span>
                  </div>
                  {entry.notes && (
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic">No events recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowTimeline;
