const LoanProduct = require('../models/LoanProduct');

// @desc    Get all active loan products
// @route   GET /api/products
// @access  Public
const getAllProducts = async (req, res) => {
  try {
    const products = await LoanProduct.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching loan products' });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await LoanProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Loan product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching loan product' });
  }
};

// @desc    Create new loan product
// @route   POST /api/products
// @access  Private (approver, admin)
const createProduct = async (req, res) => {
  try {
    const product = await LoanProduct.create(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error creating loan product' });
  }
};

// @desc    Update loan product
// @route   PUT /api/products/:id
// @access  Private (approver, admin)
const updateProduct = async (req, res) => {
  try {
    const product = await LoanProduct.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) {
      return res.status(404).json({ message: 'Loan product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message || 'Error updating loan product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
};
