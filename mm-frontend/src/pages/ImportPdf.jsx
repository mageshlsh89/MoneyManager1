// src/pages/ImportPdf.jsx
import React, { useState } from 'react'
import FileUploader from '../components/FileUploader'
import api from '../Services/api'
import SummaryCard from '../components/SummaryCard'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Button,
  Container,
  Chip,
  Stack,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Backdrop
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import SaveIcon from '@mui/icons-material/Save'

// Modern field style used across forms
const modernFieldSx = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#071226',
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(2,6,23,0.45)',
    '& .MuiInputBase-input': { color: '#E6EEF8', padding: '10px 12px' },
    '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
    '&.Mui-focused': { boxShadow: '0 10px 30px rgba(96,165,250,0.08)', '& fieldset': { borderColor: '#60a5fa', borderWidth: 1.5 } }
  },
  '& .MuiInputLabel-root': { color: '#9fb0c8', fontSize: 13 },
  '& .MuiFormHelperText-root': { color: '#9fb0c8' },
  '& .MuiSelect-select': { color: '#E6EEF8' }
};

export default function ImportPdf() {
  const [country, setCountry] = useState('India')
  const [txs, setTxs] = useState([])
  const [error, setError] = useState(null)
  const [warning, setWarning] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)

  const handleComplete = (transactions, err, warn) => {
    setSuccessMsg(null)
    if (err) {
      setError(err?.response?.data?.error || err?.message || 'Upload failed')
      setTxs([])
      return
    }
    setError(null)
    setWarning(warn || null)

    // Add unique ID for DataGrid
    const rows = transactions.map((t, i) => ({
      id: i,
      ...t,
      amount: typeof t.amount === 'number' ? t.amount : parseFloat(t.amount || 0)
    }))
    setTxs(rows)
  }

  const saveAll = async () => {
    try {
      setSaving(true)
      setError(null)
      // Strip the temporary ID before saving if backend doesn't expect it
      const payload = txs.map(({ id, ...rest }) => rest)
      await api.post('/transactions/bulk', { transactions: payload })
      setSuccessMsg('Transactions saved successfully!')
      setTxs([])
      setWarning(null)
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { field: 'date', headerName: 'Date', width: 120 },
    { field: 'merchant', headerName: 'Description', flex: 1 },
    {
      field: 'amount',
      headerName: 'Amount',
      width: 120,
      type: 'number',
      valueFormatter: (params) => {
        if (params.value == null) return '';
        return `₹${params.value.toLocaleString()}`;
      }
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'Income' ? 'success' : 'default'}
          size="small"
          variant="outlined"
        />
      )
    },
    {
      field: 'category',
      headerName: 'Category',
      width: 150,
      renderCell: (params) => (
        <Chip label={params.value} size="small" />
      )
    }
  ]

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Import Transactions
      </Typography>

      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
              Upload Statement
            </Typography>
            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth size="small" sx={modernFieldSx}>
                <InputLabel id="country-select-label">Country</InputLabel>
                <Select
                  labelId="country-select-label"
                  id="country-select"
                  value={country}
                  label="Country"
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <MenuItem value="India">India</MenuItem>
                  <MenuItem value="UK">UK</MenuItem>
                  <MenuItem value="USA">USA</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your bank statement PDF to automatically parse transactions.
          </Typography>

          <FileUploader onComplete={handleComplete} country={country} onLoading={setLoading} />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {warning && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {warning}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMsg}
            </Alert>
          )}
        </CardContent>
      </Card>

      {txs.length > 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6">
                Preview ({txs.length} transactions)
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="preview-country-select-label">Country</InputLabel>
                    <Select
                      labelId="preview-country-select-label"
                      id="preview-country-select"
                      value={country}
                      label="Country"
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <MenuItem value="India">India</MenuItem>
                      <MenuItem value="UK">UK</MenuItem>
                      <MenuItem value="USA">USA</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                {/* Summary cards for preview totals */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <SummaryCard
                    label="Total Amount"
                    value={txs.reduce((sum, r) => sum + Number(r.amount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    icon={<Box sx={{ width: 24, height: 24, bgcolor: 'primary.main', borderRadius: '50%' }} />}
                    sx={{ background: 'rgba(255,255,255,0.04)' }}
                  />
                  <SummaryCard
                    label="Count"
                    value={txs.length}
                    icon={<Box sx={{ width: 24, height: 24, bgcolor: 'secondary.main', borderRadius: '50%' }} />}
                    sx={{ background: 'rgba(255,255,255,0.04)' }}
                  />
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={saveAll}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save All'}
                </Button>
              </Stack>
            </Stack>

            <Box sx={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={txs}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 10 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                checkboxSelection
                disableRowSelectionOnClick
                sx={{
                  border: 'none',
                  '& .MuiDataGrid-cell:hover': {
                    color: 'primary.main',
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={loading}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="inherit" size={60} thickness={4} />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Sorting your financials...
          </Typography>
        </Stack>
      </Backdrop>
    </Container>
  )
}
