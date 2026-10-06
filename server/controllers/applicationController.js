const LoanApplication = require('../models/LoanApplication');
const LoanProduct = require('../models/LoanProduct');
const ApplicationDocument = require('../models/ApplicationDocument');
const VerificationNote = require('../models/VerificationNote');
const ApprovalDecision = require('../models/ApprovalDecision');
const Disbursement = require('../models/Disbursement');
const { evaluateEligibility } = require('../services/eligibilityEngine');
const { validateTransition } = require('../services/workflowStateMachine');
const { notifyStatusChange } = require('../services/notificationService');

const ACTIVE_STATUSES = [
  'Enquiry-Submitted',
  'Documents-Pending',
  'Documents-Verified',
  'Under-Review',
  'More-Info-Requested',
  'Approved',
  'Terms-Accepted-by-Applicant',
];

// Helper to generate readable application number
const generateApplicationNumber = async () => {
  const count = await LoanApplication.countDocuments();
  const year = new Date().getFullYear();
  return `LN-${year}-${String(count + 1).padStart(4, '0')}`;
};

// @desc    Submit a new loan enquiry / application
// @route   POST /api/applications
// @access  Private (applicant)
const createApplication = async (req, res) => {
  try {
    const {
      loanProductId,
      requestedAmount,
      requestedTenureMonths,
      monthlyIncome,
      existingMonthlyDebt,
      creditScore,
    } = req.body;

    const applicantId = req.user._id;

    // 1. Verify Loan Product exists
    const product = await LoanProduct.findById(loanProductId);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Selected loan product is not available.' });
    }

    // 2. Prevent duplicate active application for same product by same applicant
    const existingActiveApplication = await LoanApplication.findOne({
      applicantId,
      loanProductId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingActiveApplication) {
      return res.status(409).json({
        message: `You already have an active application (${existingActiveApplication.applicationNumber}) for ${product.name}. A new application can only be submitted once the existing application is closed.`,
        applicationNumber: existingActiveApplication.applicationNumber,
      });
    }

    // 3. Algorithmic Server-Side Eligibility Evaluation
    const evalData = {
      requestedAmount: Number(requestedAmount),
      requestedTenureMonths: Number(requestedTenureMonths),
      monthlyIncome: Number(monthlyIncome),
      existingMonthlyDebt: Number(existingMonthlyDebt || 0),
      creditScore: Number(creditScore),
    };

    const eligibilityResult = evaluateEligibility(product, evalData);

    const applicationNumber = await generateApplicationNumber();

    const timeline = [
      {
        fromStatus: '',
        toStatus: 'Enquiry-Submitted',
        timestamp: new Date(),
        changedBy: applicantId,
        changedByName: req.user.name,
        role: 'applicant',
        notes: `Enquiry submitted for $${evalData.requestedAmount.toLocaleString()} over ${evalData.requestedTenureMonths} months.`,
      },
    ];

    let initialStatus = 'Enquiry-Submitted';
    let rejectionReason = null;
    let rejectionRemarks = '';
    let rejectedAt = null;

    if (!eligibilityResult.isEligible) {
      // Auto-reject immediately due to hard policy failure
      initialStatus = 'Rejected';
      rejectionReason = eligibilityResult.rejectionReason;
      rejectionRemarks = eligibilityResult.remarks
        .filter((r) => !r.passed)
        .map((r) => r.message)
        .join('; ');
      rejectedAt = new Date();

      timeline.push({
        fromStatus: 'Enquiry-Submitted',
        toStatus: 'Rejected',
        timestamp: new Date(),
        changedBy: null,
        changedByName: 'Algorithmic Eligibility Engine',
        role: 'system',
        notes: `Automated rejection: ${rejectionRemarks}`,
      });
    } else {
      // Eligibility Passed -> Transition to Documents-Pending
      initialStatus = 'Documents-Pending';
      timeline.push({
        fromStatus: 'Enquiry-Submitted',
        toStatus: 'Documents-Pending',
        timestamp: new Date(),
        changedBy: null,
        changedByName: 'Eligibility Assessment Engine',
        role: 'system',
        notes: `Automated pre-check passed with projected EMI $${eligibilityResult.emi}/mo and DTI of ${eligibilityResult.dti}%. Awaiting required documents.`,
      });
    }

    // 4. Save Application
    const application = await LoanApplication.create({
      applicationNumber,
      applicantId,
      loanProductId,
      requestedAmount: evalData.requestedAmount,
      requestedTenureMonths: evalData.requestedTenureMonths,
      monthlyIncome: evalData.monthlyIncome,
      existingMonthlyDebt: evalData.existingMonthlyDebt,
      creditScore: evalData.creditScore,
      calculatedDtiRatio: eligibilityResult.dti,
      estimatedEmi: eligibilityResult.emi,
      eligibilityStatus: eligibilityResult.isEligible ? 'ELIGIBLE' : 'INELIGIBLE',
      eligibilityRemarks: eligibilityResult.remarks,
      status: initialStatus,
      rejectionReason,
      rejectionRemarks,
      rejectedAt,
      timeline,
    });

    // 5. If eligible, auto-initialize required document checklist
    if (eligibilityResult.isEligible && product.requiredDocuments?.length > 0) {
      const docDocs = product.requiredDocuments.map((docDef) => ({
        applicationId: application._id,
        docCode: docDef.code,
        title: docDef.label,
        description: docDef.description || '',
        isMandatory: docDef.isMandatory !== false,
        status: 'PENDING',
      }));

      await ApplicationDocument.insertMany(docDocs);
    }

    const populatedApp = await LoanApplication.findById(application._id)
      .populate('loanProductId')
      .populate('applicantId', 'name email phone');

    // Send notification
    await notifyStatusChange({
      application: populatedApp,
      newStatus: initialStatus,
      actor: req.user,
      previousStatus: null,
    });

    res.status(201).json({
      application: populatedApp,
      eligibilityResult,
    });
  } catch (error) {
    console.error('[Create Application Error]:', error);
    res.status(500).json({ message: error.message || 'Error submitting application' });
  }
};

