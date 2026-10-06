const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const {
  getRiskAssessment,
  eligibilityChat,
  getDocumentSummary,
  getLoanRecommendation,
  getAnalytics,
} = require('../controllers/aiController');

// AI risk assessment (officer + approver only)
router.post(
  '/risk-assessment/:id',
  protect,
  authorizeRoles('loan_officer', 'approver', 'admin'),
  getRiskAssessment
);

// AI eligibility chatbot (all logged-in users)
router.post('/chat', protect, eligibilityChat);

// AI document summary (officer + approver)
router.post(
  '/document-summary/:id',
  protect,
  authorizeRoles('loan_officer', 'approver', 'admin'),
  getDocumentSummary
);

// AI loan product recommender (all users)
router.post('/recommend', protect, getLoanRecommendation);

// Platform analytics (officer + approver)
router.get(
  '/analytics',
  protect,
  authorizeRoles('loan_officer', 'approver', 'admin'),
  getAnalytics
);

module.exports = router;
