const LoanApplication = require('../models/LoanApplication');
const ApprovalDecision = require('../models/ApprovalDecision');
const Disbursement = require('../models/Disbursement');
const { validateTransition } = require('../services/workflowStateMachine');
const { notifyStatusChange } = require('../services/notificationService');

// @desc    Disburse approved loan to applicant
// @route   POST /api/disbursement/:id
// @access  Private (approver, admin)
const processDisbursement = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const {
      bankAccountNumber,
      bankName = 'Chase Bank NA',
      bankIfsc = 'CHASUS33',
      paymentMethod = 'ACH',
      notes,
    } = req.body;

    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    if (application.status !== 'Terms-Accepted-by-Applicant') {
      return res.status(400).json({
        message: `Disbursement cannot be triggered. Application is currently in '${application.status}' state. Applicant must accept terms first.`,
      });
    }

    const decision = await ApprovalDecision.findOne({ applicationId });
    if (!decision || !decision.applicantAccepted) {
      return res.status(400).json({
        message: 'Applicant has not yet formally accepted the approved loan terms.',
      });
    }

    if (!bankAccountNumber) {
      return res.status(400).json({ message: 'Applicant bank account number is required for disbursement.' });
    }

    // Validate state machine transition
    validateTransition({
      currentStatus: application.status,
      targetStatus: 'Disbursed',
      userRole: req.user.role,
      disbursementData: { bankAccountNumber },
    });

    // Generate unique transaction reference
    const refCode = `DISB-TXN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Calculate first EMI payment date (30 days from disbursement)
    const disbursementDate = new Date();
    const firstEmiDate = new Date();
    firstEmiDate.setDate(firstEmiDate.getDate() + 30);

    const disbursement = await Disbursement.create({
      applicationId: application._id,
      transactionReference: refCode,
      amount: decision.approvedAmount,
      paymentMethod,
      bankName,
      bankAccountNumber,
      bankIfsc,
      disbursementDate,
      firstEmiDate,
      processedBy: req.user._id,
      notes: notes || 'Funds disbursed to applicant primary account.',
    });

    const prevStatus = application.status;
    application.status = 'Disbursed';
    application.timeline.push({
      fromStatus: prevStatus,
      toStatus: 'Disbursed',
      timestamp: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name,
      role: req.user.role,
      notes: `Loan amount of $${decision.approvedAmount.toLocaleString()} disbursed via ${paymentMethod} to account ending in ...${bankAccountNumber.slice(-4)}. Transaction Ref: ${refCode}. First EMI due: ${firstEmiDate.toLocaleDateString()}.`,
    });

    await application.save();

    await notifyStatusChange({
      application,
      newStatus: 'Disbursed',
      actor: req.user,
      previousStatus: prevStatus,
    });

    res.status(201).json({
      message: 'Disbursement processed successfully.',
      disbursement,
      application,
    });
  } catch (error) {
    console.error('[Disbursement Error]:', error);
    res.status(400).json({ message: error.message || 'Error processing disbursement' });
  }
};

module.exports = {
  processDisbursement,
};
