const mongoose = require('mongoose');

const approvalDecisionSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanApplication',
      required: true,
      unique: true,
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    decision: {
      type: String,
      enum: ['APPROVED', 'REJECTED'],
      required: true,
    },
    // Terms configured by underwriter upon approval
    approvedAmount: {
      type: Number,
      default: 0,
    },
    approvedTenureMonths: {
      type: Number,
      default: 0,
    },
    approvedInterestRate: {
      type: Number,
      default: 0,
    },
    monthlyEmi: {
      type: Number,
      default: 0,
    },
    decisionNote: {
      type: String,
      default: '',
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
    applicantAccepted: {
      type: Boolean,
      default: false,
    },
    applicantAcceptedAt: {
      type: Date,
      default: null,
    },
    decidedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ApprovalDecision', approvalDecisionSchema);
