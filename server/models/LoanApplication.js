const mongoose = require('mongoose');

const timelineItemSchema = new mongoose.Schema(
  {
    fromStatus: {
      type: String,
      default: '',
    },
    toStatus: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    changedByName: {
      type: String,
      default: 'System',
    },
    role: {
      type: String,
      default: 'system',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const loanApplicationSchema = new mongoose.Schema(
  {
    applicationNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    applicantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    loanProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanProduct',
      required: true,
      index: true,
    },
    requestedAmount: {
      type: Number,
      required: true,
      min: 100,
    },
    requestedTenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    existingMonthlyDebt: {
      type: Number,
      default: 0,
      min: 0,
    },
    creditScore: {
      type: Number,
      required: true,
      min: 300,
      max: 850,
    },
    calculatedDtiRatio: {
      type: Number,
      default: 0,
    },
    estimatedEmi: {
      type: Number,
      default: 0,
    },
    eligibilityStatus: {
      type: String,
      enum: ['ELIGIBLE', 'INELIGIBLE', 'FLAGGED'],
      default: 'ELIGIBLE',
    },
    eligibilityRemarks: [
      {
        rule: String,
        passed: Boolean,
        message: String,
      },
    ],
    status: {
      type: String,
      enum: [
        'Enquiry-Submitted',
        'Documents-Pending',
        'Documents-Verified',
        'Under-Review',
        'More-Info-Requested',
        'Approved',
        'Rejected',
        'Terms-Accepted-by-Applicant',
        'Disbursed',
      ],
      default: 'Enquiry-Submitted',
      index: true,
    },
    rejectionReason: {
      type: String,
      enum: [
        'LOW_CREDIT_SCORE',
        'INSUFFICIENT_INCOME',
        'HIGH_DEBT_TO_INCOME',
        'INCOMPLETE_DOCUMENTS',
        'UNACCEPTABLE_COLLATERAL',
        'POLICY_EXCEPTION',
        null,
      ],
      default: null,
    },
    rejectionRemarks: {
      type: String,
      default: '',
    },
    rejectedAt: {
      type: Date,
      default: null,
    },
    assignedOfficerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedApproverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    timeline: [timelineItemSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LoanApplication', loanApplicationSchema);
