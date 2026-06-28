// src/routes/accounts.js
import express from 'express'
import Account from '../models/Account.js'
import { auth } from '../middleware/auth.js'

const router = express.Router()

/**
 * GET /api/accounts
 * Get all accounts for the authenticated user
 */
router.get('/', auth, async (req, res) => {
  try {
    const accounts = await Account.find({ user: req.user.userId }).sort({ createdAt: -1 })
    res.json({ ok: true, accounts })
  } catch (err) {
    console.error('Get accounts error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch accounts', details: err.message })
  }
})

/**
 * GET /api/accounts/:id
 * Get a specific account
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user.userId })
    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' })
    }
    res.json({ ok: true, account })
  } catch (err) {
    console.error('Get account error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch account', details: err.message })
  }
})

/**
 * POST /api/accounts
 * Create a new account
 */
router.post('/', auth, async (req, res) => {
  try {
    const { 
      name, 
      bankName, 
      accountNumber, 
      accountType, 
      currency, 
      currentBalance,
      credentials,
      metadata
    } = req.body
    
    if (!name || !bankName || !accountNumber) {
      return res.status(400).json({ ok: false, error: 'Name, bank name, and account number are required' })
    }
    
    const account = new Account({
      user: req.user.userId,
      name,
      bankName,
      accountNumber,
      accountType: accountType || 'Savings',
      currency: currency || 'USD',
      currentBalance: currentBalance || 0,
      isActive: true,
      credentials: credentials ? {
        username: credentials.username,
        passwordHash: credentials.passwordHash, // Should be pre-encrypted on client
        loginStatus: 'pending'
      } : undefined,
      metadata: metadata || {}
    })
    
    await account.save()
    res.status(201).json({ ok: true, account })
  } catch (err) {
    console.error('Create account error:', err)
    res.status(500).json({ ok: false, error: 'Failed to create account', details: err.message })
  }
})

/**
 * PUT /api/accounts/:id
 * Update an account
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user.userId })
    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' })
    }
    
    const { 
      name, 
      bankName, 
      accountType, 
      currency, 
      currentBalance,
      isActive,
      credentials,
      metadata
    } = req.body
    
    if (name) account.name = name
    if (bankName) account.bankName = bankName
    if (accountType) account.accountType = accountType
    if (currency) account.currency = currency
    if (currentBalance !== undefined) account.currentBalance = currentBalance
    if (isActive !== undefined) account.isActive = isActive
    if (credentials) {
      account.credentials = {
        ...account.credentials,
        ...credentials
      }
    }
    if (metadata) {
      account.metadata = {
        ...account.metadata,
        ...metadata
      }
    }
    
    await account.save()
    res.json({ ok: true, account })
  } catch (err) {
    console.error('Update account error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update account', details: err.message })
  }
})

/**
 * DELETE /api/accounts/:id
 * Delete an account (soft delete by setting isActive to false)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.user.userId })
    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' })
    }
    
    // Soft delete
    account.isActive = false
    await account.save()
    
    res.json({ ok: true, message: 'Account deactivated' })
  } catch (err) {
    console.error('Delete account error:', err)
    res.status(500).json({ ok: false, error: 'Failed to delete account', details: err.message })
  }
})

/**
 * PUT /api/accounts/:id/balance
 * Update account balance manually
 */
router.put('/:id/balance', auth, async (req, res) => {
  try {
    const { balance, date } = req.body
    
    if (balance === undefined) {
      return res.status(400).json({ ok: false, error: 'Balance is required' })
    }
    
    const account = await Account.findOne({ _id: req.params.id, user: req.user.userId })
    if (!account) {
      return res.status(404).json({ ok: false, error: 'Account not found' })
    }
    
    account.currentBalance = balance
    await account.save()
    
    res.json({ ok: true, account })
  } catch (err) {
    console.error('Update balance error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update balance', details: err.message })
  }
})

export default router
