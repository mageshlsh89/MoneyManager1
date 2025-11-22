// src/pages/Transactions.jsx
import React, { useEffect, useMemo, useState } from 'react'
import {
  Tabs, Tab, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControl, InputLabel, Select, Box, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox,
  Snackbar, Alert, InputAdornment, ListItemText, Menu, Stack, useTheme, useMediaQuery, Typography,
  Backdrop, CircularProgress
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import ArchiveIcon from '@mui/icons-material/Archive'
import RestoreIcon from '@mui/icons-material/Restore'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import ClearIcon from '@mui/icons-material/Clear'
import EditIcon from '@mui/icons-material/Edit'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import GridOnIcon from '@mui/icons-material/GridOn'
import TableRowsIcon from '@mui/icons-material/TableRows'


import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

import api from '../Services/api'
import { modernFieldSx } from '../theme/modernFieldSx'
import { DataGrid } from '@mui/x-data-grid'

// pdf.js ESM build; use local worker served from /public to avoid CDN/Vite issues

/* --- Config keys and undo expiry --- */
const STORAGE_KEYS = {
  ACTIVE: 'mm_active',
  DELETED: 'mm_deleted',
  ARCHIVED: 'mm_archived',
  LAST_ACTION: 'mm_lastAction',
  LOCATIONS: 'mm_locations'
}
const UNDO_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/* --- Helpers --- */
const safeParse = (s, fallback) => {
  try { const v = JSON.parse(s); return v ?? fallback } catch { return fallback }
}
const saveJSON = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { }
}
const loadJSON = (key, fallback) => safeParse(localStorage.getItem(key), fallback)

/* --- Static options --- */
const allCountries = [
  'UK', 'India', 'USA', 'Germany', 'France', 'Canada', 'Australia',
  'Japan', 'China', 'Brazil', 'South Africa', 'Italy', 'Spain'
]

const typeOptions = ['Income', 'Expense', 'Savings']
const categoryOptions = [
  'Salary', 'Food', 'Grocery', 'Transport', 'Leisure', 'Rent/Mortgage',
  'Utilities', 'Investment', 'Transfer', 'Misc'
]
const monthOptions = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
]

/* --- Color tokens and shared styles --- */
const COLORS = {
  primaryStart: '#4f46e5',
  primaryEnd: '#06b6d4',
  csvGreen: '#16a34a',
  excelGreen: '#15803d',
  pdfRed: '#ef4444',
  outline: 'rgba(255,255,255,0.08)',
  textPrimary: '#E6EEF8',
  textSecondary: '#9fb0c8',
  inputBg: '#071226',
  panelBg: '#061428'
}

const modernFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: COLORS.inputBg,
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(2,6,23,0.45)',
    '& .MuiInputBase-input': { color: COLORS.textPrimary, padding: '10px 12px' },
    '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
    '&.Mui-focused': { boxShadow: '0 10px 30px rgba(96,165,250,0.08)', '& fieldset': { borderColor: '#60a5fa', borderWidth: 1.5 } }
  },
  '& .MuiInputLabel-root': { color: COLORS.textSecondary, fontSize: 13 },
  '& .MuiFormHelperText-root': { color: COLORS.textSecondary },
  '& .MuiSelect-select': { color: COLORS.textPrimary }
}

/* --- CSV/Excel/PDF parsing helpers --- */
const parseCSVFile = (file) => new Promise((resolve, reject) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => resolve(results.data),
    error: (err) => reject(err)
  })
})

const parseExcelFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '' })
  return json
}


/* --- Map parsed rows to transaction shape (handles bank CSV/XLSX) --- */
const mapParsedToTransaction = (parsed) => {
  const getNum = (v) => {
    if (v == null) return NaN
    if (typeof v === 'number') return v
    const s = String(v).trim()
    const m = s.match(/-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?/)
    return m ? Number(m[0].replace(/[,\s]/g, '')) : NaN
  }
  const pick = (...keys) => {
    for (const k of keys) {
      if (parsed[k] != null && String(parsed[k]).trim() !== '') return parsed[k]
    }
    return ''
  }
  let date = pick('date', 'Date', 'Transaction Date', 'Txn Date')
  if (!date) {
    const raw = (parsed.rawLine || parsed.description || parsed.Description || parsed.Narration || '').toString()
    const dmatch = raw.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/)
    if (dmatch) date = dmatch[0]
  }
  const merchant = pick('merchant', 'Merchant', 'Description', 'description', 'Narration', 'Details', 'rawLine')
  const amountRaw = pick('amount', 'Amount', 'Amt', 'value', 'Value')
  const debitRaw = pick('debit', 'Debit', 'Dr', 'Withdrawal')
  const creditRaw = pick('credit', 'Credit', 'Cr', 'Deposit')
  let amount = getNum(amountRaw)
  let type = null
  if (!Number.isFinite(amount)) {
    const d = getNum(debitRaw)
    const c = getNum(creditRaw)
    if (Number.isFinite(c) && c > 0) { amount = c; type = 'Income' }
    else if (Number.isFinite(d) && d > 0) { amount = d; type = 'Expense' }
  } else {
    type = amount >= 0 ? 'Income' : 'Expense'
    amount = Math.abs(amount)
  }
  let month = ''
  if (date) {
    const dt = new Date(date)
    if (!Number.isNaN(dt.getTime())) month = monthOptions[dt.getMonth()]
  }
  const country = parsed.country || ''
  const category = parsed.category || detectCategory(merchant || '', parsed.description || '')
  const finalType = parsed.type || type || detectType(category, merchant || '', parsed.description || '')
  return {
    date: date || '',
    merchant: merchant || '',
    amount: Number.isFinite(amount) ? amount : 0,
    category,
    type: finalType,
    month: month || parsed.month || '',
    country
  }
}

