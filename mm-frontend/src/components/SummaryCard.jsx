// src/components/SummaryCard.jsx
import React from 'react'
import { Paper, Box, Typography } from '@mui/material'

export default function SummaryCard({ label, value, icon, sx = {} }) {
  return (
    <Paper
      elevation={1}
      sx={{
        p: 2,
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: '100%',           // match parent-set height
        minHeight: 0,
        ...sx
      }}
    >
      <Box sx={{ width: 48, height: 48, borderRadius: 1.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Typography noWrap sx={{ color: 'text.secondary', fontSize: 12 }}>{label}</Typography>
        <Typography sx={{ color: 'text.primary', fontWeight: 700, fontSize: 18 }}>{value}</Typography>
      </Box>
    </Paper>
  )
}
