const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
} = require('../controllers/productController');
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', protect, authorizeRoles('approver', 'admin'), createProduct);
router.put('/:id', protect, authorizeRoles('approver', 'admin'), updateProduct);

module.exports = router;
