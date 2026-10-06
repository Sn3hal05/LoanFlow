const LoanApplication = require('../models/LoanApplication');
const ApplicationDocument = require('../models/ApplicationDocument');
const VerificationNote = require('../models/VerificationNote');
const LoanProduct = require('../models/LoanProduct');
const User = require('../models/User');
const {
  generateRiskAssessment,
  chatAboutEligibility,
  generateDocumentSummary,
  recommendLoanProduct,
} = require('../services/aiService');

// @desc    Generate AI credit risk assessment for an application
// @route   POST /api/ai/risk-assessment/:id
// @access  Private (approver, loan_officer, admin)
const getRiskAssessment = async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id)
      .populate('applicantId', 'name email creditScore monthlyIncome existingMonthlyDebt')
      .populate('loanProductId');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const documents = await ApplicationDocument.find({ applicationId: application._id });
    const notes = await VerificationNote.find({ applicationId: application._id }).sort({ createdAt: -1 });

    const assessment = await generateRiskAssessment(
      application,
      documents,
      notes,
      application.loanProductId
    );

    res.json(assessment);
  } catch (error) {
    console.error('[AI Risk Assessment Route Error]:', error);
    res.status(500).json({ message: error.message || 'Error generating risk assessment' });
  }
};

// @desc    AI Eligibility Chatbot
// @route   POST /api/ai/chat
// @access  Private
const eligibilityChat = async (req, res) => {
  try {
    const { message, applicationId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    let applicationContext = null;

    if (applicationId) {
      const app = await LoanApplication.findById(applicationId).populate('loanProductId', 'name');
      if (app && (req.user.role !== 'applicant' || app.applicantId.toString() === req.user._id.toString())) {
        applicationContext = {
          productName: app.loanProductId?.name,
          requestedAmount: app.requestedAmount,
          creditScore: app.creditScore,
          monthlyIncome: app.monthlyIncome,
          dti: app.calculatedDtiRatio,
          status: app.status,
        };
      }
    }

    const result = await chatAboutEligibility(message, applicationContext);
    res.json(result);
  } catch (error) {
    console.error('[AI Chat Route Error]:', error);
    res.status(500).json({ message: error.message || 'Error processing AI chat' });
  }
};

// @desc    AI Document Verification Summary
// @route   POST /api/ai/document-summary/:id
// @access  Private (loan_officer, approver, admin)
const getDocumentSummary = async (req, res) => {
  try {
    const application = await LoanApplication.findById(req.params.id)
      .populate('applicantId', 'name')
      .populate('loanProductId', 'name');

    if (!application) {
      return res.status(404).json({ message: 'Application not found.' });
    }

    const documents = await ApplicationDocument.find({ applicationId: application._id });
    const summary = await generateDocumentSummary(application, documents);

    res.json(summary);
  } catch (error) {
    console.error('[AI Doc Summary Route Error]:', error);
    res.status(500).json({ message: error.message || 'Error generating document summary' });
  }
};

// @desc    AI Loan Product Recommender
// @route   POST /api/ai/recommend
// @access  Private
const getLoanRecommendation = async (req, res) => {
  try {
    const { creditScore, monthlyIncome, existingMonthlyDebt, desiredAmount, purpose } = req.body;

    // Use logged-in user's profile as defaults
    const profile = {
      creditScore: creditScore || req.user.creditScore,
      monthlyIncome: monthlyIncome || req.user.monthlyIncome,
      existingMonthlyDebt: existingMonthlyDebt || req.user.existingMonthlyDebt,
      desiredAmount,
      purpose,
    };

    const products = await LoanProduct.find({ isActive: true });
    const result = await recommendLoanProduct(profile, products);

    res.json(result);
  } catch (error) {
    console.error('[AI Recommendation Route Error]:', error);
    res.status(500).json({ message: error.message || 'Error generating recommendation' });
  }
};

// @desc    Get platform analytics summary
// @route   GET /api/ai/analytics
// @access  Private (loan_officer, approver, admin)
const getAnalytics = async (req, res) => {
  try {
    const [
      totalApplications,
      statusBreakdown,
      productBreakdown,
      recentApplications,
      approvalRate,
      avgCreditScore,
      totalDisbursed,
    ] = await Promise.all([
      LoanApplication.countDocuments(),
      LoanApplication.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      LoanApplication.aggregate([
        {
          $lookup: {
            from: 'loanproducts',
            localField: 'loanProductId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        { $group: { _id: '$product.name', count: { $sum: 1 }, category: { $first: '$product.category' } } },
        { $sort: { count: -1 } },
      ]),
      LoanApplication.find()
        .sort({ createdAt: -1 })
        .limit(7)
        .populate('applicantId', 'name')
        .populate('loanProductId', 'name category'),
      LoanApplication.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            approved: {
              $sum: {
                $cond: [{ $in: ['$status', ['Approved', 'Terms-Accepted-by-Applicant', 'Disbursed']] }, 1, 0],
              },
            },
            rejected: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
          },
        },
      ]),
      LoanApplication.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$creditScore' }, avgDti: { $avg: '$calculatedDtiRatio' } } },
      ]),
      LoanApplication.aggregate([
        { $match: { status: 'Disbursed' } },
        { $group: { _id: null, total: { $sum: '$requestedAmount' }, count: { $sum: 1 } } },
      ]),
    ]);

    const approvalStats = approvalRate[0] || { total: 0, approved: 0, rejected: 0 };
    const scoreStats = avgCreditScore[0] || { avgScore: 0, avgDti: 0 };
    const disbursedStats = totalDisbursed[0] || { total: 0, count: 0 };

    // Monthly trend for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrend = await LoanApplication.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$requestedAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Rejection reasons breakdown
    const rejectionReasons = await LoanApplication.aggregate([
      { $match: { status: 'Rejected', rejectionReason: { $ne: null } } },
      { $group: { _id: '$rejectionReason', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({
      overview: {
        totalApplications,
        approvalRate: approvalStats.total > 0 ? Math.round((approvalStats.approved / approvalStats.total) * 100) : 0,
        rejectionRate: approvalStats.total > 0 ? Math.round((approvalStats.rejected / approvalStats.total) * 100) : 0,
        avgCreditScore: Math.round(scoreStats.avgScore || 0),
        avgDti: Math.round((scoreStats.avgDti || 0) * 10) / 10,
        totalDisbursed: disbursedStats.total,
        disbursedCount: disbursedStats.count,
      },
      statusBreakdown,
      productBreakdown,
      monthlyTrend,
      rejectionReasons,
      recentApplications,
    });
  } catch (error) {
    console.error('[Analytics Error]:', error);
    res.status(500).json({ message: error.message || 'Error fetching analytics' });
  }
};

module.exports = {
  getRiskAssessment,
  eligibilityChat,
  getDocumentSummary,
  getLoanRecommendation,
  getAnalytics,
};
