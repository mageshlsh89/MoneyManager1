// src/models/Transaction.js
import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  account: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Account',
    required: false 
  },
  date: { type: Date, required: true },
  merchant: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  category: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Income', 'Expense', 'Savings', 'Transfer'],
    default: 'Expense'
  },
  notes: { type: String, default: '' },
  importedFrom: { type: String }, // optional metadata
  status: {
    type: String,
    enum: ['pending', 'cleared', 'reconciled'],
    default: 'cleared'
  },
  tags: [{ type: String }],
  location: {
    city: String,
    country: String
  },
  balanceAfter: { type: Number } // Balance after this transaction
}, { timestamps: true })

// Indexes for faster queries
TransactionSchema.index({ user: 1, date: -1 })
TransactionSchema.index({ user: 1, category: 1 })
TransactionSchema.index({ user: 1, type: 1 })

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)