// @desc    Get all applications (with RBAC filtering)
// @route   GET /api/applications
// @access  Private
const getApplications = async (req, res) => {
  try {
    const filter = {};

    // Applicant only sees their own applications
    if (req.user.role === 'applicant') {
      filter.applicantId = req.user._id;
    }

    // Optional query filters for officer & approver
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.productId) {
      filter.loanProductId = req.query.productId;
    }

    const applications = await LoanApplication.find(filter)
      .populate('applicantId', 'name email phone creditScore monthlyIncome')
      .populate('loanProductId', 'name category baseInterestRate')
      .populate('assignedOfficerId', 'name email')
      .populate('assignedApproverId', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    console.error('[Get Applications Error]:', error);
    res.status(500).json({ message: error.message || 'Error fetching applications' });
  }
};

// @desc    Get single application detail with all related entities
// @route   GET /api/applications/:id
// @access  Private
const getApplicationById = async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id)
      .populate('applicantId', 'name email phone creditScore monthlyIncome existingMonthlyDebt')
      .populate('loanProductId')
      .populate('assignedOfficerId', 'name email')
      .populate('assignedApproverId', 'name email');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Ensure applicant can only view their own application
    if (
      req.user.role === 'applicant' &&
      application.applicantId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied to this application.' });
    }

    // Fetch related documents, notes, decision, disbursement
    const [documents, notes, decision, disbursement] = await Promise.all([
      ApplicationDocument.find({ applicationId: application._id }).populate('verifiedBy', 'name email'),
      VerificationNote.find({ applicationId: application._id }).sort({ createdAt: -1 }),
      ApprovalDecision.findOne({ applicationId: application._id }).populate('approverId', 'name email'),
      Disbursement.findOne({ applicationId: application._id }).populate('processedBy', 'name email'),
    ]);

    res.json({
      application,
      documents,
      notes,
      decision,
      disbursement,
    });
  } catch (error) {
    console.error('[Get Application Details Error]:', error);
    res.status(500).json({ message: error.message || 'Error fetching application details' });
  }
};

