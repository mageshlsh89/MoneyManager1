// src/services/ollama.js
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral:7b'
const TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000)
const RETRIES = Number(process.env.OLLAMA_RETRIES || 1)
const USE_MOCK = process.env.USE_MOCK_AI === 'true'

/* Helpers to extract JSON array from model text */
function extractFirstJsonArray(content) {
  const start = content.indexOf('[')
  if (start === -1) return null
  let depth = 0
  for (let i = start; i < content.length; i++) {
    const ch = content[i]
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        const candidate = content.slice(start, i + 1)
        try {
          const parsed = JSON.parse(candidate)
          if (Array.isArray(parsed)) return parsed
        } catch (e) {
          return null
        }
      }
    }
  }
  return null
}

function extractJsonWithRegex(content) {
  // Non-greedy, single-line regex with dotAll flag to allow newlines
  const match = content.match(/\[.*?\]/s)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed : null
  } catch (e) {
    return null
  }
}

/* Prompt builder */
function buildPrompt(rows = []) {
  return `
You are a transaction classification assistant. Output ONLY valid JSON (no commentary).
Return a JSON array where each item has keys:
- date (ISO 8601 string, e.g. 2025-11-01)
- merchant (string)
- amount (number, negative for debits, positive for credits)
- currency (3-letter code)
- category (one of: Food, Grocery, Travel, Leisure, Investment, Salary, Transfer, Bills, Other)
- notes (string, optional)
- confidence (number between 0 and 1, optional)

Rows:
${JSON.stringify(rows)}

Return only a JSON array.
`.trim()
}

/* Simple deterministic mock for local dev */
async function mockClassify(rows = []) {
  return rows.map((r) => {
    const dateMatch = r.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/)
    const amountMatch = r.match(/([+-]?\d{1,3}(?:[,\d{3}]*)(?:\.\d{2}))/g)
    const amount = amountMatch ? Number(amountMatch[amountMatch.length - 1].replace(/,/g, '')) : 0
    return {
      date: dateMatch ? new Date(dateMatch[0]).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      merchant: r.slice(0, 60),
      amount,
      currency: 'GBP',
      category: amount > 0 ? 'Salary' : 'Other',
      notes: '',
      confidence: 0.7
    }
  })
}

/* Main adapter: call Ollama and extract JSON array */
export async function classifyRowsWithOllama(rows = []) {
  if (USE_MOCK) return mockClassify(rows)

  const prompt = buildPrompt(rows)
  const url = `${OLLAMA_URL}/api/generate`
  const payload = {
    model: OLLAMA_MODEL,
    prompt,
    max_tokens: 1000,
    temperature: 0.0
  }

  let lastErr = null
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const resp = await axios.post(url, payload, { timeout: TIMEOUT_MS })
      const raw = resp?.data
      // Ollama may return different shapes; try to get a text string
      const content = (typeof raw === 'string') ? raw : (raw?.text || raw?.output || JSON.stringify(raw))
      console.log('Ollama content snippet:', (content || '').slice(0, 1000))

      // 1) Try direct parse
      try {
        const parsed = JSON.parse(content)
        if (Array.isArray(parsed)) return parsed
      } catch (e) {
        // continue to extraction attempts
      }

      // 2) Try regex extraction (non-greedy)
      const byRegex = extractJsonWithRegex(content)
      if (byRegex) return byRegex

      // 3) Try bracket-matching extraction
      const byScan = extractFirstJsonArray(content)
      if (byScan) return byScan

      throw new Error('Could not extract JSON array from Ollama response')
    } catch (err) {
      lastErr = err
      console.warn(`Ollama attempt ${attempt + 1} failed: ${err.message}`)
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
    }
  }

  throw new Error(`Ollama classify failed after ${RETRIES + 1} attempts: ${lastErr?.message || 'unknown'}`)
}
