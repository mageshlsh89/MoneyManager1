// src/models/Transaction.js
import mongoose from 'mongoose'

const TransactionSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  merchant: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  category: { type: String, required: true },
  notes: { type: String, default: '' },
  importedFrom: { type: String } // optional metadata
}, { timestamps: true })

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema)
