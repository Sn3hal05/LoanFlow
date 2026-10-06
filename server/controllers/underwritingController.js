const LoanApplication = require('../models/LoanApplication');
const ApprovalDecision = require('../models/ApprovalDecision');
const ApplicationDocument = require('../models/ApplicationDocument');
const VerificationNote = require('../models/VerificationNote');
const { calculateEmi } = require('../services/eligibilityEngine');
const {
  validateTransition,
  FIXED_REJECTION_REASONS,
} = require('../services/workflowStateMachine');
const { notifyStatusChange } = require('../services/notificationService');

// @desc    Submit Underwriter Decision (Approve / Reject / Request More Info)
// @route   POST /api/underwriting/:id/decision
// @access  Private (approver, admin)
const submitDecision = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const {
      decision, // 'APPROVED' | 'REJECTED' | 'REQUEST_MORE_INFO'
      approvedAmount,
      approvedTenureMonths,
      approvedInterestRate,
      decisionNote,
      rejectionReason,
    } = req.body;

    const application = await LoanApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const documents = await ApplicationDocument.find({ applicationId });

    if (decision === 'APPROVED') {
      // 1. Edge Case: Verify all mandatory documents are verified
      const unverified = documents.filter((d) => d.isMandatory && d.status !== 'VERIFIED');
      if (unverified.length > 0) {
        return res.status(400).json({
          message: `Cannot approve application: ${unverified.length} mandatory document(s) are not verified yet (${unverified.map((d) => d.title).join(', ')}).`,
        });
      }

      // 2. Validate Terms
      if (!approvedAmount || !approvedTenureMonths || approvedInterestRate === undefined) {
        return res.status(400).json({
          message: 'Approved amount, tenure in months, and interest rate are required.',
        });
      }

      const emi = calculateEmi(
        Number(approvedAmount),
        Number(approvedInterestRate),
        Number(approvedTenureMonths)
      );

      // 3. State Machine Transition Guard
      validateTransition({
        currentStatus: application.status,
        targetStatus: 'Approved',
        userRole: req.user.role,
        documents,
        approvalTerms: {
          approvedAmount: Number(approvedAmount),
          approvedTenureMonths: Number(approvedTenureMonths),
          approvedInterestRate: Number(approvedInterestRate),
        },
      });

      // 4. Upsert Approval Decision
      let approvalRec = await ApprovalDecision.findOne({ applicationId });
      if (!approvalRec) {
        approvalRec = new ApprovalDecision({
          applicationId,
          approverId: req.user._id,
        });
      }
      approvalRec.decision = 'APPROVED';
      approvalRec.approverId = req.user._id;
      approvalRec.approvedAmount = Number(approvedAmount);
      approvalRec.approvedTenureMonths = Number(approvedTenureMonths);
      approvalRec.approvedInterestRate = Number(approvedInterestRate);
      approvalRec.monthlyEmi = emi;
      approvalRec.decisionNote = decisionNote || 'Loan terms approved as per credit risk policy.';
      approvalRec.rejectionReason = null;
      approvalRec.decidedAt = new Date();
      await approvalRec.save();

      // 5. Update Application
      const prevStatus = application.status;
      application.status = 'Approved';
      application.assignedApproverId = req.user._id;
      application.timeline.push({
        fromStatus: prevStatus,
        toStatus: 'Approved',
        timestamp: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name,
        role: req.user.role,
        notes: `Application approved by underwriter ${req.user.name}. Terms: $${Number(approvedAmount).toLocaleString()} @ ${approvedInterestRate}% APR for ${approvedTenureMonths} mo. (Monthly EMI: $${emi}). Awaiting applicant acceptance.`,
      });

      await application.save();

      await notifyStatusChange({
        application,
        newStatus: 'Approved',
        actor: req.user,
        previousStatus: prevStatus,
      });

      return res.json({
        message: 'Application approved successfully.',
        application,
        decision: approvalRec,
      });
    } else if (decision === 'REJECTED') {
      // 1. Fixed rejection reason check
      if (!rejectionReason || !FIXED_REJECTION_REASONS.includes(rejectionReason)) {
        return res.status(400).json({
          message: `Please select a valid fixed rejection reason: ${FIXED_REJECTION_REASONS.join(', ')}`,
        });
      }

      // 2. Validate Transition
      validateTransition({
        currentStatus: application.status,
        targetStatus: 'Rejected',
        userRole: req.user.role,
        documents,
        rejectionReason,
      });

      // 3. Upsert Approval Decision
      let approvalRec = await ApprovalDecision.findOne({ applicationId });
      if (!approvalRec) {
        approvalRec = new ApprovalDecision({
          applicationId,
          approverId: req.user._id,
        });
      }
      approvalRec.decision = 'REJECTED';
      approvalRec.approverId = req.user._id;
      approvalRec.rejectionReason = rejectionReason;
      approvalRec.decisionNote = decisionNote || 'Application rejected during credit underwriting.';
      approvalRec.decidedAt = new Date();
      await approvalRec.save();

      // 4. Update Application
      const prevStatus = application.status;
      application.status = 'Rejected';
      application.rejectionReason = rejectionReason;
      application.rejectionRemarks = decisionNote || 'Application rejected by underwriter.';
      application.rejectedAt = new Date();
      application.assignedApproverId = req.user._id;

      application.timeline.push({
        fromStatus: prevStatus,
        toStatus: 'Rejected',
        timestamp: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name,
        role: req.user.role,
        notes: `Application rejected by ${req.user.name}. Reason: ${rejectionReason}. Note: ${decisionNote || 'N/A'}`,
      });

      await application.save();

      await notifyStatusChange({
        application,
        newStatus: 'Rejected',
        actor: req.user,
        previousStatus: prevStatus,
      });

      return res.json({
        message: 'Application rejected.',
        application,
        decision: approvalRec,
      });
    } else if (decision === 'REQUEST_MORE_INFO') {
      validateTransition({
        currentStatus: application.status,
        targetStatus: 'More-Info-Requested',
        userRole: req.user.role,
        documents,
      });

      const prevStatus = application.status;
      application.status = 'More-Info-Requested';
      application.timeline.push({
        fromStatus: prevStatus,
        toStatus: 'More-Info-Requested',
        timestamp: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name,
        role: req.user.role,
        notes: `Underwriter requested additional information: ${decisionNote || 'Please supply requested documents'}`,
      });

      await application.save();

      await notifyStatusChange({
        application,
        newStatus: 'More-Info-Required',
        actor: req.user,
        previousStatus: prevStatus,
      });

      await VerificationNote.create({
        applicationId,
        authorId: req.user._id,
        authorRole: req.user.role,
        authorName: req.user.name,
        recommendation: 'REQUEST_MORE_INFO',
        remarks: decisionNote || 'Additional documentation requested by underwriter.',
      });

      return res.json({
        message: 'Status updated to More-Info-Requested.',
        application,
      });
    } else {
      return res.status(400).json({
        message: "Invalid decision. Must be 'APPROVED', 'REJECTED', or 'REQUEST_MORE_INFO'.",
      });
    }
  } catch (error) {
    console.error('[Submit Decision Error]:', error);
    res.status(400).json({ message: error.message || 'Error processing decision' });
  }
};

module.exports = {
  submitDecision,
};
