// src/routes/ai.js
import express from 'express'
import { validateTransactions } from '../utils/validate.js'

// Choose adapter based on env toggle
const USE_MOCK = process.env.USE_MOCK_AI === 'true'

// Lazy import adapters so server can start even if one adapter is missing
let classifyRowsWithOpenAI = null
let classifyRowsWithOllama = null

if (!USE_MOCK) {
  try {
    // prefer Ollama adapter if present
    // eslint-disable-next-line import/no-unresolved
    classifyRowsWithOllama = (await import('../services/ollama.js')).classifyRowsWithOllama
  } catch (e) {
    try {
      // fallback to OpenAI adapter if Ollama not present
      // eslint-disable-next-line import/no-unresolved
      classifyRowsWithOpenAI = (await import('../services/openai.js')).classifyRowsWithOpenAI
    } catch (err) {
      console.warn('No AI adapter available at startup:', err.message)
    }
  }
} else {
  // mock mode: try to import mock-capable adapter (ollama adapter includes mock)
  try {
    classifyRowsWithOllama = (await import('../services/ollama.js')).classifyRowsWithOllama
  } catch (e) {
    console.warn('Mock adapter not found; ensure services/ollama.js exists')
  }
}

const router = express.Router()

router.post('/classify', async (req, res) => {
  try {
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ ok: false, error: 'rows must be a non-empty array' })
    }

    // Select runtime function
    let classifier = null
    if (process.env.USE_MOCK_AI === 'true') {
      classifier = classifyRowsWithOllama // ollama adapter contains mock fallback
    } else {
      // prefer Ollama, then OpenAI
      classifier = classifyRowsWithOllama || classifyRowsWithOpenAI
    }

    if (!classifier) {
      return res.status(500).json({ ok: false, error: 'No AI adapter configured. Set USE_MOCK_AI=true or install Ollama/OpenAI adapter.' })
    }

    const aiResult = await classifier(rows)

    const { valid, errors } = validateTransactions(aiResult)
    if (!valid) {
      return res.status(422).json({ ok: false, error: 'AI output failed schema validation', details: errors })
    }

    const normalized = aiResult.map(t => ({
      date: t.date,
      merchant: t.merchant,
      amount: Number(t.amount),
      currency: (t.currency || 'GBP').toUpperCase(),
      category: t.category,
      notes: t.notes || '',
      confidence: typeof t.confidence === 'number' ? Number(t.confidence) : undefined
    }))

    return res.json({ ok: true, transactions: normalized })
  } catch (err) {
    console.error('AI classify error', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

export default router
