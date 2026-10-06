const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');

/**
 * Create an in-app notification for a user.
 */
const createNotification = async ({ userId, title, message, type = 'info', applicationId, applicationNumber }) => {
  try {
    await Notification.create({ userId, title, message, type, applicationId, applicationNumber });
  } catch (err) {
    console.error('[Notification Error]:', err.message);
  }
};

/**
 * Notify both applicant and relevant staff when application status changes.
 */
const notifyStatusChange = async ({ application, newStatus, actor, previousStatus }) => {
  const STATUS_MESSAGES = {
    'Documents-Pending': { title: 'Action Required: Submit Documents', type: 'document_request', message: 'Your loan application has been received. Please upload the required documents to proceed.' },
    'Documents-Verified': { title: 'Documents Verified ✓', type: 'document_verified', message: 'All your submitted documents have been verified. Your application is now under review.' },
    'Under-Review': { title: 'Application Under Review', type: 'status_update', message: 'Your loan application is currently being reviewed by our underwriting team.' },
    'Approved': { title: '🎉 Loan Application Approved!', type: 'approval', message: 'Congratulations! Your loan application has been approved. Please review and accept the loan terms.' },
    'Rejected': { title: 'Application Decision', type: 'rejection', message: 'After careful review, we are unable to approve your application at this time. Please check your application for details.' },
    'Terms-Accepted-by-Applicant': { title: 'Terms Accepted', type: 'status_update', message: 'You have successfully accepted the loan terms. Disbursement is being processed.' },
    'Disbursed': { title: '💰 Loan Disbursed!', type: 'disbursement', message: `Your loan of $${application.requestedAmount?.toLocaleString()} has been disbursed to your account.` },
    'More-Info-Required': { title: 'Additional Information Required', type: 'document_request', message: 'Our team has requested additional information or documents for your application. Please review the notes.' },
  };

  const info = STATUS_MESSAGES[newStatus];
  if (!info) return;

  // Notify applicant
  if (application.applicantId) {
    const applicantId = application.applicantId._id || application.applicantId;
    await createNotification({
      userId: applicantId,
      title: info.title,
      message: info.message,
      type: info.type,
      applicationId: application._id,
      applicationNumber: application.applicationNumber,
    });
  }

  // Send email if configured
  if (process.env.SMTP_HOST && application.applicantId?.email) {
    await sendEmail({
      to: application.applicantId.email,
      subject: `[LoanFlow] ${info.title} — ${application.applicationNumber}`,
      text: `${info.message}\n\nApplication: ${application.applicationNumber}\nStatus: ${newStatus}\n\nLogin to LoanFlow to view details.`,
    });
  }
};

/**
 * Send an email notification (SMTP configured via .env).
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    if (!process.env.SMTP_HOST) return;

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"LoanFlow" <no-reply@loanflow.app>',
      to,
      subject,
      text,
      html: html || `<p>${text.replace(/\n/g, '<br/>')}</p>`,
    });
  } catch (err) {
    console.error('[Email Error]:', err.message);
  }
};

module.exports = { createNotification, notifyStatusChange, sendEmail };