/* --- Heuristics for mapping vendor/description to category/type --- */
const CATEGORY_KEYWORDS = {
  Food: ['tesco', 'sainsbury', 'mcdonald', 'starbucks', 'kfc', 'restaurant', 'cafe', 'grocer', 'grocery'],
  Travel: ['uber', 'taxi', 'flight', 'airlines', 'train', 'bus', 'hotel', 'booking', 'ryanair', 'easyjet'],
  Leisure: ['netflix', 'spotify', 'amazon prime', 'cinema', 'theatre', 'gym', 'leisure'],
  Transfers: ['transfer', 'bank transfer', 'payment to', 'sent to', 'transfer to']
}
const detectCategory = (merchant = '', description = '') => {
  const text = `${merchant} ${description}`.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) return cat
    }
  }
  return 'Misc'
}
const detectType = (category = '', merchant = '', description = '') => {
  const text = `${merchant} ${description}`.toLowerCase()
  if (category === 'Transfers') return 'Savings'
  if (text.includes('salary') || text.includes('payroll') || category === 'Salary') return 'Income'
  return category === 'Misc' ? 'Expense' : (category === 'Salary' ? 'Income' : 'Expense')
}

const allowedCategories = ['Food', 'Grocery', 'Travel', 'Leisure', 'Investment', 'Salary', 'Transfer', 'Bills', 'Other']
const normalizeCategory = (cat) => {
  const c = String(cat || '').trim()
  if (c === 'Transfers') return 'Transfer'
  if (c === 'Transport') return 'Travel'
  if (c === 'Rent/Mortgage' || c === 'Utilities') return 'Bills'
  if (c === 'Misc') return 'Other'
  return allowedCategories.includes(c) ? c : 'Other'
}

/* --- Transaction card for mobile --- */
function TransactionCard({ row, onEdit, onArchive, onDelete, onRestore, onRestoreArchived, tab }) {
  return (
    <Paper elevation={1} sx={{ p: 2, mb: 1, bgcolor: 'rgba(255,255,255,0.02)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
        <Box>
          <Typography sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>{row.merchant}</Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: 12 }}>{row.date} • {row.country || '—'}</Typography>
          <Typography sx={{ color: COLORS.textSecondary, fontSize: 13, mt: 1 }}>{row.category} • {row.month}</Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>{Number(row.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 1 }}>
            <IconButton size="small" onClick={() => onEdit(row)} title="Edit"><EditIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
            {tab === 0 && <>
              <IconButton size="small" onClick={() => onArchive(row)} title="Archive"><ArchiveIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
              <IconButton size="small" onClick={() => onDelete(row)} title="Delete"><DeleteIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
            </>}
            {tab === 1 && <>
              <IconButton size="small" onClick={() => onRestore(row)} title="Restore"><RestoreIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
              <IconButton size="small" onClick={() => onDelete(row)} title="Permanently delete"><DeleteForeverIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
            </>}
            {tab === 2 && <>
              <IconButton size="small" onClick={() => onRestoreArchived(row)} title="Restore"><RestoreIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
              <IconButton size="small" onClick={() => onDelete(row)} title="Delete"><DeleteIcon sx={{ color: COLORS.textSecondary }} /></IconButton>
            </>}
          </Box>
        </Box>
      </Box>
    </Paper>
  )
}

