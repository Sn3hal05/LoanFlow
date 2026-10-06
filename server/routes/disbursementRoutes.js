const express = require('express');
const router = express.Router();
const { processDisbursement } = require('../controllers/disbursementController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.post(
  '/:id',
  protect,
  authorizeRoles('approver', 'admin'),
  processDisbursement
);

module.exports = router;
