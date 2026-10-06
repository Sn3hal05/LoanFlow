const mongoose = require('mongoose');

const disbursementSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanApplication',
      required: true,
      unique: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['NEFT', 'RTGS', 'IMPS', 'ACH', 'DIRECT_DEPOSIT'],
      default: 'ACH',
    },
    bankName: {
      type: String,
      default: 'Standard Chartered Bank',
    },
    bankAccountNumber: {
      type: String,
      required: true,
    },
    bankIfsc: {
      type: String,
      default: 'SCBL0001234',
    },
    disbursementDate: {
      type: Date,
      default: Date.now,
    },
    firstEmiDate: {
      type: Date,
      required: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Disbursement', disbursementSchema);
