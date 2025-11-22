// src/pages/Login_Signup.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { modernFieldSx } from '../theme/modernFieldSx';
import {
  Box, Paper, Avatar, Typography, Tabs, Tab, Divider,
  TextField, Button, IconButton, InputAdornment, FormControlLabel,
  Checkbox, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert,
  useTheme, useMediaQuery
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import GoogleIcon from '@mui/icons-material/Google'

/* --- Local storage helpers --- */
const safeParse = (s, fallback) => {
  try { const v = JSON.parse(s); return v ?? fallback } catch { return fallback }
}
const saveJSON = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { }
}
const loadJSON = (key, fallback) => safeParse(localStorage.getItem(key), fallback)

/* --- Storage keys --- */
const STORAGE_KEYS = {
  USERS: 'mm_users',
  CURRENT: 'mm_currentUser'
}

/* --- Countries list --- */
const allCountries = [
  'UK', 'India', 'USA', 'Germany', 'France', 'Canada', 'Australia',
  'Japan', 'China', 'Brazil', 'South Africa', 'Italy', 'Spain'
]

/* --- Color tokens and shared styles --- */
const COLORS = {
  primaryStart: '#4f46e5',
  primaryEnd: '#06b6d4',
  googleRed: '#DB4437',
  outline: 'rgba(255,255,255,0.08)',
  textPrimary: '#E6EEF8',
  textSecondary: '#9fb0c8',
  inputBg: '#071226',
  panelBg: '#061428'
}

// Import shared modernFieldSx
import { modernFieldSx } from '../theme/modernFieldSx';
'& .MuiOutlinedInput-root': {
  backgroundColor: COLORS.inputBg,
    borderRadius: 8,
      boxShadow: '0 6px 18px rgba(2,6,23,0.45)',
        '& .MuiInputBase-input': { color: COLORS.textPrimary, padding: '12px 12px' },
  '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
  '&.Mui-focused': { boxShadow: '0 10px 30px rgba(96,165,250,0.08)', '& fieldset': { borderColor: '#60a5fa', borderWidth: 1.5 } }
},
'& .MuiInputLabel-root': { color: COLORS.textSecondary, fontSize: 13 },
'& .MuiFormHelperText-root': { color: COLORS.textSecondary },
'& .MuiSelect-select': { color: COLORS.textPrimary }
}

