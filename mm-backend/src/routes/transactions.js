// src/routes/transactions.js
import express from 'express'
import Transaction from '../models/Transaction.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/transactions
 * Get all transactions for the authenticated user with optional filters
 */
router.get('/', auth, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      category, 
      type, 
      account,
      limit = 100,
      skip = 0
    } = req.query
    
    const query = { user: req.user.userId }
    
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }
    
    if (category) query.category = category
    if (type) query.type = type
    if (account) query.account = account
    
    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('account', 'name bankName')
    
    const total = await Transaction.countDocuments(query)
    
    res.json({ ok: true, transactions, total })
  } catch (err) {
    console.error('Get transactions error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch transactions', details: err.message })
  }
})

/**
 * POST /api/transactions/bulk
 * Body: { transactions: [ {date, merchant, amount, currency, category, notes} ] }
 * Validates and inserts into MongoDB for the authenticated user.
 */
router.post('/bulk', auth, async (req, res) => {
  try {
    const { transactions, accountId } = req.body
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ ok: false, error: 'transactions must be a non-empty array' })
    }

    // Convert date strings to Date objects and add user reference
    const docs = transactions.map(t => ({
      user: req.user.userId,
      account: accountId || null,
      date: new Date(t.date),
      merchant: t.merchant,
      amount: Number(t.amount),
      currency: (t.currency || 'USD').toUpperCase(),
      category: t.category,
      type: t.type || 'Expense',
      notes: t.notes || '',
      status: 'cleared',
      balanceAfter: t.balanceAfter
    }))

    const inserted = await Transaction.insertMany(docs, { ordered: false })
    return res.json({ ok: true, insertedCount: inserted.length, insertedIds: inserted.map(d => d._id) })
  } catch (err) {
    console.error('Bulk insert error', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      user: req.user.userId 
    })
    
    if (!transaction) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' })
    }
    
    const { 
      merchant, 
      amount, 
      category, 
      type, 
      notes,
      date,
      tags
    } = req.body
    
    if (merchant) transaction.merchant = merchant
    if (amount !== undefined) transaction.amount = amount
    if (category) transaction.category = category
    if (type) transaction.type = type
    if (notes !== undefined) transaction.notes = notes
    if (date) transaction.date = new Date(date)
    if (tags) transaction.tags = tags
    
    await transaction.save()
    
    res.json({ ok: true, transaction })
  } catch (err) {
    console.error('Update transaction error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update transaction', details: err.message })
  }
})

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId 
    })
    
    if (!transaction) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' })
    }
    
    res.json({ ok: true, message: 'Transaction deleted' })
  } catch (err) {
    console.error('Delete transaction error:', err)
    res.status(500).json({ ok: false, error: 'Failed to delete transaction', details: err.message })
  }
})

/**
 * GET /api/transactions/summary
 * Get transaction summary (totals by category, type, etc.)
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    
    const matchStage = { user: req.user.userId }
    
    if (startDate || endDate) {
      matchStage.date = {}
      if (startDate) matchStage.date.$gte = new Date(startDate)
      if (endDate) matchStage.date.$lte = new Date(endDate)
    }
    
    // Total income
    const incomeTotal = await Transaction.aggregate([
      { $match: { ...matchStage, type: 'Income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    
    // Total expenses
    const expenseTotal = await Transaction.aggregate([
      { $match: { ...matchStage, type: 'Expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])
    
    // By category
    const byCategory = await Transaction.aggregate([
      { $match: matchStage },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ])
    
    // By type
    const byType = await Transaction.aggregate([
      { $match: matchStage },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
    
    res.json({
      ok: true,
      summary: {
        income: incomeTotal[0]?.total || 0,
        expenses: expenseTotal[0]?.total || 0,
        byCategory,
        byType
      }
    })
  } catch (err) {
    console.error('Summary error:', err)
    res.status(500).json({ ok: false, error: 'Failed to get summary', details: err.message })
  }
})

export default router
