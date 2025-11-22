// routes/importData.js
import express from 'express'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'
import { createRequire } from 'module'
import { parse as parseCSV } from 'csv-parse/sync'
import XLSX from 'xlsx'
import categorize from '../services/categorize.js'

const require = createRequire(import.meta.url)
const { PDFParse } = require('pdf-parse')

const upload = multer({ dest: 'tmp/' })
const router = express.Router()
fs.mkdir('tmp', { recursive: true }).catch(() => { })

// Axis statement parser helpers
const DATE_START = /^(\d{2}[-/]\d{2}[-/]\d{4})|^(\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/
const normalizeNumber = (s) => Number(String(s).replace(/,/g, '').replace(/\s/g, ''))
const monthMap = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' }
const toISODate = (dateStr) => {
  // Handle dd-mm-yyyy or dd/mm/yyyy
  if (/^\d{2}[-/]\d{2}[-/]\d{4}/.test(dateStr)) {
    const [d, m, y] = dateStr.split(/[\/-]/);
    return `${y}-${m}-${d}`
  }
  // Handle dd MMM yy (e.g. 26 Sep 25)
  const match = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{2,4})/)
  if (match) {
    const d = match[1].padStart(2, '0')
    const m = monthMap[match[2]] || '01'
    let y = match[3]
    if (y.length === 2) y = '20' + y
    return `${y}-${m}-${d}`
  }
  return dateStr
}
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const detectCategory = (desc) => { const t = desc.toLowerCase(); if (t.includes('netflix')) return 'Leisure'; if (t.includes('railtel')) return 'Utilities'; if (t.includes('groww')) return 'Investment'; if (t.includes('rent')) return 'Housing'; if (t.includes('salary')) return 'Salary'; if (t.includes('apple')) return 'Leisure'; if (t.includes('google india')) return 'Leisure'; if (t.includes('cred')) return 'Investment'; return 'Misc' }
const foldLines = (lines) => { const out = []; let buf = ''; for (const l of lines) { if (DATE_START.test(l)) { if (buf) out.push(buf.trim()); buf = l; } else { buf += ' ' + l; } } if (buf) out.push(buf.trim()); return out }
const parseFoldedLine = (line) => {
  const dm = line.match(DATE_START);
  if (!dm) return null;
  const dateStr = dm[0];
  const rest = line.slice(dm[0].length).trim();

  // Strict regex: require decimal point to avoid matching years/branch codes/integers
  const decMatches = Array.from(rest.matchAll(/-?[\d,]+\.\d+/g));

  if (decMatches.length < 1) return null;

  const balanceMatch = decMatches[decMatches.length - 1];
  const amountMatch = decMatches.length >= 2 ? decMatches[decMatches.length - 2] : decMatches[0];

  const balance = normalizeNumber(balanceMatch[0]);
  const amountRaw = normalizeNumber(amountMatch[0]);

  const desc = rest.slice(0, (amountMatch.index ?? rest.length)).trim();
  const dateISO = toISODate(dateStr);
  const month = monthNames[new Date(dateISO).getMonth()] || '';

  return { date: dateISO, merchant: desc, amount: amountRaw, balance, month }
}
const parseAxisText = (text) => { const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean); let openingBalance = null; for (const l of lines) { const m = l.match(/OPENING BALANCE\s+([0-9.,]+)/i); if (m) { openingBalance = normalizeNumber(m[1]); break; } } const folded = foldLines(lines); const rows = folded.map(parseFoldedLine).filter(Boolean); let prev = openingBalance; for (const r of rows) { let type = 'Expense'; if (prev != null && !Number.isNaN(prev)) { type = r.balance >= prev ? 'Income' : 'Expense'; } r.type = type; r.category = detectCategory(r.merchant || ''); prev = r.balance; } rows.sort((a, b) => new Date(a.date) - new Date(b.date)); return rows }