// @desc    Update application status (Officer / Approver general transition)
// @route   PATCH /api/applications/:id/status
// @access  Private (loan_officer, approver, admin)
const updateApplicationStatus = async (req, res) => {
  try {
    const { targetStatus, notes, recommendation } = req.body;
    const application = await LoanApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    const documents = await ApplicationDocument.find({ applicationId: application._id });

    // Validate transition via state machine engine
    validateTransition({
      currentStatus: application.status,
      targetStatus,
      userRole: req.user.role,
      documents,
      rejectionReason: req.body.rejectionReason,
    });

    const previousStatus = application.status;
    application.status = targetStatus;

    if (req.user.role === 'loan_officer' && !application.assignedOfficerId) {
      application.assignedOfficerId = req.user._id;
    }

    // Timeline entry
    application.timeline.push({
      fromStatus: previousStatus,
      toStatus: targetStatus,
      timestamp: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name,
      role: req.user.role,
      notes: notes || `Application moved to ${targetStatus}`,
    });

    await application.save();

    // If recommendation or note provided, log VerificationNote
    if (notes || recommendation) {
      await VerificationNote.create({
        applicationId: application._id,
        authorId: req.user._id,
        authorRole: req.user.role,
        authorName: req.user.name,
        recommendation: recommendation || 'NOTE_ONLY',
        remarks: notes || `Status updated to ${targetStatus}`,
      });
    }

    await notifyStatusChange({
      application,
      newStatus: targetStatus,
      actor: req.user,
      previousStatus,
    });

    res.json({
      message: `Status updated to ${targetStatus}`,
      application,
    });
  } catch (error) {
    console.error('[Update Status Error]:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Applicant explicitly accepts approved terms
// @route   POST /api/applications/:id/accept-terms
// @access  Private (applicant)
const acceptLoanTerms = async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.applicantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the applicant can accept loan terms.' });
    }

    if (application.status !== 'Approved') {
      return res.status(400).json({
        message: `Cannot accept terms: application is in '${application.status}' state, not 'Approved'.`,
      });
    }

    const decision = await ApprovalDecision.findOne({ applicationId: application._id });
    if (!decision || decision.decision !== 'APPROVED') {
      return res.status(400).json({ message: 'Approved terms record not found for this application.' });
    }

    // Validate transition
    validateTransition({
      currentStatus: application.status,
      targetStatus: 'Terms-Accepted-by-Applicant',
      userRole: 'applicant',
    });

    // Update Decision
    decision.applicantAccepted = true;
    decision.applicantAcceptedAt = new Date();
    await decision.save();

    // Update Application
    const prevStatus = application.status;
    application.status = 'Terms-Accepted-by-Applicant';
    application.timeline.push({
      fromStatus: prevStatus,
      toStatus: 'Terms-Accepted-by-Applicant',
      timestamp: new Date(),
      changedBy: req.user._id,
      changedByName: req.user.name,
      role: 'applicant',
      notes: `Applicant accepted approved terms: $${decision.approvedAmount.toLocaleString()} @ ${decision.approvedInterestRate}% APR for ${decision.approvedTenureMonths} months ($${decision.monthlyEmi}/month).`,
    });

    await application.save();

    await notifyStatusChange({
      application,
      newStatus: 'Terms-Accepted-by-Applicant',
      actor: req.user,
      previousStatus: prevStatus,
    });

    res.json({
      message: 'Loan terms accepted successfully. Awaiting final fund disbursement.',
      application,
      decision,
    });
  } catch (error) {
    console.error('[Accept Terms Error]:', error);
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  acceptLoanTerms,
};
