// src/routes/transactions.js
import express from 'express'
import Transaction from '../models/Transaction.js'
import { validateTransactions } from '../utils/validate.js'

const router = express.Router()

/**
 * POST /api/transactions/bulk
 * Body: { transactions: [ {date, merchant, amount, currency, category, notes} ] }
 * Validates and inserts into MongoDB.
 */
router.post('/bulk', async (req, res) => {
  try {
    const { transactions } = req.body
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ ok: false, error: 'transactions must be a non-empty array' })
    }

    const { valid, errors } = validateTransactions(transactions)
    if (!valid) return res.status(422).json({ ok: false, error: 'Validation failed', details: errors })

    // Convert date strings to Date objects
    const docs = transactions.map(t => ({
      date: new Date(t.date),
      merchant: t.merchant,
      amount: Number(t.amount),
      currency: (t.currency || 'GBP').toUpperCase(),
      category: t.category,
      notes: t.notes || ''
    }))

    const inserted = await Transaction.insertMany(docs, { ordered: false })
    return res.json({ ok: true, insertedCount: inserted.length, insertedIds: inserted.map(d => d._id) })
  } catch (err) {
    console.error('Bulk insert error', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
