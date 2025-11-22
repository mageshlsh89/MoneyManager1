// src/routes/importPdf.js
import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import * as pdfParseModule from 'pdf-parse'   // import as namespace to be safe
import path from 'path'


const pdfParse = pdfParseModule.default || pdfParseModule // handle both export shapes

const upload = multer({ dest: 'tmp/' })
const router = express.Router()

// Axis statement parser helpers
const DATE_START = /^\d{2}[-/]\d{2}[-/]\d{4}/
const normalizeNumber = (s) => Number(String(s).replace(/,/g,'').replace(/\s/g,''))
const toISODate = (ddmmyyyy) => { const [d, m, y] = ddmmyyyy.split(/[\/-]/); return `${y}-${m}-${d}` }
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const detectCategory = (desc) => { const t = desc.toLowerCase(); if (t.includes('netflix')) return 'Leisure'; if (t.includes('railtel')) return 'Utilities'; if (t.includes('groww')) return 'Investment'; if (t.includes('rent')) return 'Housing'; if (t.includes('salary')) return 'Salary'; if (t.includes('apple')) return 'Leisure'; if (t.includes('google india')) return 'Leisure'; if (t.includes('cred')) return 'Investment'; return 'Misc' }
const foldLines = (lines) => { const out=[]; let buf=''; for (const l of lines) { if (DATE_START.test(l)) { if (buf) out.push(buf.trim()); buf = l; } else { buf += ' ' + l; } } if (buf) out.push(buf.trim()); return out }
const parseFoldedLine = (line) => { const dm = line.match(DATE_START); if (!dm) return null; const dateStr = dm[0]; const rest = line.slice(dm[0].length).trim(); const decMatches = Array.from(rest.matchAll(/-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?/g)); if (decMatches.length < 1) return null; const balanceMatch = decMatches[decMatches.length-1]; const amountMatch = decMatches.length>=2 ? decMatches[decMatches.length-2] : decMatches[0]; const balance = normalizeNumber(balanceMatch[0]); const amount = normalizeNumber(amountMatch[0]); const desc = rest.slice(0, (balanceMatch.index ?? rest.length)).trim(); const month = monthNames[new Date(toISODate(dateStr)).getMonth()] || ''; return { date: toISODate(dateStr), merchant: desc, amount, balance, month } }
const parseAxisText = (text) => { const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean); let openingBalance = null; for (const l of lines) { const m = l.match(/OPENING BALANCE\s+([0-9.,]+)/i); if (m) { openingBalance = normalizeNumber(m[1]); break; } } const folded = foldLines(lines); const rows = folded.map(parseFoldedLine).filter(Boolean); let prev = openingBalance; for (const r of rows) { let type = 'Expense'; if (prev != null && !Number.isNaN(prev)) { type = r.balance >= prev ? 'Income' : 'Expense'; } r.type = type; r.category = detectCategory(r.merchant || ''); prev = r.balance; } rows.sort((a,b)=> new Date(a.date) - new Date(b.date)); return rows }

/**
 * POST /api/import/pdf
 * FormData: file (pdf)
 * This route extracts text lines and sends them to the AI classify endpoint.
 */
router.post('/pdf', upload.single('file'), async (req, res) => {
  console.log('POST /api/import/pdf received', { hasFile: !!req.file, filename: req.file?.originalname, size: req.file?.size, mimetype: req.file?.mimetype })
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' })
  
  let filePath = req.file.path
  try {
    const buffer = await fs.readFile(filePath)
    const data = await pdfParse(buffer)
    
    // Clean up file immediately after reading
    await fs.unlink(filePath).catch(e => console.warn('Failed to delete temp file:', e.message))
    filePath = null // prevent double deletion in finally

    if (!data || !data.text) {
      throw new Error('Failed to extract text from PDF')
    }

    const transactions = parseAxisText(data.text)
    console.log('Parsed transactions count:', transactions.length)
    
    if (transactions.length === 0) {
      console.warn('No transactions parsed. PDF text preview (first 200 chars):', data.text.substring(0, 200))
      return res.json({ ok: true, transactions: [], warning: 'No transactions found. The PDF format might not be supported.' })
    }

    return res.json({ ok: true, transactions })
  } catch (err) {
    console.error('Import PDF error:', err)
    // Clean up if error occurred before unlink
    if (filePath) await fs.unlink(filePath).catch(() => {})
    
    return res.status(500).json({ 
      ok: false, 
      error: 'Failed to process PDF. ' + (err.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  }
})

export default router