/* --- Email regex --- */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginSignup() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [tab, setTab] = useState(0) // 0 = Login, 1 = Signup

  // login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '', remember: true })
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // signup form
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirm: '', country: '' })
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirm, setShowSignupConfirm] = useState(false)

  // users and current user
  const [users, setUsers] = useState(() => loadJSON(STORAGE_KEYS.USERS, []))
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEYS.CURRENT)
      if (s) return JSON.parse(s)
    } catch { }
    return loadJSON(STORAGE_KEYS.CURRENT, null)
  })

  // UI
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' })
  const [errors, setErrors] = useState({})

  useEffect(() => { saveJSON(STORAGE_KEYS.USERS, users) }, [users])
  useEffect(() => { saveJSON(STORAGE_KEYS.CURRENT, currentUser) }, [currentUser])

  const openSnack = (message, severity = 'success') => setSnackbar({ open: true, message, severity })
  const closeSnack = () => setSnackbar(prev => ({ ...prev, open: false }))

  const persistCurrentUser = (user, remember) => {
    setCurrentUser(user)
    try {
      if (remember) saveJSON(STORAGE_KEYS.CURRENT, user)
      else {
        sessionStorage.setItem(STORAGE_KEYS.CURRENT, JSON.stringify(user))
        try { localStorage.removeItem(STORAGE_KEYS.CURRENT) } catch { }
      }
    } catch { }
  }

  const clearCurrentUser = () => {
    setCurrentUser(null)
    try { localStorage.removeItem(STORAGE_KEYS.CURRENT) } catch { }
    try { sessionStorage.removeItem(STORAGE_KEYS.CURRENT) } catch { }
  }

  /* --- Validation & flows --- */
  const validateSignup = () => {
    const e = {}
    if (!signupForm.name.trim()) e.name = 'Full name is required'
    if (!signupForm.email.trim()) e.email = 'Email is required'
    else if (!emailRegex.test(signupForm.email.trim())) e.email = 'Invalid email'
    if (!signupForm.password) e.password = 'Password is required'
    else if (signupForm.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (signupForm.password !== signupForm.confirm) e.confirm = 'Passwords do not match'
    if (!signupForm.country) e.country = 'Country is required'
    if (users.some(u => u.email.toLowerCase() === signupForm.email.trim().toLowerCase())) e.email = 'An account with this email already exists'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSignup = (ev) => {
    ev?.preventDefault?.()
    if (!validateSignup()) { openSnack('Please fix errors', 'error'); return }
    const newUser = {
      id: Date.now(),
      name: signupForm.name.trim(),
      email: signupForm.email.trim().toLowerCase(),
      password: signupForm.password,
      country: signupForm.country,
      createdAt: new Date().toISOString()
    }
    setUsers(prev => [newUser, ...prev])
    persistCurrentUser({ id: newUser.id, name: newUser.name, email: newUser.email, country: newUser.country }, true)
    openSnack('Account created and signed in', 'success')
    setSignupForm({ name: '', email: '', password: '', confirm: '', country: '' })
    setErrors({})
    setTab(0)
  }

  const validateLogin = () => {
    const e = {}
    if (!loginForm.email.trim()) e.email = 'Email is required'
    else if (!emailRegex.test(loginForm.email.trim())) e.email = 'Invalid email'
    if (!loginForm.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = (ev) => {
    ev?.preventDefault?.()
    if (!validateLogin()) { openSnack('Please fix errors', 'error'); return }
    const found = users.find(u => u.email === loginForm.email.trim().toLowerCase() && u.password === loginForm.password)
    if (!found) { openSnack('Invalid credentials', 'error'); return }
    persistCurrentUser({ id: found.id, name: found.name, email: found.email, country: found.country }, loginForm.remember)
    openSnack(`Welcome back, ${found.name}`, 'success')
    setLoginForm(prev => ({ ...prev, password: '' }))
    setErrors({})
  }

  const handleLogout = () => {
    clearCurrentUser()
    openSnack('Signed out', 'info')
  }

  const passwordStrength = useMemo(() => {
    const p = signupForm.password || ''
    if (p.length >= 12 && /[A-Z]/.test(p) && /\d/.test(p) && /[^A-Za-z0-9]/.test(p)) return 'Strong'
    if (p.length >= 8) return 'Medium'
    if (p.length > 0) return 'Weak'
    return ''
  }, [signupForm.password])

  const fieldError = (name) => errors[name] ? { error: true, helperText: errors[name] } : {}

  /* --- Button styles --- */
  const primaryButtonSx = {
    background: `linear-gradient(90deg, ${COLORS.primaryStart}, ${COLORS.primaryEnd})`,
    color: '#fff',
    textTransform: 'none',
    px: 3,
    py: 1,
    borderRadius: 2,
    boxShadow: '0 8px 20px rgba(79,70,229,0.12)',
    '&:hover': { filter: 'brightness(1.03)' }
  }

  const googleButtonSx = {
    textTransform: 'none',
    borderColor: COLORS.outline,
    color: '#fff',
    bgcolor: 'rgba(255,255,255,0.02)',
    px: 2,
    py: 1,
    borderRadius: 2,
    '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' }
  }

  const textButtonSx = {
    textTransform: 'none',
    color: COLORS.primaryEnd,
    fontWeight: 600,
    minWidth: 0
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#041022', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper
        elevation={10}
        sx={{
          width: '100%',
          maxWidth: 980,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: COLORS.panelBg
        }}
      >
        {/* Left column: forms */}
        <Box sx={{ width: { xs: '100%', md: 460 }, p: { xs: 3, md: 4 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: COLORS.primaryStart }}><LockOutlinedIcon /></Avatar>
            <Box>
              <Typography variant="h6" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>Welcome</Typography>
              <Typography variant="body2" sx={{ color: COLORS.textSecondary }}>Sign in or create an account to continue</Typography>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => { setTab(v); setErrors({}) }} sx={{ mt: 1, '& .MuiTab-root': { color: '#cfe8ff' } }}>
            <Tab label="Login" />
            <Tab label="Signup" />
          </Tabs>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />

          {tab === 0 && (
            <Box component="form" onSubmit={handleLogin} sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField
                label="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('email')}
              />
              <TextField
                label="Password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('password')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowLoginPassword(s => !s)} edge="end" sx={{ color: COLORS.textSecondary }}>
                        {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FormControlLabel
                  control={<Checkbox checked={loginForm.remember} onChange={(e) => setLoginForm(prev => ({ ...prev, remember: e.target.checked }))} sx={{ color: COLORS.textSecondary }} />}
                  label={<Typography sx={{ color: COLORS.textSecondary }}>Remember me</Typography>}
                />
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  <Button
                    onClick={() => openSnack('Forgot password flow placeholder', 'info')}
                    size="small"
                    variant="text"
                    sx={{ ...textButtonSx }}
                  >
                    Forgot password
                  </Button>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row', mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ ...primaryButtonSx, width: isMobile ? '100%' : 'auto' }}
                  aria-label="Sign in"
                >
                  Sign in
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon sx={{ color: COLORS.googleRed }} />}
                  onClick={() => openSnack('Google sign-in placeholder', 'info')}
                  sx={{ ...googleButtonSx, width: isMobile ? '100%' : 'auto' }}
                  aria-label="Sign in with Google"
                >
                  Sign in with Google
                </Button>
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box component="form" onSubmit={handleSignup} sx={{ display: 'grid', gap: 2, mt: 1 }}>
              <TextField
                label="Full name"
                value={signupForm.name}
                onChange={(e) => setSignupForm(prev => ({ ...prev, name: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('name')}
              />
              <TextField
                label="Email"
                value={signupForm.email}
                onChange={(e) => setSignupForm(prev => ({ ...prev, email: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('email')}
              />
              <TextField
                label="Password"
                type={showSignupPassword ? 'text' : 'password'}
                value={signupForm.password}
                onChange={(e) => setSignupForm(prev => ({ ...prev, password: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('password')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowSignupPassword(s => !s)} edge="end" sx={{ color: COLORS.textSecondary }}>
                        {showSignupPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                helperText={signupForm.password ? `Strength: ${passwordStrength}` : ''}
              />
              <TextField
                label="Confirm password"
                type={showSignupConfirm ? 'text' : 'password'}
                value={signupForm.confirm}
                onChange={(e) => setSignupForm(prev => ({ ...prev, confirm: e.target.value }))}
                sx={modernFieldSx}
                fullWidth
                {...fieldError('confirm')}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowSignupConfirm(s => !s)} edge="end" sx={{ color: COLORS.textSecondary }}>
                        {showSignupConfirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />

              <FormControl sx={modernFieldSx}>
                <InputLabel>Country</InputLabel>
                <Select
                  value={signupForm.country}
                  onChange={(e) => setSignupForm(prev => ({ ...prev, country: e.target.value }))}
                  label="Country"
                >
                  <MenuItem value="">Select country</MenuItem>
                  {allCountries.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row', mt: 1 }}>
                <Button
                  type="submit"
                  variant="contained"
                  sx={{ ...primaryButtonSx, width: isMobile ? '100%' : 'auto' }}
                >
                  Create account
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<GoogleIcon sx={{ color: COLORS.googleRed }} />}
                  onClick={() => openSnack('Google signup placeholder', 'info')}
                  sx={{ ...googleButtonSx, width: isMobile ? '100%' : 'auto' }}
                >
                  Sign up with Google
                </Button>
              </Box>
            </Box>
          )}

          <Typography variant="caption" sx={{ color: COLORS.textSecondary, mt: 2 }}>
            This demo stores users locally in your browser for convenience. For production, replace localStorage logic with secure server APIs and hashed passwords.
          </Typography>
        </Box>

        {/* Right column: info or signed-in view */}
        <Box sx={{ flex: 1, p: { xs: 3, md: 4 }, bgcolor: 'transparent', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
          {!currentUser ? (
            <>
              <Typography variant="h5" sx={{ color: COLORS.textPrimary, fontWeight: 700 }}>Manage your money</Typography>
              <Typography sx={{ color: COLORS.textSecondary, textAlign: 'center' }}>
                Track income, expenses and savings. Sign up to sync across devices when backend is connected.
              </Typography>
              <Box sx={{ mt: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{
                  width: 240, height: 140, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textSecondary, px: 2, textAlign: 'center'
                }}>
                  <Typography sx={{ fontSize: 13 }}>Securely store and categorize transactions. Connect accounts when ready.</Typography>
                </Box>
              </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ color: COLORS.textPrimary }}>Signed in</Typography>
              <Typography sx={{ color: COLORS.textSecondary }}>{currentUser.name}</Typography>
              <Typography sx={{ color: COLORS.textSecondary }}>{currentUser.email}</Typography>
              <Typography sx={{ color: COLORS.textSecondary }}>{currentUser.country}</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Button variant="contained" onClick={handleLogout} sx={{ ...primaryButtonSx, px: 2 }}>Logout</Button>
              </Box>
            </>
          )}
        </Box>
      </Paper>

      <Snackbar open={snackbar.open} autoHideDuration={4500} onClose={closeSnack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnack} severity={snackbar.severity} variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