/* --- Main component --- */
export default function Transactions() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [tab, setTab] = useState(0) // 0: Active, 1: Deleted, 2: Archived
  const [openAdd, setOpenAdd] = useState(false)
  const [openEdit, setOpenEdit] = useState(false)
  const [editRow, setEditRow] = useState(null)

  // Data stores
  const [active, setActive] = useState(() => loadJSON(STORAGE_KEYS.ACTIVE, [
    { id: 1, date: '2025-11-01', merchant: 'Tesco', amount: 42.35, category: 'Grocery', type: 'Expense', month: 'November', country: 'UK' },
    { id: 2, date: '2025-11-02', merchant: 'Salary', amount: 4200, category: 'Salary', type: 'Income', month: 'November', country: 'UK' },
    { id: 3, date: '2025-11-03', merchant: 'Vanguard', amount: 200, category: 'Investment', type: 'Savings', month: 'November', country: 'USA' },
  ]))
  const [deleted, setDeleted] = useState(() => loadJSON(STORAGE_KEYS.DELETED, []))
  const [archived, setArchived] = useState(() => loadJSON(STORAGE_KEYS.ARCHIVED, []))
  const [locations, setLocations] = useState(() => loadJSON(STORAGE_KEYS.LOCATIONS, ['Online', 'Newport, UK']))

  // Filters
  const [filterCountries, setFilterCountries] = useState([])
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')

  // Form
  const [form, setForm] = useState({
    date: '', merchant: '', amount: '', category: '', type: 'Expense', month: '', country: ''
  })

  // Selection
  const [selection, setSelection] = useState([])

  // Confirm delete
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmTargetRows, setConfirmTargetRows] = useState([])

  // Import preview
  const [openImportPreview, setOpenImportPreview] = useState(false)
  const [importPreviewRows, setImportPreviewRows] = useState([])
  const [importLoading, setImportLoading] = useState(false)
  const [importCountry, setImportCountry] = useState('India')

  // Column filters
  const [filters, setFilters] = useState({
    date: '',
    merchant: '',
    amountMin: '',
    amountMax: '',
    country: [],
    category: [],
    type: [],
    month: []
  })

  // Snackbar / Undo
  const [snackbar, setSnackbar] = useState({ open: false, message: '', payload: null, severity: 'info' })
  const [lastAction, setLastAction] = useState(() => loadJSON(STORAGE_KEYS.LAST_ACTION, null))

  // Export menu
  const [exportAnchor, setExportAnchor] = useState(null)
  const openExport = Boolean(exportAnchor)
  const handleOpenExport = (e) => setExportAnchor(e.currentTarget)
  const handleCloseExport = () => setExportAnchor(null)

  useEffect(() => { saveJSON(STORAGE_KEYS.ACTIVE, active) }, [active])
  useEffect(() => { saveJSON(STORAGE_KEYS.DELETED, deleted) }, [deleted])
  useEffect(() => { saveJSON(STORAGE_KEYS.ARCHIVED, archived) }, [archived])
  useEffect(() => { saveJSON(STORAGE_KEYS.LOCATIONS, locations) }, [locations])
  useEffect(() => { saveJSON(STORAGE_KEYS.LAST_ACTION, lastAction) }, [lastAction])

  useEffect(() => {
    if (!lastAction) return
    const age = Date.now() - (lastAction.timestamp || 0)
    if (age <= UNDO_EXPIRY_MS) {
      setSnackbar({ open: true, message: lastAction.message || 'Recent action', payload: lastAction, severity: lastAction.severity || 'info' })
    } else {
      setLastAction(null)
      try { localStorage.removeItem(STORAGE_KEYS.LAST_ACTION) } catch { }
    }
  }, []) // eslint-disable-line

  const openUndo = (message, payload, severity = 'info') => {
    const actionRecord = { ...payload, message, severity, timestamp: Date.now() }
    setLastAction(actionRecord)
    setSnackbar({ open: true, message, payload: actionRecord, severity })
    saveJSON(STORAGE_KEYS.LAST_ACTION, actionRecord)
  }
  const closeUndo = () => setSnackbar(prev => ({ ...prev, open: false }))

  const undoLast = () => {
    const p = snackbar.payload ?? lastAction
    if (!p) { closeUndo(); return }
    const rows = p.rows ?? []
    switch (p.action) {
      case 'archive':
        setArchived(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        setActive(prev => [...rows, ...prev])
        break
      case 'deleteSoftFromActive':
        setDeleted(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        setActive(prev => [...rows, ...prev])
        break
      case 'deleteSoftFromArchived':
        setDeleted(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        setArchived(prev => [...rows, ...prev])
        break
      case 'restoreDeleted':
        setActive(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        setDeleted(prev => [...rows, ...prev])
        break
      case 'restoreArchived':
        setActive(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        setArchived(prev => [...rows, ...prev])
        break
      case 'permanentDelete':
        setDeleted(prev => [...rows, ...prev])
        break
      case 'add':
        setActive(prev => prev.filter(r => !rows.some(x => x.id === r.id)))
        break
      default:
        break
    }
    setLastAction(null)
    try { localStorage.removeItem(STORAGE_KEYS.LAST_ACTION) } catch { }
    closeUndo()
  }

  /* --- CRUD actions --- */
  const handleOpenAdd = () => setOpenAdd(true)
  const handleCloseAdd = () => {
    setOpenAdd(false)
    setForm({ date: '', merchant: '', amount: '', category: '', type: 'Expense', month: '', country: '' })
  }
  const handleCreate = () => {
    const { date, merchant, amount, category, type, month, country } = form
    if (!date || !merchant || !amount || !category || !type || !month || !country) {
      alert('Please fill all fields')
      return
    }
    const id = Date.now()
    const newRow = { id, date, merchant, amount: parseFloat(amount), category, type, month, country }
    setActive(prev => [...prev, newRow])
    handleCloseAdd()
    openUndo(`Added ${merchant}`, { action: 'add', rows: [newRow] }, 'success')
  }

  const openEditDialog = (row) => {
    setEditRow(row)
    setForm({ ...row })
    setOpenEdit(true)
  }
  const closeEditDialog = () => {
    setOpenEdit(false)
    setEditRow(null)
    setForm({ date: '', merchant: '', amount: '', category: '', type: 'Expense', month: '', country: '' })
  }
  const handleSaveEdit = () => {
    if (!editRow) return
    const updated = { ...editRow, ...form, amount: parseFloat(form.amount) }
    const updateList = (list, setList) => {
      setList(prev => prev.map(r => r.id === updated.id ? updated : r))
    }
    if (active.some(r => r.id === updated.id)) updateList(active, setActive)
    if (deleted.some(r => r.id === updated.id)) updateList(deleted, setDeleted)
    if (archived.some(r => r.id === updated.id)) updateList(archived, setArchived)
    openUndo(`Edited ${updated.merchant}`, { action: 'edit', rows: [updated] }, 'success')
    closeEditDialog()
  }

  const archiveRow = (row) => {
    setActive(prev => prev.filter(r => r.id !== row.id))
    setArchived(prev => [{ ...row }, ...prev])
    openUndo(`Archived ${row.merchant}`, { action: 'archive', rows: [row] }, 'info')
  }

  const deleteRow = (row) => {
    const src = tab === 2 ? archived : active
    const setSrc = tab === 2 ? setArchived : setActive
    setSrc(src.filter(r => r.id !== row.id))
    setDeleted(prev => [{ ...row }, ...prev])
    openUndo(`Moved ${row.merchant} to Deleted`, { action: tab === 2 ? 'deleteSoftFromArchived' : 'deleteSoftFromActive', rows: [row] }, 'warning')
  }

  const restoreRow = (row) => {
    setDeleted(prev => prev.filter(r => r.id !== row.id))
    setActive(prev => [{ ...row }, ...prev])
    openUndo(`Restored ${row.merchant}`, { action: 'restoreDeleted', rows: [row] }, 'success')
  }

  const restoreArchived = (row) => {
    setArchived(prev => prev.filter(r => r.id !== row.id))
    setActive(prev => [{ ...row }, ...prev])
    openUndo(`Restored ${row.merchant} from Archived`, { action: 'restoreArchived', rows: [row] }, 'success')
  }

  const permanentlyDeleteRow = (rowsToDelete) => {
    setDeleted(prev => prev.filter(r => !rowsToDelete.some(x => x.id === r.id)))
    const message = rowsToDelete.length === 1 ? `${rowsToDelete[0].merchant} permanently deleted` : `${rowsToDelete.length} transactions permanently deleted`
    openUndo(message, { action: 'permanentDelete', rows: rowsToDelete }, 'error')
    setSelection([])
  }

  const askPermanentDelete = (rowsToDelete) => {
    setConfirmTargetRows(rowsToDelete)
    setConfirmOpen(true)
  }
  const confirmPermanentDelete = () => {
    permanentlyDeleteRow(confirmTargetRows)
    setConfirmOpen(false)
    setConfirmTargetRows([])
  }
  const cancelPermanentDelete = () => {
    setConfirmOpen(false)
    setConfirmTargetRows([])
  }

  /* --- Bulk actions and selection helpers --- */
  const rows = tab === 0 ? active : tab === 1 ? deleted : archived

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      // Existing filters
      if (filterCountries.length && !filterCountries.includes(r.country)) return false
      if (filterMonth && r.month !== filterMonth) return false
      if (filterYear) {
        const y = String(new Date(r.date).getFullYear())
        if (y !== filterYear) return false
      }

      // New column filters
      if (filters.date && !r.date.includes(filters.date)) return false
      if (filters.merchant && !r.merchant.toLowerCase().includes(filters.merchant.toLowerCase())) return false
      if (filters.country.length > 0 && !filters.country.includes(r.country)) return false
      if (filters.category.length > 0 && !filters.category.includes(r.category)) return false
      if (filters.type.length > 0 && !filters.type.includes(r.type)) return false
      if (filters.month.length > 0 && !filters.month.includes(r.month)) return false
      if (filters.amountMin && r.amount < parseFloat(filters.amountMin)) return false
      if (filters.amountMax && r.amount > parseFloat(filters.amountMax)) return false

      return true
    })
  }, [rows, filterCountries, filterMonth, filterYear, filters])

  const toggleSelect = (id) => setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const selectAll = (checked) => setSelection(checked ? filteredRows.map(r => r.id) : [])

  const bulkArchive = () => {
    if (tab !== 0 || selection.length === 0) return
    const selectedRows = active.filter(r => selection.includes(r.id))
    setActive(prev => prev.filter(r => !selection.includes(r.id)))
    setArchived(prev => [...selectedRows, ...prev])
    setSelection([])
    openUndo(`Archived ${selectedRows.length} transaction(s)`, { action: 'archive', rows: selectedRows }, 'info')
  }

  const bulkDelete = () => {
    if (!(tab === 0 || tab === 2) || selection.length === 0) return
    const src = tab === 0 ? active : archived
    const setSrc = tab === 0 ? setActive : setArchived
    const selectedRows = src.filter(r => selection.includes(r.id))
    setSrc(src.filter(r => !selection.includes(r.id)))
    setDeleted(prev => [...selectedRows, ...prev])
    setSelection([])
    openUndo(`Moved ${selectedRows.length} transaction(s) to Deleted`, { action: tab === 0 ? 'deleteSoftFromActive' : 'deleteSoftFromArchived', rows: selectedRows }, 'warning')
  }

  const bulkRestore = () => {
    if (tab !== 1 || selection.length === 0) return
    const selectedRows = deleted.filter(r => selection.includes(r.id))
    setDeleted(prev => prev.filter(r => !selection.includes(r.id)))
    setActive(prev => [...selectedRows, ...prev])
    setSelection([])
    openUndo(`Restored ${selectedRows.length} transaction(s)`, { action: 'restoreDeleted', rows: selectedRows }, 'success')
  }

  const bulkPermanentDelete = () => {
    if (tab !== 1 || selection.length === 0) return
    const selectedRows = deleted.filter(r => selection.includes(r.id))
    askPermanentDelete(selectedRows)
  }

  /* --- Year options derived from data --- */
  const yearOptions = useMemo(() => {
    const all = [...active, ...deleted, ...archived]
    const setYears = new Set(all.map(r => String(new Date(r.date).getFullYear())))
    if (setYears.size === 0) {
      return ['2023', '2024', '2025', '2026']
    }
    return Array.from(setYears).sort((a, b) => Number(b) - Number(a))
  }, [active, deleted, archived])

  /* --- Export functions --- */
  const exportCSV = () => {
    const data = filteredRows.map(r => ({
      date: r.date, merchant: r.merchant, country: r.country, amount: r.amount, category: r.category, type: r.type, month: r.month
    }))
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, `transactions_${Date.now()}.csv`)
    handleCloseExport()
  }

  const exportExcel = () => {
    const data = filteredRows.map(r => ({
      Date: r.date, Merchant: r.merchant, Country: r.country, Amount: r.amount, Category: r.category, Type: r.type, Month: r.month
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([wbout], { type: 'application/octet-stream' })
    saveAs(blob, `transactions_${Date.now()}.xlsx`)
    handleCloseExport()
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const head = [['Date', 'Merchant', 'Country', 'Amount', 'Category', 'Type', 'Month']]
    const body = filteredRows.map(r => [r.date, r.merchant, r.country, String(r.amount), r.category, r.type, r.month])
    // @ts-ignore
    doc.autoTable({ head, body, startY: 10, styles: { fontSize: 8 } })
    const blob = doc.output('blob')
    saveAs(blob, `transactions_${Date.now()}.pdf`)
    handleCloseExport()
  }

  /* --- Import handling --- */
  const fileInputRef = React.useRef(null)
  const handleImportClick = () => {
    if (fileInputRef.current) fileInputRef.current.click()
  }
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setImportLoading(true)
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/import', fd)
      if (res.data?.warning) {
        alert(res.data.warning)
      }

      let mapped = (res.data?.transactions || []).map(r => {
        const base = (r && r.date && r.merchant) ? r : mapParsedToTransaction(r)
        const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(base.date || '') ? base.date : (new Date(base.date)).toISOString().slice(0, 10)
        let month = base.month
        if (!month && dateISO) {
          const dt = new Date(dateISO)
          if (!Number.isNaN(dt.getTime())) month = monthOptions[dt.getMonth()]
        }
        const category = normalizeCategory(base.category || detectCategory(base.merchant || '', ''))
        const type = base.type || detectType(category, base.merchant || '', '')
        return { ...base, date: dateISO || '', amount: Number(base.amount) || 0, month: month || '', category, type }
      })

      if (mapped.length === 0 && !res.data?.warning) {
        alert('No transactions found in the file.')
      } else if (mapped.length > 0) {
        setImportPreviewRows(mapped)
        setOpenImportPreview(true)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to import file. See console for details.')
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const importSelectedRows = async (selectedIds) => {
    const toImport = importPreviewRows.filter((r, idx) => selectedIds.includes(idx))
    const payload = toImport.map(r => {
      const base = (r && r.date && r.merchant && r.amount) ? r : mapParsedToTransaction(r)
      const dateISO = /^\d{4}-\d{2}-\d{2}$/.test(base.date || '') ? base.date : (new Date(base.date)).toISOString().slice(0, 10)
      const category = normalizeCategory(base.category || detectCategory(base.merchant || '', ''))
      return {
        date: dateISO || '',
        merchant: base.merchant || '',
        amount: Number(base.amount) || 0,
        currency: (base.currency || 'GBP').toUpperCase(),
        category,
        notes: base.notes || ''
      }
    })
    try {
      const res = await api.post('/transactions/bulk', { transactions: payload })
      if (res.data && res.data.ok) {
        // Optimistically add to local state for immediate UX
        const withIds = toImport.map(base => {
          let month = base.month
          if (!month && base.date) {
            const dt = new Date(base.date)
            if (!Number.isNaN(dt.getTime())) month = monthOptions[dt.getMonth()]
          }
          const category = base.category || detectCategory(base.merchant || '', '')
          const type = base.type || detectType(category, base.merchant || '', '')
          return { ...base, month, category, type, id: Date.now() + Math.floor(Math.random() * 10000) }
        })
        setActive(prev => [...withIds, ...prev])
        openUndo(`Imported ${withIds.length} transaction(s)`, { action: 'import', rows: withIds }, 'success')
        setOpenImportPreview(false)
        setImportPreviewRows([])
      } else {
        console.error('Bulk import failed', res.data)
        alert('Import failed. Please check console.')
      }
    } catch (err) {
      console.error('Bulk import error', err)
      alert('Import error. See console for details.')
    }
  }

  /* --- UI helpers --- */
  const amountFormatter = (v) =>
    Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const TypeChip = ({ t }) => {
    const color = t === 'Income' ? 'success' : t === 'Expense' ? 'error' : 'primary'
    return <Chip label={t} color={color} size="small" variant="outlined" />
  }

  const summary = useMemo(() => {
    const init = {
      Income: { count: 0, total: 0 },
      Expense: { count: 0, total: 0 },
      Savings: { count: 0, total: 0 }
    }
    for (const r of filteredRows) {
      const t = r.type || 'Expense'
      if (!init[t]) init[t] = { count: 0, total: 0 }
      init[t].count += 1
      init[t].total += Number(r.amount) || 0
    }
    return init
  }, [filteredRows])

  const clearFilters = () => {
    setFilterCountries([])
    setFilterMonth('')
    setFilterYear('')
    setSelection([])
  }

  useEffect(() => setSelection([]), [filterCountries, filterMonth, filterYear, tab])

  /* --- Render --- */
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      {/* Top bar */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: COLORS.textPrimary }}>Transactions</Typography>
          <Typography sx={{ color: COLORS.textSecondary }}>Manage income, expenses, savings across countries and time</Typography>
        </Box>

        <Stack direction={isMobile ? 'column' : 'row'} spacing={1} alignItems="center">
          {tab === 0 && (
            <>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenAdd}
                sx={{
                  background: `linear-gradient(90deg, ${COLORS.primaryStart}, ${COLORS.primaryEnd})`,
                  color: '#fff',
                  borderRadius: 2,
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Add
              </Button>

              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                onClick={handleImportClick}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: COLORS.outline,
                  color: COLORS.textPrimary,
                  px: 2,
                  py: 1,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Import
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={handleFileSelected} style={{ display: 'none' }} />
            </>
          )}

          {/* Export header with menu */}
          {tab === 0 && (
            <>
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={handleOpenExport}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: COLORS.outline,
                  color: COLORS.textPrimary,
                  px: 2,
                  py: 1,
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Export
              </Button>
              <Menu anchorEl={exportAnchor} open={openExport} onClose={handleCloseExport}>
                <MenuItem onClick={exportCSV} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, bgcolor: COLORS.csvGreen, borderRadius: 1 }} />
                  CSV
                </MenuItem>
                <MenuItem onClick={exportExcel} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, bgcolor: COLORS.excelGreen, borderRadius: 1 }} />
                  Excel
                </MenuItem>
                <MenuItem onClick={exportPDF} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Box sx={{ width: 10, height: 10, bgcolor: COLORS.pdfRed, borderRadius: 1 }} />
                  PDF
                </MenuItem>
              </Menu>
            </>
          )}

          {tab === 0 && (
            <Button variant="outlined" color="secondary" startIcon={<ArchiveIcon />} onClick={bulkArchive} disabled={!selection.length} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Archive selected
            </Button>
          )}

          {(tab === 0 || tab === 2) && (
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={bulkDelete} disabled={!selection.length} sx={{ borderRadius: 2, textTransform: 'none' }}>
              Delete selected
            </Button>
          )}

          {tab === 1 && (
            <>
              <Button variant="outlined" color="success" startIcon={<RestoreIcon />} onClick={bulkRestore} disabled={!selection.length} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Restore selected
              </Button>
              <Button variant="outlined" color="error" startIcon={<DeleteForeverIcon />} onClick={bulkPermanentDelete} disabled={!selection.length} sx={{ borderRadius: 2, textTransform: 'none' }}>
                Permanently delete selected
              </Button>
            </>
          )}
        </Stack>
      </Box>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => { setTab(v); setSelection([]) }} textColor="inherit" indicatorColor="primary" sx={{ mb: 1 }}>
        <Tab label="Active" />
        <Tab label="Deleted transactions" />
        <Tab label="Archived transactions" />
      </Tabs>

      {/* Summary chips only */}
      <Box sx={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 2, alignItems: 'center', mb: 2, justifyContent: 'flex-end' }}>
        <SummaryCard label="Income" value={amountFormatter(summary.Income.total) + ` (${summary.Income.count})`} icon={<Box sx={{ width: 24, height: 24, bgcolor: 'success.main', borderRadius: '50%' }} />} sx={{ background: 'rgba(255,255,255,0.04)' }} />
        <SummaryCard label="Expense" value={amountFormatter(summary.Expense.total) + ` (${summary.Expense.count})`} icon={<Box sx={{ width: 24, height: 24, bgcolor: 'error.main', borderRadius: '50%' }} />} sx={{ background: 'rgba(255,255,255,0.04)' }} />
        <SummaryCard label="Savings" value={amountFormatter(summary.Savings.total) + ` (${summary.Savings.count})`} icon={<Box sx={{ width: 24, height: 24, bgcolor: 'primary.main', borderRadius: '50%' }} />} sx={{ background: 'rgba(255,255,255,0.04)' }} />
      </Box>

      {/* Table or mobile cards */}
      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
        {!isMobile ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    checked={selection.length === filteredRows.length && filteredRows.length > 0}
                    indeterminate={selection.length > 0 && selection.length < filteredRows.length}
                    onChange={(e) => selectAll(e.target.checked)}
                  />
                </TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Merchant</TableCell>
                <TableCell>Country</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Month</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
              {/* Filter Row */}
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell padding="checkbox" />
                <TableCell sx={{ py: 0.5 }}>
                  <TextField
                    size="small"
                    placeholder="Filter date..."
                    value={filters.date}
                    onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                    sx={modernFieldSx}
                  />
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <TextField
                    size="small"
                    placeholder="Search merchant..."
                    value={filters.merchant}
                    onChange={(e) => setFilters(prev => ({ ...prev, merchant: e.target.value }))}
                    fullWidth
                    sx={modernFieldSx}
                  />
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={filters.country}
                      onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
                      displayEmpty
                      renderValue={(selected) => selected.length === 0 ? 'All' : selected.join(', ')}
                      sx={modernFieldSx}
                    >
                      {allCountries.map(c => (
                        <MenuItem key={c} value={c}>
                          <Checkbox checked={filters.country.indexOf(c) > -1} />
                          <ListItemText primary={c} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <TextField
                      size="small"
                      placeholder="Min"
                      value={filters.amountMin}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMin: e.target.value }))}
                      sx={{ width: 70, ...modernFieldSx }}
                      type="number"
                    />
                    <TextField
                      size="small"
                      placeholder="Max"
                      value={filters.amountMax}
                      onChange={(e) => setFilters(prev => ({ ...prev, amountMax: e.target.value }))}
                      sx={{ width: 70, ...modernFieldSx }}
                      type="number"
                    />
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                      displayEmpty
                      renderValue={(selected) => selected.length === 0 ? 'All' : selected.join(', ')}
                      sx={modernFieldSx}
                    >
                      {categoryOptions.map(c => (
                        <MenuItem key={c} value={c}>
                          <Checkbox checked={filters.category.indexOf(c) > -1} />
                          <ListItemText primary={c} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={filters.type}
                      onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                      displayEmpty
                      renderValue={(selected) => selected.length === 0 ? 'All' : selected.join(', ')}
                    >
                      {typeOptions.map(t => (
                        <MenuItem key={t} value={t}>
                          <Checkbox checked={filters.type.indexOf(t) > -1} />
                          <ListItemText primary={t} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <FormControl size="small" fullWidth>
                    <Select
                      multiple
                      value={filters.month}
                      onChange={(e) => setFilters(prev => ({ ...prev, month: e.target.value }))}
                      displayEmpty
                      renderValue={(selected) => selected.length === 0 ? 'All' : selected.join(', ')}
                    >
                      {monthOptions.map(m => (
                        <MenuItem key={m} value={m}>
                          <Checkbox checked={filters.month.indexOf(m) > -1} />
                          <ListItemText primary={m} />
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="center" sx={{ py: 0.5 }}>
                  <Button
                    size="small"
                    onClick={() => setFilters({ date: '', merchant: '', amountMin: '', amountMax: '', country: [], category: [], type: [], month: [] })}
                    sx={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}
                  >
                    Clear All Filters
                  </Button>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row) => (
                <TableRow
                  key={row.id}
                  hover
                  sx={{
                    '&:hover': {
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease'
                    },
                    '& td': { py: 1 }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox color="primary" checked={selection.includes(row.id)} onChange={() => toggleSelect(row.id)} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{row.date}</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{row.merchant}</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{row.country}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>{amountFormatter(row.amount)}</TableCell>
                  <TableCell sx={{ fontSize: '0.875rem' }}>{row.category}</TableCell>
                  <TableCell><TypeChip t={row.type} /></TableCell>
                  <TableCell>{row.month}</TableCell>
                  <TableCell align="center" sx={{ py: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <IconButton size="small" title="Edit" onClick={() => openEditDialog(row)} sx={{ p: 0.5 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      {tab === 0 && (
                        <>
                          <IconButton size="small" title="Archive" onClick={() => archiveRow(row)} sx={{ p: 0.5 }}>
                            <ArchiveIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title="Delete" onClick={() => deleteRow(row)} sx={{ p: 0.5 }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {tab === 1 && (
                        <>
                          <IconButton size="small" title="Restore" onClick={() => restoreRow(row)} sx={{ p: 0.5 }}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title="Permanently delete" color="error" onClick={() => askPermanentDelete([row])} sx={{ p: 0.5 }}>
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      {tab === 2 && (
                        <>
                          <IconButton size="small" title="Restore" onClick={() => restoreArchived(row)} sx={{ p: 0.5 }}>
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" title="Delete" onClick={() => deleteRow(row)} sx={{ p: 0.5 }}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No transactions match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 2 }}>
            {filteredRows.map(r => (
              <TransactionCard
                key={r.id}
                row={r}
                onEdit={openEditDialog}
                onArchive={archiveRow}
                onDelete={deleteRow}
                onRestore={restoreRow}
                onRestoreArchived={restoreArchived}
                tab={tab}
              />
            ))}
            {filteredRows.length === 0 && (
              <Box sx={{ py: 4, color: COLORS.textSecondary, textAlign: 'center' }}>No transactions match the current filters.</Box>
            )}
          </Box>
        )}
      </TableContainer>

      {/* Add transaction dialog */}
      <Dialog open={openAdd} onClose={handleCloseAdd} fullWidth maxWidth="sm">
        <DialogTitle>Add transaction</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} sx={modernFieldSx} />
          <TextField label="Merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} sx={modernFieldSx} placeholder="e.g., Tesco, Starbucks" />
          <TextField label="Amount" type="number" inputProps={{ step: '0.01' }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={modernFieldSx} placeholder="0.00" helperText="Enter numeric value" />
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: COLORS.inputBg, color: COLORS.textPrimary } } }}>
              {categoryOptions.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: COLORS.inputBg, color: COLORS.textPrimary } } }}>
              {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Country</InputLabel>
            <Select label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: COLORS.inputBg, color: COLORS.textPrimary } } }}>
              {allCountries.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} MenuProps={{ PaperProps: { sx: { bgcolor: COLORS.inputBg, color: COLORS.textPrimary } } }}>
              {monthOptions.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAdd}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} sx={{ background: `linear-gradient(90deg, ${COLORS.primaryStart}, ${COLORS.primaryEnd})`, color: '#fff' }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit transaction dialog */}
      <Dialog open={openEdit} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Edit transaction</DialogTitle>
        <DialogContent dividers sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} sx={modernFieldSx} />
          <TextField label="Merchant" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} sx={modernFieldSx} />
          <TextField label="Amount" type="number" inputProps={{ step: '0.01' }} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} sx={modernFieldSx} />
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Category</InputLabel>
            <Select label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categoryOptions.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Type</InputLabel>
            <Select label="Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {typeOptions.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Country</InputLabel>
            <Select label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
              {allCountries.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ ...modernFieldSx }}>
            <InputLabel>Month</InputLabel>
            <Select label="Month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
              {monthOptions.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} sx={{ background: `linear-gradient(90deg, ${COLORS.primaryStart}, ${COLORS.primaryEnd})`, color: '#fff' }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Import preview dialog */}
      <Dialog open={openImportPreview} onClose={() => setOpenImportPreview(false)} fullWidth maxWidth="lg">
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>Import preview</span>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ minWidth: 150 }}>
                <FormControl fullWidth size="small">
                  <InputLabel id="import-country-label">Country</InputLabel>
                  <Select
                    labelId="import-country-label"
                    value={importCountry}
                    label="Country"
                    onChange={(e) => setImportCountry(e.target.value)}
                  >
                    <MenuItem value="India">India</MenuItem>
                    <MenuItem value="UK">UK</MenuItem>
                    <MenuItem value="USA">USA</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={() => {
                  setImportPreviewRows(prev => prev.map(row => ({ ...row, country: importCountry })))
                }}
              >
                Apply
              </Button>
            </Stack>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2, color: COLORS.textSecondary }}>Review parsed rows, edit if needed, then import selected rows into Transactions.</Box>
          <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Date</TableCell>
                  <TableCell>Merchant</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Month</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {importPreviewRows.map((r, idx) => (
                  <ImportPreviewRow key={idx} idx={idx} row={r} onChange={(newRow) => {
                    setImportPreviewRows(prev => prev.map((x, i) => i === idx ? newRow : x))
                  }} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenImportPreview(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => {
            const ids = importPreviewRows.map((_, i) => i)
            importSelectedRows(ids)
          }}>Import all</Button>
        </DialogActions>
      </Dialog>

      {/* Permanent delete confirmation dialog */}
      <Dialog open={confirmOpen} onClose={cancelPermanentDelete}>
        <DialogTitle>Permanently delete</DialogTitle>
        <DialogContent dividers>
          {confirmTargetRows.length === 1 ? (
            <div>Are you sure you want to permanently delete <strong>{confirmTargetRows[0].merchant}</strong>? This action cannot be undone.</div>
          ) : (
            <div>This action cannot be undone. Do you want to permanently delete <strong>{confirmTargetRows.length}</strong> transaction(s)?</div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelPermanentDelete}>Cancel</Button>
          <Button variant="contained" color="error" onClick={confirmPermanentDelete}>Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Undo snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={closeUndo} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeUndo} severity={snackbar.severity} variant="filled" action={<Button color="inherit" size="small" onClick={undoLast}>Undo</Button>}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Import loading backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={importLoading}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Sorting your financials...
          </Typography>
        </Stack>
      </Backdrop>
    </Box>
  )
}

/* --- Import preview row component (inline editable) --- */
function ImportPreviewRow({ idx, row, onChange }) {
  const [local, setLocal] = useState({ ...row, selected: true })
  useEffect(() => setLocal({ ...row, selected: true }), [row])
  return (
    <TableRow>
      <TableCell padding="checkbox">
        <Checkbox checked={local.selected} onChange={(e) => { setLocal(prev => { const next = { ...prev, selected: e.target.checked }; onChange(next); return next }) }} />
      </TableCell>
      <TableCell>
        <TextField value={local.date || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, date: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 140 }} />
      </TableCell>
      <TableCell>
        <TextField value={local.merchant || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, merchant: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 220 }} />
      </TableCell>
      <TableCell align="right">
        <TextField value={local.amount ?? ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, amount: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 120 }} />
      </TableCell>
      <TableCell>
        <TextField value={local.category || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, category: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 140 }} />
      </TableCell>
      <TableCell>
        <TextField value={local.type || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, type: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 120 }} />
      </TableCell>
      <TableCell>
        <TextField value={local.country || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, country: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 140 }} />
      </TableCell>
      <TableCell>
        <TextField value={local.month || ''} onChange={(e) => { setLocal(prev => { const next = { ...prev, month: e.target.value }; onChange(next); return next }) }} size="small" sx={{ width: 120 }} />
      </TableCell>
    </TableRow>
  )
}
