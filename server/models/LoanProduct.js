const mongoose = require('mongoose');

const requiredDocSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    isMandatory: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const loanProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Personal', 'Home', 'Vehicle', 'Education', 'Business'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    minAmount: {
      type: Number,
      required: true,
      min: 500,
    },
    maxAmount: {
      type: Number,
      required: true,
    },
    minTenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },
    maxTenureMonths: {
      type: Number,
      required: true,
    },
    baseInterestRate: {
      type: Number,
      required: true,
      min: 0,
    },
    minMonthlyIncome: {
      type: Number,
      required: true,
      min: 0,
    },
    minCreditScore: {
      type: Number,
      required: true,
      min: 300,
      max: 850,
    },
    maxDtiRatio: {
      type: Number,
      required: true,
      min: 10,
      max: 100,
    },
    requiredDocuments: [requiredDocSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('LoanProduct', loanProductSchema);
