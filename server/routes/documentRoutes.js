const express = require('express');
const router = express.Router();
const { uploadDocument, verifyDocument } = require('../controllers/documentController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post(
  '/:id/upload',
  protect,
  authorizeRoles('applicant', 'admin'),
  upload.single('file'),
  uploadDocument
);

router.patch(
  '/:id/verify',
  protect,
  authorizeRoles('loan_officer', 'approver', 'admin'),
  verifyDocument
);

module.exports = router;
