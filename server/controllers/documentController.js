const ApplicationDocument = require('../models/ApplicationDocument');
const LoanApplication = require('../models/LoanApplication');
const { validateTransition } = require('../services/workflowStateMachine');
const { notifyStatusChange } = require('../services/notificationService');

// @desc    Upload / submit a required document
// @route   POST /api/documents/:id/upload
// @access  Private (applicant)
const uploadDocument = async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await ApplicationDocument.findById(documentId);

    if (!document) {
      return res.status(404).json({ message: 'Document requirement record not found.' });
    }

    const application = await LoanApplication.findById(document.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Associated application not found.' });
    }

    // Ensure only the applicant can upload
    if (
      req.user.role === 'applicant' &&
      application.applicantId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Determine file path: real uploaded file or mock upload
    let fileUrl = '';
    let originalName = 'uploaded_document.pdf';
    let mimeType = 'application/pdf';
    let size = 1024 * 150;

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
      size = req.file.size;
    } else if (req.body.mockFileUrl) {
      // Allow instant mock document upload in demo
      fileUrl = req.body.mockFileUrl;
      originalName = req.body.originalName || `${document.title}.pdf`;
      mimeType = 'application/pdf';
      size = 245000;
    } else {
      return res.status(400).json({ message: 'Please provide a file to upload.' });
    }

    document.fileUrl = fileUrl;
    document.originalName = originalName;
    document.mimeType = mimeType;
    document.size = size;
    document.status = 'SUBMITTED';
    document.submittedAt = new Date();
    await document.save();

    // If application was in 'More-Info-Requested', submitting docs moves it back to 'Documents-Pending'
    if (application.status === 'More-Info-Requested') {
      application.status = 'Documents-Pending';
      application.timeline.push({
        fromStatus: 'More-Info-Requested',
        toStatus: 'Documents-Pending',
        timestamp: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name,
        role: 'applicant',
        notes: `Applicant submitted updated document: ${document.title}`,
      });
      await application.save();
    }

    res.json({
      message: 'Document uploaded successfully.',
      document,
      applicationStatus: application.status,
    });
  } catch (error) {
    console.error('[Upload Document Error]:', error);
    res.status(500).json({ message: error.message || 'Error uploading document' });
  }
};

// @desc    Verify or reject a document (Loan Officer / Approver)
// @route   PATCH /api/documents/:id/verify
// @access  Private (loan_officer, approver, admin)
const verifyDocument = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const documentId = req.params.id;

    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({
        message: "Status must be either 'VERIFIED', 'REJECTED', or 'PENDING'",
      });
    }

    const document = await ApplicationDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const application = await LoanApplication.findById(document.applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Associated application not found.' });
    }

    document.status = status;
    document.verificationRemarks = remarks || '';
    document.verifiedBy = req.user._id;
    document.verifiedAt = status === 'VERIFIED' ? new Date() : null;
    await document.save();

    // Check all documents for this application
    const allDocs = await ApplicationDocument.find({ applicationId: application._id });
    const allMandatoryVerified = allDocs
      .filter((d) => d.isMandatory)
      .every((d) => d.status === 'VERIFIED');

    let statusUpdated = false;
    let newAppStatus = application.status;

    // If all mandatory docs are verified and app is in 'Documents-Pending', auto-progress to 'Documents-Verified'
    if (allMandatoryVerified && application.status === 'Documents-Pending') {
      const prev = application.status;
      application.status = 'Documents-Verified';
      newAppStatus = 'Documents-Verified';
      statusUpdated = true;

      application.timeline.push({
        fromStatus: prev,
        toStatus: 'Documents-Verified',
        timestamp: new Date(),
        changedBy: req.user._id,
        changedByName: req.user.name,
        role: req.user.role,
        notes: `All mandatory documents successfully verified by ${req.user.name}.`,
      });

      await application.save();

      await notifyStatusChange({
        application,
        newStatus: 'Documents-Verified',
        actor: req.user,
        previousStatus: prev,
      });
    }

    res.json({
      message: `Document status updated to ${status}`,
      document,
      allMandatoryVerified,
      applicationStatus: newAppStatus,
      statusUpdated,
    });
  } catch (error) {
    console.error('[Verify Document Error]:', error);
    res.status(500).json({ message: error.message || 'Error verifying document' });
  }
};

module.exports = {
  uploadDocument,
  verifyDocument,
};
