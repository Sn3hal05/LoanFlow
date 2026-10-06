const mongoose = require('mongoose');

const verificationNoteSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LoanApplication',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorRole: {
      type: String,
      enum: ['loan_officer', 'approver', 'admin'],
      required: true,
    },
    authorName: {
      type: String,
      default: '',
    },
    recommendation: {
      type: String,
      enum: ['RECOMMEND_APPROVAL', 'RECOMMEND_REJECTION', 'REQUEST_MORE_INFO', 'NOTE_ONLY'],
      default: 'NOTE_ONLY',
    },
    remarks: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('VerificationNote', verificationNoteSchema);
