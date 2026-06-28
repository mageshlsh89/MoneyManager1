// src/middleware/auth.js
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export const auth = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, error: 'Access denied. No token provided.' })
    }
    
    const token = authHeader.split(' ')[1]
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET)
    
    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email
    }
    
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ ok: false, error: 'Invalid token' })
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, error: 'Token expired' })
    }
    res.status(500).json({ ok: false, error: 'Authentication failed' })
  }
}

export default auth
