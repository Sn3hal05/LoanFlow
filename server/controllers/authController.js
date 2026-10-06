const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'loan_application_tracker_jwt_secret_key_2026',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'applicant',
      phone,
      monthlyIncome,
      creditScore,
      existingMonthlyDebt,
    } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      phone: phone || '',
      monthlyIncome: monthlyIncome ? Number(monthlyIncome) : 5000,
      creditScore: creditScore ? Number(creditScore) : 720,
      existingMonthlyDebt: existingMonthlyDebt ? Number(existingMonthlyDebt) : 500,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      monthlyIncome: user.monthlyIncome,
      creditScore: user.creditScore,
      existingMonthlyDebt: user.existingMonthlyDebt,
      token,
    });
  } catch (error) {
    console.error('[Register Error]:', error);
    res.status(500).json({ message: error.message || 'Server error registering user' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);

      return res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        monthlyIncome: user.monthlyIncome,
        creditScore: user.creditScore,
        existingMonthlyDebt: user.existingMonthlyDebt,
        token,
      });
    }

    res.status(401).json({ message: 'Invalid email or password' });
  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ message: error.message || 'Server error logging in' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching profile' });
  }
};

// @desc    Get demo accounts for quick role-switching in UI
// @route   GET /api/auth/demo-accounts
// @access  Public
const getDemoAccounts = async (req, res) => {
  try {
    const demoEmails = [
      'applicant.sarah@demo.com',
      'applicant.laura@demo.com',
      'applicant.robert@demo.com',
      'officer.marcus@bank.com',
      'approver.elena@bank.com',
    ];

    const users = await User.find({ email: { $in: demoEmails } })
      .select('-password')
      .lean();

    // Map into friendly role personas
    const accounts = users.map((u) => ({
      ...u,
      demoPassword: 'password123',
    }));

    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching demo accounts' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getDemoAccounts,
};
