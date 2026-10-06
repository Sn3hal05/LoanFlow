const express = require('express');
const router = express.Router();
const {
  createApplication,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
  acceptLoanTerms,
} = require('../controllers/applicationController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post('/', protect, authorizeRoles('applicant', 'admin'), createApplication);
router.get('/', protect, getApplications);
router.get('/:id', protect, getApplicationById);
router.patch(
  '/:id/status',
  protect,
  authorizeRoles('loan_officer', 'approver', 'admin'),
  updateApplicationStatus
);
router.post(
  '/:id/accept-terms',
  protect,
  authorizeRoles('applicant', 'admin'),
  acceptLoanTerms
);

module.exports = router;
