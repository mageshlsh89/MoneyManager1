import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import authRouter from './routes/auth.js'
import accountsRouter from './routes/accounts.js'
import transactionsRouter from './routes/transactions.js'
import importRouter from './routes/import.js'
import aiRouter from './routes/ai.js'

dotenv.config()

const PORT = process.env.PORT || 4000

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create app before using middleware
const app = express()

// Middleware
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }))

const isProd = process.env.NODE_ENV === 'production'
if (isProd) {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "worker-src": ["'self'", "blob:"],
        "connect-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:"],
        "object-src": ["'none'"]
      }
    }
  }))
} else {
  app.use(helmet({ contentSecurityPolicy: false }))
}

app.use(express.json({ limit: '5mb' }))

// Routes
app.use('/api/auth', authRouter)
app.use('/api/accounts', accountsRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/import', importRouter)
app.use('/api/ai', aiRouter)

// Health
app.get('/health', (req, res) => res.json({ ok: true }))
app.get('/api/health', (req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
