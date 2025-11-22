// src/components/Header.jsx
import React from 'react'
import { AppBar, Toolbar, Button, IconButton, Box, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import { useThemeMode } from '../theme'

export default function Header() {
  const { toggleMode } = useThemeMode() || { toggleMode: () => {} }

  return (
    <AppBar position="sticky" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Toolbar sx={{ display: 'flex', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Money Manager
        </Typography>

        {/* Push nav to the right */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button component={RouterLink} to="/dashboard" color="inherit" sx={{ textTransform: 'none' }}>
            Dashboard
          </Button>
          <Button component={RouterLink} to="/transactions" color="inherit" sx={{ textTransform: 'none' }}>
            Transactions
          </Button>
          <Button component={RouterLink} to="/auth" color="inherit" sx={{ textTransform: 'none' }}>
            Login/SignUP
          </Button>

          <IconButton onClick={() => toggleMode()} aria-label="toggle theme" sx={{ ml: 1 }}>
            <Brightness4Icon />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  )
}
