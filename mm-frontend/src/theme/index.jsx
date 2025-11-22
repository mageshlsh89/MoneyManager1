// src/theme/index.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material'

// Central color tokens used across the app
const TOKENS = {
  light: {
    primaryStart: '#2563eb',
    primaryEnd: '#06b6d4',
    csvGreen: '#16a34a',
    excelGreen: '#15803d',
    pdfRed: '#ef4444',
    textPrimary: '#0b1220',
    textSecondary: '#374151',
    inputBg: '#ffffff',
    panelBg: '#f8fafc',
    surface: '#ffffff'
  },
  dark: {
    primaryStart: '#4f46e5',
    primaryEnd: '#06b6d4',
    csvGreen: '#16a34a',
    excelGreen: '#15803d',
    pdfRed: '#ef4444',
    textPrimary: '#E6EEF8',
    textSecondary: '#9fb0c8',
    inputBg: '#071226',
    panelBg: '#061428',
    surface: '#0b1220'
  }


}

const getDesignTokens = (mode) => {
  const t = TOKENS[mode]
  return {
    palette: {
      mode,
      primary: { main: t.primaryStart },
      background: { default: t.panelBg, paper: t.surface },
      text: { primary: t.textPrimary, secondary: t.textSecondary },
      custom: t
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            transition: 'transform 160ms ease, box-shadow 160ms ease',
            '&:hover': { transform: 'translateY(-2px)' }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: { transition: 'box-shadow 160ms ease' }
        }
      },
      MuiTableRow: {
        styleOverrides: {
          root: { transition: 'background-color 120ms ease' }
        }
      }
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
    }
  }
}

const ThemeModeContext = createContext({ mode: 'dark', toggleMode: () => {} })

export const useThemeMode = () => useContext(ThemeModeContext)

export default function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('mm_theme') || 'dark' } catch { return 'dark' }
  })

  useEffect(() => {
    try { localStorage.setItem('mm_theme', mode) } catch {}
  }, [mode])

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode])

  const toggleMode = (next) => {
    setMode(prev => next || (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeModeContext.Provider>
  )
}

