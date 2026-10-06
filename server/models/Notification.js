const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['status_update', 'document_request', 'document_verified', 'approval', 'rejection', 'disbursement', 'info'],
      default: 'info',
    },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'LoanApplication' },
    applicationNumber: { type: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
