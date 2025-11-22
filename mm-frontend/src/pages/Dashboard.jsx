// src/pages/Dashboard.jsx
import React, { useMemo, useState, useCallback, useRef, useLayoutEffect } from 'react'
import { useTheme } from '@mui/material/styles'
import {
  Box,
  Grid,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Switch,
  FormControlLabel,
  useMediaQuery,
  Paper
} from '@mui/material'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SavingsIcon from '@mui/icons-material/Savings'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import SummaryCard from '../components/SummaryCard'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts'

/* layout constants you can change in one place */
const CONTENT_MAX_WIDTH = 1200
const TILE_WIDTH = 200
const TILE_HEIGHT = 104
const TILE_GAP = 1
const CHARTS_H_GAP_PX = 10

/* demo data */
const allCountries = ['UK','India','USA','Germany','France','Canada','Australia','Japan','China','Brazil','South Africa','Italy','Spain']
const metrics = ['Income','Expense','Savings','Investment','Transfer to Home','Current Account']

const mockValues = {
  UK: { Income: 4000, Expense: 3200, Savings: 800, Investment: 500, 'Transferred to Home Country': 0, 'Current Account': 2000, currency: 'GBP' },
  India: { Income: 25000, Expense: 12000, Savings: 13000, Investment: 3000, 'Transferred to Home Country': 1800, 'Current Account': 8000, currency: 'INR' },
  USA: { Income: 6000, Expense: 4000, Savings: 2000, Investment: 1000, 'Transferred to Home Country': 0, 'Current Account': 3000, currency: 'USD' }
}

const pieData = [
  { name: 'Food', value: 800 },
  { name: 'Grocery', value: 600 },
  { name: 'Travel', value: 400 },
  { name: 'Leisure', value: 500 },
  { name: 'Investment', value: 900 }
]

const lineData = [
  { month: 'Jan', income: 4000, expense: 2500 },
  { month: 'Feb', income: 4200, expense: 2600 },
  { month: 'Mar', income: 3900, expense: 2400 },
  { month: 'Apr', income: 4500, expense: 2800 },
  { month: 'May', income: 4700, expense: 3000 }
]

const COLORS = ['#22c55e','#3b82f6','#a855f7','#f59e0b','#ef4444']
const currencySymbols = { GBP: '£', USD: '$', INR: '₹', EUR: '€', JPY: '¥', CAD: 'CA$', AUD: 'A$' }

