// src/models/Account.js
import mongoose from 'mongoose'

const AccountSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  bankName: { 
    type: String, 
    required: true,
    trim: true 
  },
  accountNumber: { 
    type: String, 
    required: true,
    trim: true 
  },
  accountType: { 
    type: String, 
    enum: ['Savings', 'Current', 'Credit Card', 'Loan', 'Investment', 'Cash'],
    default: 'Savings'
  },
  currency: { 
    type: String, 
    default: 'USD' 
  },
  currentBalance: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  credentials: {
    // Encrypted bank credentials for manual integration
    username: String,
    passwordHash: String,
    securityQuestions: [{
      question: String,
      answerHash: String
    }],
    lastLoginAttempt: Date,
    loginStatus: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      default: 'pending'
    }
  },
  metadata: {
    ifscCode: String,
    branchName: String,
    cardLastFour: String,
    expiryDate: String
  }
}, { timestamps: true })

// Index for faster queries
AccountSchema.index({ user: 1, isActive: 1 })

export default mongoose.models.Account || mongoose.model('Account', AccountSchema)
