// src/components/AdminReview.jsx
import React, { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Select,
  MenuItem,
  TextField,
  Chip,
  Button,
  Tooltip,
  IconButton,
  Checkbox,
  FormControl,
  InputLabel,
  Stack,
  Divider
} from '@mui/material'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import api from '../Services/api'

const CATEGORIES = ['Food','Grocery','Travel','Leisure','Investment','Salary','Transfer','Bills','Other']

export default function AdminReview({ transactions: initialTxs = [], onSaved }) {
  // original copy for undo
  const [original] = useState(() => initialTxs.map(t => ({ ...t })))
  const [txs, setTxs] = useState(() => initialTxs.map(t => ({ ...t })))
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [bulk, setBulk] = useState({ category: '', type: '', month: '', year: '' })

  const counts = useMemo(() => {
    return txs.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + 1
      return acc
    }, {})
  }, [txs])

  const updateField = (idx, field, value) => {
    setTxs(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  const resetRow = (idx) => {
    setTxs(prev => {
      const copy = [...prev]
      copy[idx] = { ...original[idx] }
      return copy
    })
    setSelected(s => { const n = new Set(s); n.delete(idx); return n })
  }

  const deleteRow = (idx) => {
    setTxs(prev => prev.filter((_, i) => i !== idx))
    // rebuild selected set
    setSelected(s => {
      const n = new Set()
      Array.from(s).forEach(i => { if (i !== idx) n.add(i > idx ? i - 1 : i) })
      return n
    })
  }

  const markCorrect = (idx) => {
    // mark as confirmed by setting a flag; UI can show a green chip
    updateField(idx, 'confirmed', true)
  }

  const toggleSelect = (idx) => {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(idx)) n.delete(idx)
      else n.add(idx)
      return n
    })
  }

  const selectAll = () => {
    if (selected.size === txs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(txs.map((_, i) => i)))
    }
  }

  const applyBulk = () => {
    if (!selected.size) return
    setTxs(prev => {
      const copy = prev.map((r, i) => {
        if (!selected.has(i)) return r
        const updated = { ...r }
        if (bulk.category) updated.category = bulk.category
        if (bulk.month) {
          // try to preserve day and year if present
          const d = new Date(updated.date)
          if (!isNaN(d)) {
            const day = d.getDate()
            const year = bulk.year ? Number(bulk.year) : d.getFullYear()
            updated.date = new Date(year, Number(bulk.month) - 1, day).toISOString().slice(0,10)
          } else {
            // fallback: set to first day of month/year
            if (bulk.year && bulk.month) updated.date = `${bulk.year}-${String(bulk.month).padStart(2,'0')}-01`
          }
        } else if (bulk.year) {
          const d = new Date(updated.date)
          if (!isNaN(d)) {
            const month = d.getMonth() + 1
            const day = d.getDate()
            updated.date = new Date(Number(bulk.year), month - 1, day).toISOString().slice(0,10)
          }
        }
        return updated
      })
      return copy
    })
    // clear bulk inputs after apply
    setBulk({ category: '', type: '', month: '', year: '' })
  }

  const saveAll = async () => {
    setSaving(true)
    try {
      const payload = txs.map(t => ({
        date: t.date,
        merchant: t.merchant,
        amount: Number(t.amount),
        currency: (t.currency || 'GBP').toUpperCase(),
        category: t.category || 'Other',
        notes: t.notes || ''
      }))
      const res = await api.post('/transactions/bulk', { transactions: payload })
      setSaving(false)
      if (res.data?.ok) {
        onSaved && onSaved(res.data)
      } else {
        console.error('Save failed', res.data)
        alert('Save failed. Check console for details.')
      }
    } catch (err) {
      setSaving(false)
      console.error(err)
      alert('Save error. See console.')
    }
  }

  if (!txs.length) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No transactions to review.</Typography>
      </Paper>
    )
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography variant="h6">AI Review</Typography>
            <Typography variant="body2" color="text.secondary">Review and correct transactions before saving.</Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {Object.keys(counts).length ? Object.entries(counts).map(([k,v]) => `${k}: ${v}`).join(' • ') : 'No categories yet'}
            </Typography>

            <Button variant="contained" startIcon={<SaveIcon />} onClick={saveAll} disabled={saving}>
              {saving ? 'Saving...' : 'Save all'}
            </Button>
          </Box>
        </Box>

        {/* Bulk action bar */}
        <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <Checkbox
            checked={selected.size === txs.length}
            indeterminate={selected.size > 0 && selected.size < txs.length}
            onChange={selectAll}
            inputProps={{ 'aria-label': 'select all transactions' }}
          />
          <Typography variant="body2">Select all</Typography>

          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Bulk category</InputLabel>
            <Select value={bulk.category} label="Bulk category" onChange={(e) => setBulk(b => ({ ...b, category: e.target.value }))}>
              <MenuItem value=""><em>—</em></MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField
            size="small"
            label="Month (1-12)"
            value={bulk.month}
            onChange={(e) => setBulk(b => ({ ...b, month: e.target.value.replace(/\D/g,'') }))}
            sx={{ width: 110 }}
          />

          <TextField
            size="small"
            label="Year"
            value={bulk.year}
            onChange={(e) => setBulk(b => ({ ...b, year: e.target.value.replace(/\D/g,'') }))}
            sx={{ width: 110 }}
          />

          <Button variant="outlined" onClick={applyBulk} disabled={!selected.size}>Apply to selected</Button>
        </Box>
      </Paper>

      <Paper sx={{ overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox" width={48} />
              <TableCell width={120}>Date</TableCell>
              <TableCell>Merchant / Description</TableCell>
              <TableCell width={120}>Amount</TableCell>
              <TableCell width={100}>Currency</TableCell>
              <TableCell width={180}>Category (AI)</TableCell>
              <TableCell width={120}>Confidence</TableCell>
              <TableCell width={260}>Notes</TableCell>
              <TableCell width={140}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {txs.map((t, i) => {
              const lowConfidence = typeof t.confidence === 'number' ? t.confidence < 0.5 : false
              return (
                <TableRow
                  key={i}
                  hover
                  sx={{
                    // visual emphasis for low confidence
                    border: lowConfidence ? '1px solid rgba(244,67,54,0.9)' : 'none',
                    boxShadow: lowConfidence ? 'inset 0 0 0 1px rgba(244,67,54,0.06)' : 'none',
                    backgroundColor: lowConfidence ? 'rgba(244,67,54,0.03)' : 'transparent'
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={selected.has(i)} onChange={() => toggleSelect(i)} />
                  </TableCell>

                  <TableCell>{t.date}</TableCell>

                  <TableCell>
                    <Typography noWrap sx={{ maxWidth: 300 }}>{t.merchant}</Typography>
                  </TableCell>

                  <TableCell>
                    <Typography sx={{ fontWeight: 700 }}>{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      value={t.currency || 'GBP'}
                      onChange={(e) => updateField(i, 'currency', e.target.value.toUpperCase())}
                      sx={{ width: 80 }}
                    />
                  </TableCell>

                  <TableCell>
                    <Select
                      size="small"
                      value={t.category || 'Other'}
                      onChange={(e) => updateField(i, 'category', e.target.value)}
                      sx={{ minWidth: 160 }}
                    >
                      {CATEGORIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                    {t.confirmed && <Chip label="Corrected" color="success" size="small" sx={{ ml: 1 }} />}
                  </TableCell>

                  <TableCell>
                    <Tooltip title={`AI confidence: ${typeof t.confidence === 'number' ? (t.confidence * 100).toFixed(0) + '%' : 'N/A'}`}>
                      <Chip
                        label={typeof t.confidence === 'number' ? `${(t.confidence * 100).toFixed(0)}%` : 'N/A'}
                        color={t.confidence >= 0.8 ? 'success' : t.confidence >= 0.5 ? 'warning' : 'default'}
                        size="small"
                      />
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <TextField
                      size="small"
                      fullWidth
                      value={t.notes || ''}
                      onChange={(e) => updateField(i, 'notes', e.target.value)}
                    />
                  </TableCell>

                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <Tooltip title="Mark as correct">
                        <IconButton size="small" onClick={() => markCorrect(i)}><DoneIcon fontSize="small" /></IconButton>
                      </Tooltip>

                      <Tooltip title="Undo to AI">
                        <IconButton size="small" onClick={() => resetRow(i)}><UndoIcon fontSize="small" /></IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => deleteRow(i)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