export default function Dashboard() {
  const theme = useTheme()
  const tokens = theme.palette.custom || {
    primaryStart: '#4f46e5', primaryEnd: '#06b6d4',
    csvGreen: '#16a34a', pdfRed: '#ef4444',
    textPrimary: '#E6EEF8', textSecondary: '#9fb0c8', inputBg: '#071226'
  }

  const isXs = useMediaQuery(theme.breakpoints.down('sm'))
  const navigate = useNavigate()

  const [year, setYear] = useState('2025')
  const [month, setMonth] = useState('November')
  const [selectedCountries, setSelectedCountries] = useState([])
  const [conversionEnabled, setConversionEnabled] = useState(false)
  const [baseCurrency, setBaseCurrency] = useState('GBP')
  const [rates] = useState({ INR: 0.0095, USD: 0.82, EUR: 0.86, JPY: 0.0054, CNY: 0.11, BRL: 0.16, ZAR: 0.043, CAD: 0.65, AUD: 0.54 })

  const topRef = useRef(null)
  const [topHeight, setTopHeight] = useState(320)

  useLayoutEffect(() => {
    const measure = () => {
      const h = topRef.current?.offsetHeight || 320
      setTopHeight(h)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const handleCountryChange = (event) => {
    const value = event.target.value
    setSelectedCountries(typeof value === 'string' ? value.split(',') : value)
  }

  const convertValue = useCallback((value, currency) => {
    if (!conversionEnabled) return value
    if (currency === baseCurrency) return value
    const rate = rates[currency]
    return rate ? value * rate : value
  }, [conversionEnabled, baseCurrency, rates])

  const combinedMetrics = useMemo(() => {
    if (!selectedCountries || selectedCountries.length === 0) return null
    const combined = {}
    metrics.forEach(metric => {
      combined[metric] = selectedCountries.reduce((sum, c) => {
        const raw = mockValues[c]?.[metric] ?? 0
        const currency = mockValues[c]?.currency ?? baseCurrency
        return sum + convertValue(raw, currency)
      }, 0)
    })
    return combined
  }, [selectedCountries, convertValue, baseCurrency])

  const format = (n, cur = baseCurrency) => {
    const num = Number(n || 0)
    const symbol = currencySymbols[cur] || ''
    return `${symbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const applyFiltersAndNavigate = useCallback((filters = {}) => {
    const params = new URLSearchParams()
    if (filters.country) params.set('country', filters.country)
    if (filters.countries) params.set('countries', filters.countries.join(','))
    if (filters.category) params.set('category', filters.category)
    if (filters.month) params.set('month', filters.month)
    if (filters.year) params.set('year', filters.year)
    if (filters.base) params.set('base', filters.base)
    const qs = params.toString()
    navigate(`/transactions${qs ? `?${qs}` : ''}`)
  }, [navigate])

  const handlePieClick = useCallback((payload) => {
    if (!payload) return
    const category = payload.name || payload.payload?.name
    const filters = {
      category,
      month,
      year,
      countries: selectedCountries.length ? selectedCountries : undefined,
      base: conversionEnabled ? baseCurrency : undefined
    }
    if (selectedCountries.length === 1) filters.country = selectedCountries[0]
    applyFiltersAndNavigate(filters)
  }, [month, year, selectedCountries, conversionEnabled, baseCurrency, applyFiltersAndNavigate])

  const handleLinePointClick = useCallback((payload) => {
    if (!payload) return
    const clickedMonth = payload.month || month
    const filters = {
      month: clickedMonth,
      year,
      countries: selectedCountries.length ? selectedCountries : undefined,
      base: conversionEnabled ? baseCurrency : undefined
    }
    if (selectedCountries.length === 1) filters.country = selectedCountries[0]
    applyFiltersAndNavigate(filters)
  }, [month, year, selectedCountries, conversionEnabled, baseCurrency, applyFiltersAndNavigate])

  function CustomDot(props) {
    const { cx, cy, payload } = props
    if (cx == null || cy == null) return null
    return (
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill="#22c55e"
        stroke="#fff"
        strokeWidth={1}
        style={{ cursor: 'pointer' }}
        onClick={() => handleLinePointClick(payload)}
      />
    )
  }

  return (
    <Box sx={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
      {/* top area measured dynamically to avoid overlap */}
      <Box ref={topRef} sx={{ px: { xs: 2, md: 3 }, py: 1.5, boxSizing: 'border-box', background: 'transparent' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
            <Typography noWrap sx={{ color: tokens.textPrimary, fontWeight: 700, fontSize: 20, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Dashboard
            </Typography>
            <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: 13, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Overview of your finances
            </Typography>
          </Box>

          <Box sx={{ flexShrink: 0, display: 'flex', gap: 1 }}>
            <Button component={RouterLink} to="/transactions" variant="contained" sx={{ background: `linear-gradient(90deg, ${tokens.primaryStart}, ${tokens.primaryEnd})`, color: '#fff', textTransform: 'none', height: 36 }}>
              Go to Transactions
            </Button>
          </Box>
        </Box>

        <Paper sx={{ p: 1, mb: 1, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel>Year</InputLabel>
              <Select value={year} label="Year" onChange={(e) => setYear(e.target.value)}>
                {['2023','2024','2025'].map(y => <MenuItem key={y} value={y}>{y}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select value={month} label="Month" onChange={(e) => setMonth(e.target.value)}>
                {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Select Countries</InputLabel>
              <Select multiple value={selectedCountries} onChange={handleCountryChange} input={<OutlinedInput label="Select Countries" />} renderValue={(selected) => selected.join(', ')}>
                {allCountries.map(c => (
                  <MenuItem key={c} value={c}>
                    <Checkbox checked={selectedCountries.indexOf(c) > -1} />
                    <ListItemText primary={c} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel control={<Switch checked={conversionEnabled} onChange={() => setConversionEnabled(v => !v)} />} label="Enable conversion" />

            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Base</InputLabel>
              <Select value={baseCurrency} onChange={(e) => setBaseCurrency(e.target.value)} label="Base">
                {['GBP','INR','USD','EUR'].map(cur => <MenuItem key={cur} value={cur}>{cur}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </Paper>

        <Box sx={{ maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', overflow: 'hidden' }}>
          <Grid container spacing={TILE_GAP} wrap="nowrap" sx={{ alignItems: 'stretch' }}>
            {metrics.map(metric => {
              const iconMap = {
                Income: <AccountBalanceWalletIcon sx={{ color: tokens.primaryStart }} />,
                Expense: <TrendingDownIcon sx={{ color: tokens.pdfRed }} />,
                Savings: <SavingsIcon sx={{ color: tokens.csvGreen }} />,
                Investment: <ShowChartIcon sx={{ color: tokens.primaryEnd }} />,
                'Transferred to Home Country': <SwapHorizIcon sx={{ color: tokens.textSecondary }} />,
                'Current Account': <AccountBalanceIcon sx={{ color: tokens.textSecondary }} />
              }
              const value = combinedMetrics ? format(combinedMetrics[metric], baseCurrency) : format(mockValues['UK']?.[metric] ?? 0, mockValues['UK']?.currency ?? baseCurrency)
              return (
                <Grid key={metric} sx={{ width: TILE_WIDTH }}>
                  <SummaryCard label={`${metric} (${combinedMetrics ? baseCurrency : (mockValues['UK']?.currency ?? baseCurrency)})`} value={value} icon={iconMap[metric]} sx={{ height: TILE_HEIGHT }} />
                </Grid>
              )
            })}
          </Grid>
        </Box>
      </Box>

      {/* charts area uses measured topHeight to avoid overlap */}
      <Box sx={{ height: topHeight ? `calc(100vh - ${topHeight}px)` : 'calc(100vh - 320px)', px: { xs: 2, md: 3 }, pb: 1, boxSizing: 'border-box', overflow: 'hidden' }}>
        <Box sx={{ maxWidth: CONTENT_MAX_WIDTH, mx: 'auto', height: '100%' }}>
          <Box sx={{ display: 'flex', gap: `${CHARTS_H_GAP_PX}px`, height: '100%' }}>
            <Paper sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography sx={{ mb: 0.5, color: tokens.textPrimary, fontWeight: 700 }}>Category breakdown</Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" aspect={2}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isXs ? 60 : 120} label onClick={(entry) => handlePieClick(entry)}>
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Paper>

            <Paper sx={{ flex: 1, p: 1.5, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Typography sx={{ mb: 0.5, color: tokens.textPrimary, fontWeight: 700 }}>Income vs expense trend</Typography>
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <ResponsiveContainer width="100%" aspect={2}>
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="month" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#22c55e" dot={<CustomDot />} />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" dot={<CustomDot />} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
