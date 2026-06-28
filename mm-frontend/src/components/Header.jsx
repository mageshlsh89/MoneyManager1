// src/components/Header.jsx - NESTGrow Premium Header
import React, { useState } from 'react'
import { AppBar, Toolbar, Button, IconButton, Box, Typography, Avatar, Menu, MenuItem, Divider } from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import Brightness4Icon from '@mui/icons-material/Brightness4'
import Brightness7Icon from '@mui/icons-material/Brightness7'
import LogoutIcon from '@mui/icons-material/Logout'
import SettingsIcon from '@mui/icons-material/Settings'
import { useThemeMode } from '../theme'

const STORAGE_KEYS = {
  CURRENT: 'mm_currentUser'
}

export default function Header() {
  const { mode, toggleMode } = useThemeMode() || { mode: 'dark', toggleMode: () => {} }
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState(null)
  
  // Get current user from localStorage
  const currentUser = React.useMemo(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEYS.CURRENT)
      return s ? JSON.parse(s) : null
    } catch {
      return null
    }
  }, [])

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)
  
  const handleLogout = () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CURRENT)
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT)
    } catch {}
    handleMenuClose()
    navigate('/auth')
  }

  const tokens = {
    primaryStart: '#4f46e5',
    primaryEnd: '#06b6d4',
    textPrimary: '#E6EEF8',
    textSecondary: '#9fb0c8'
  }

  return (
    <AppBar 
      position="sticky" 
      elevation={0} 
      sx={{ 
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)'
      }}
    >
      <Toolbar sx={{ display: 'flex', gap: 2, maxWidth: 1400, mx: 'auto', width: '100%', px: { xs: 2, md: 3 } }}>
        {/* Logo with gradient */}
        <Box 
          component={RouterLink} 
          to="/" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1.5,
            textDecoration: 'none',
            '&:hover': { opacity: 0.9 }
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${tokens.primaryStart}, ${tokens.primaryEnd})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)'
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: 20 }}>N</Typography>
          </Box>
          <Box>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 800,
                background: `linear-gradient(90deg, ${tokens.primaryStart}, ${tokens.primaryEnd})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1.1
              }}
            >
              NESTGrow
            </Typography>
            <Typography sx={{ fontSize: 10, color: tokens.textSecondary, letterSpacing: 1.5, lineHeight: 1 }}>
              COPILLOT 2025
            </Typography>
          </Box>
        </Box>

        {/* Navigation - Centered */}
        <Box sx={{ ml: 4, display: 'flex', gap: 1 }}>
          <Button 
            component={RouterLink} 
            to="/dashboard" 
            sx={{ 
              color: tokens.textSecondary,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              px: 2,
              borderRadius: 2,
              '&:hover': { 
                background: 'rgba(79, 70, 229, 0.1)',
                color: tokens.primaryStart
              }
            }}
          >
            Dashboard
          </Button>
          <Button 
            component={RouterLink} 
            to="/transactions" 
            sx={{ 
              color: tokens.textSecondary,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 14,
              px: 2,
              borderRadius: 2,
              '&:hover': { 
                background: 'rgba(79, 70, 229, 0.1)',
                color: tokens.primaryStart
              }
            }}
          >
            Transactions
          </Button>
        </Box>

        {/* Right side actions */}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Theme Toggle */}
          <IconButton 
            onClick={() => toggleMode()} 
            sx={{ 
              color: tokens.textSecondary,
              '&:hover': { 
                background: 'rgba(79, 70, 229, 0.15)',
                color: tokens.primaryEnd
              }
            }}
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* User Menu or Login Button */}
          {currentUser ? (
            <>
              <IconButton 
                onClick={handleMenuOpen}
                sx={{ 
                  ml: 1,
                  '&:hover': { 
                    background: 'rgba(79, 70, 229, 0.15)'
                  }
                }}
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: `linear-gradient(135deg, ${tokens.primaryStart}, ${tokens.primaryEnd})`,
                    border: '2px solid rgba(79, 70, 229, 0.3)'
                  }}
                >
                  {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  elevation: 8,
                  sx: {
                    mt: 1.5,
                    minWidth: 200,
                    bgcolor: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 3,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.4)'
                  }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography sx={{ fontWeight: 700, color: tokens.textPrimary, fontSize: 15 }}>
                    {currentUser.name}
                  </Typography>
                  <Typography sx={{ color: tokens.textSecondary, fontSize: 12 }}>
                    {currentUser.email}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                <MenuItem onClick={() => { handleMenuClose(); navigate('/dashboard'); }} sx={{ py: 1.2, px: 2 }}>
                  <SettingsIcon sx={{ mr: 1.5, fontSize: 18, color: tokens.textSecondary }} />
                  <Typography sx={{ fontSize: 14, color: tokens.textPrimary }}>Settings</Typography>
                </MenuItem>
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.06)' }} />
                <MenuItem onClick={handleLogout} sx={{ py: 1.2, px: 2 }}>
                  <LogoutIcon sx={{ mr: 1.5, fontSize: 18, color: '#ef4444' }} />
                  <Typography sx={{ fontSize: 14, color: '#ef4444' }}>Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button 
              component={RouterLink} 
              to="/auth" 
              variant="contained"
              sx={{ 
                ml: 1,
                background: `linear-gradient(90deg, ${tokens.primaryStart}, ${tokens.primaryEnd})`,
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 14,
                px: 2.5,
                py: 1,
                borderRadius: 3,
                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.3)',
                '&:hover': { 
                  boxShadow: '0 6px 20px rgba(79, 70, 229, 0.4)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Sign In
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  )
}
