const VALID_STATUSES = [
  'Enquiry-Submitted',
  'Documents-Pending',
  'Documents-Verified',
  'Under-Review',
  'More-Info-Requested',
  'Approved',
  'Rejected',
  'Terms-Accepted-by-Applicant',
  'Disbursed',
];

const FIXED_REJECTION_REASONS = [
  'LOW_CREDIT_SCORE',
  'INSUFFICIENT_INCOME',
  'HIGH_DEBT_TO_INCOME',
  'INCOMPLETE_DOCUMENTS',
  'UNACCEPTABLE_COLLATERAL',
  'POLICY_EXCEPTION',
];

/**
 * Valid transitions mapped from current status:
 * currentStatus -> Array of { toStatus, allowedRoles, validateFn? }
 */
const TRANSITION_MAP = {
  'Enquiry-Submitted': [
    {
      to: 'Documents-Pending',
      roles: ['system', 'loan_officer', 'approver', 'admin'],
    },
    {
      to: 'Rejected',
      roles: ['system', 'loan_officer', 'approver', 'admin'],
      requiresReason: true,
    },
  ],
  'Documents-Pending': [
    {
      to: 'Documents-Verified',
      roles: ['loan_officer', 'approver', 'admin'],
      requiresAllDocsVerified: true,
    },
    {
      to: 'More-Info-Requested',
      roles: ['loan_officer', 'approver', 'admin'],
    },
    {
      to: 'Rejected',
      roles: ['loan_officer', 'approver', 'admin'],
      requiresReason: true,
    },
  ],
  'More-Info-Requested': [
    {
      to: 'Documents-Pending',
      roles: ['applicant', 'loan_officer', 'approver', 'admin'],
    },
    {
      to: 'Under-Review',
      roles: ['loan_officer', 'approver', 'admin'],
    },
    {
      to: 'Rejected',
      roles: ['loan_officer', 'approver', 'admin'],
      requiresReason: true,
    },
  ],
  'Documents-Verified': [
    {
      to: 'Under-Review',
      roles: ['loan_officer', 'approver', 'admin'],
    },
    {
      to: 'More-Info-Requested',
      roles: ['loan_officer', 'approver', 'admin'],
    },
  ],
  'Under-Review': [
    {
      to: 'Approved',
      roles: ['approver', 'admin'],
      requiresTerms: true,
      requiresAllDocsVerified: true,
    },
    {
      to: 'Rejected',
      roles: ['approver', 'admin'],
      requiresReason: true,
    },
    {
      to: 'More-Info-Requested',
      roles: ['approver', 'admin'],
    },
  ],
  'Approved': [
    {
      to: 'Terms-Accepted-by-Applicant',
      roles: ['applicant'],
    },
    {
      to: 'Rejected',
      roles: ['applicant', 'approver', 'admin'],
      requiresReason: true,
    },
  ],
  'Terms-Accepted-by-Applicant': [
    {
      to: 'Disbursed',
      roles: ['approver', 'admin', 'system'],
      requiresDisbursementData: true,
    },
  ],
  'Disbursed': [],
  'Rejected': [],
};

/**
 * Validates whether a state transition is legal according to the server-side state machine.
 * Throws an Error with a descriptive explanation if invalid.
 */
function validateTransition({
  currentStatus,
  targetStatus,
  userRole,
  documents = [],
  rejectionReason = null,
  approvalTerms = null,
  disbursementData = null,
}) {
  if (!VALID_STATUSES.includes(targetStatus)) {
    throw new Error(`Target status '${targetStatus}' is not a recognized application status.`);
  }

  if (currentStatus === targetStatus) {
    return true; // No-op
  }

  const allowedTransitions = TRANSITION_MAP[currentStatus];
  if (!allowedTransitions || allowedTransitions.length === 0) {
    throw new Error(
      `Cannot transition application from terminal status '${currentStatus}'. No further modifications allowed.`
    );
  }

  const rule = allowedTransitions.find((t) => t.to === targetStatus);
  if (!rule) {
    throw new Error(
      `Invalid workflow transition: Cannot move application from '${currentStatus}' directly to '${targetStatus}'.`
    );
  }

  // Check RBAC permission for this transition
  const normalizedRole = (userRole || 'system').toLowerCase();
  if (!rule.roles.includes(normalizedRole)) {
    throw new Error(
      `Permission denied: Role '${userRole}' is not authorized to transition application from '${currentStatus}' to '${targetStatus}'. Allowed roles: [${rule.roles.join(', ')}].`
    );
  }

  // Precondition: Rejection reason
  if (rule.requiresReason) {
    if (!rejectionReason || !FIXED_REJECTION_REASONS.includes(rejectionReason)) {
      throw new Error(
        `Rejection requires a valid fixed rejection reason from: [${FIXED_REJECTION_REASONS.join(', ')}]. Received: '${rejectionReason}'.`
      );
    }
  }

  // Precondition: All mandatory documents must be verified
  if (rule.requiresAllDocsVerified) {
    const unverifiedDocs = documents.filter(
      (d) => d.isMandatory && d.status !== 'VERIFIED'
    );
    if (unverifiedDocs.length > 0) {
      const docNames = unverifiedDocs.map((d) => d.title || d.docCode).join(', ');
      throw new Error(
        `Cannot progress to '${targetStatus}': The following required documents are not verified yet: ${docNames}.`
      );
    }
  }

  // Precondition: Terms specified on approval
  if (rule.requiresTerms) {
    if (
      !approvalTerms ||
      !approvalTerms.approvedAmount ||
      !approvalTerms.approvedTenureMonths ||
      approvalTerms.approvedInterestRate === undefined
    ) {
      throw new Error(
        `Approver must configure official loan terms (approvedAmount, approvedTenureMonths, approvedInterestRate) to approve application.`
      );
    }
  }

  // Precondition: Disbursement data
  if (rule.requiresDisbursementData) {
    if (!disbursementData || !disbursementData.bankAccountNumber) {
      throw new Error(
        `Valid bank account number and disbursement details are required to finalize disbursement.`
      );
    }
  }

  return true;
}

module.exports = {
  VALID_STATUSES,
  FIXED_REJECTION_REASONS,
  TRANSITION_MAP,
  validateTransition,
};
