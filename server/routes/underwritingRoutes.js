const express = require('express');
const router = express.Router();
const { submitDecision } = require('../controllers/underwritingController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post(
  '/:id/decision',
  protect,
  authorizeRoles('approver', 'admin'),
  submitDecision
);

module.exports = router;