// Unified upload handler supporting PDF/CSV/XLS/XLSX
const importHandler = async (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, error: 'No file uploaded' })
  const ext = path.extname(req.file.originalname || '').toLowerCase()
  const mimetype = req.file.mimetype || ''
  const country = req.body.country || 'India' // Default to India if not provided
  console.log('Import received', { filename: req.file.originalname, mimetype, size: req.file.size, ext, country })

  let filePath = req.file.path
  let transactions = []

  try {
    const buffer = await fs.readFile(filePath)

    if (mimetype === 'application/pdf' || ext === '.pdf') {
      console.log('Parsing PDF file...');
      const pdfData = await new PDFParse(new Uint8Array(buffer)).getText()
      const text = pdfData.text

      // Clean up file immediately after reading
      await fs.unlink(filePath).catch(e => console.warn('Failed to delete temp file:', e.message))
      filePath = null

      if (!text) {
        throw new Error('Failed to extract text from PDF')
      }

      transactions = parseAxisText(text)
      console.log(`Parsed ${transactions.length} transactions from PDF.`);

      if (transactions.length === 0) {
        console.warn('No transactions parsed. PDF text preview (first 200 chars):', text.substring(0, 200))
        // Return warning but ok=true so frontend doesn't crash, but maybe show empty
        return res.json({ ok: true, count: 0, transactions: [], warning: 'No transactions found. The PDF format might not be supported.' })
      }

    } else if (mimetype.includes('csv') || ext === '.csv' || mimetype === 'text/plain') {
      console.log('Parsing CSV file...');
      const text = buffer.toString('utf8')
      const records = parseCSV(text, { columns: true, skip_empty_lines: true, trim: true })
      transactions = records.map(mapRecord).filter(r => r.date && r.merchant && r.amount)
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
      console.log(`Parsed ${transactions.length} transactions from CSV.`);

    } else if (ext === '.xls' || ext === '.xlsx' || mimetype.includes('spreadsheet')) {
      console.log('Parsing XLSX file...');
      const wb = XLSX.read(buffer, { type: 'buffer' })
      const sheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      transactions = rows.map(mapRecord).filter(r => r.date && r.merchant && r.amount)
      transactions.sort((a, b) => new Date(a.date) - new Date(b.date))
      console.log(`Parsed ${transactions.length} transactions from XLSX.`);

    } else {
      console.warn('Unsupported file type:', { mimetype, ext });
      return res.status(400).json({ ok: false, error: 'Unsupported file type' })
    }

    console.log('Sample of parsed transactions:', transactions.slice(0, 3));
    return res.json({ ok: true, count: transactions.length, transactions })

  } catch (err) {
    console.error('import error', err)
    return res.status(500).json({
      ok: false,
      error: 'Import failed. ' + (err.message || 'Unknown error'),
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    })
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath)
      } catch (e) {
        console.warn('failed to remove temp file', e)
      }
    }
  }
}

const normalizeDate = (v) => {
  const s = String(v || '').trim()
  if (/^\d{2}[\/-]\d{2}[\/-]\d{2,4}$/.test(s)) return toISODate(s)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
}

const mapRecord = (rec) => {
  const keys = Object.keys(rec)
  const pick = (candidates) => candidates.find(k => keys.includes(k))
  const dateKey = pick(['date', 'Date', 'Transaction Date', 'Txn Date'])
  const merchKey = pick(['merchant', 'Merchant', 'description', 'Description', 'Narration', 'Details'])
  const amountKey = pick(['amount', 'Amount'])
  const debitKey = pick(['debit', 'Debit', 'Dr', 'Withdrawal'])
  const creditKey = pick(['credit', 'Credit', 'Cr', 'Deposit'])
  const balanceKey = pick(['balance', 'Balance', 'Closing Balance'])

  let amount = 0
  let type = 'Expense'
  if (amountKey) {
    const raw = normalizeNumber(rec[amountKey])
    type = raw >= 0 ? 'Income' : 'Expense'
    amount = Math.abs(raw)
  } else if (debitKey || creditKey) {
    const debit = normalizeNumber(rec[debitKey])
    const credit = normalizeNumber(rec[creditKey])
    if (credit && credit > 0) { type = 'Income'; amount = credit } else { type = 'Expense'; amount = debit }
  }
  const date = normalizeDate(rec[dateKey])
  const merchant = String(rec[merchKey] || '').trim()
  const balance = balanceKey ? normalizeNumber(rec[balanceKey]) : undefined
  const month = date ? monthNames[new Date(date).getMonth()] : ''
  const category = categorize(merchant)
  return { date, merchant, amount, type, balance, category, month }
}

router.post('/', upload.single('file'), importHandler)
router.post('/pdf', upload.single('file'), importHandler)
router.post('/csv', upload.single('file'), importHandler)
router.post('/xlsx', upload.single('file'), importHandler)

router.get('/', (req, res) => res.json({ ok: true }))

export default router
