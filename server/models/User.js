const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['applicant', 'loan_officer', 'approver', 'admin'],
      default: 'applicant',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    // Default applicant profile metrics for quick testing & self-enquiry
    creditScore: {
      type: Number,
      default: 720,
      min: 300,
      max: 850,
    },
    monthlyIncome: {
      type: Number,
      default: 5000,
      min: 0,
    },
    existingMonthlyDebt: {
      type: Number,
      default: 500,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
