// src/routes/auth.js
import express from 'express'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

/**
 * POST /api/auth/register
 * Body: { email, password, name }
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    
    if (!email || !password || !name) {
      return res.status(400).json({ ok: false, error: 'Email, password, and name are required' })
    }
    
    // Check if user exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'User already exists' })
    }
    
    // Create user (password will be hashed by pre-save hook)
    const user = new User({ email, password, name })
    await user.save()
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
    
    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    })
  } catch (err) {
    console.error('Registration error:', err)
    res.status(500).json({ ok: false, error: 'Registration failed', details: err.message })
  }
})

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ ok: false, error: 'Email and password are required' })
    }
    
    // Find user and include password field
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }
    
    // Check password
    const isMatch = await user.comparePassword(password)
    if (!isMatch) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' })
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )
    
    res.json({
      ok: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name
      }
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ ok: false, error: 'Login failed', details: err.message })
  }
})

/**
 * GET /api/auth/me
 * Get current user info (requires auth middleware)
 */
router.get('/me', async (req, res) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'No token provided' })
    }
    
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)
    
    const user = await User.findById(decoded.userId).select('-password')
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }
    
    res.json({
      ok: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    })
  } catch (err) {
    console.error('Auth check error:', err)
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'Invalid or expired token' })
    }
    res.status(500).json({ ok: false, error: 'Auth check failed', details: err.message })
  }
})

export default router
