// src/components/ColumnChooser.jsx
import React from 'react'
import PropTypes from 'prop-types'
import { Menu, MenuItem, Checkbox, ListItemText, Box, Divider, Typography } from '@mui/material'

export default function ColumnChooser({ anchorEl, open, onClose, columns = [], visible = {}, setVisible }) {
  const allVisible = columns.every(c => !!visible[c.key])
  const someVisible = columns.some(c => !!visible[c.key]) && !allVisible

  const toggleAll = () => {
    const next = {}
    columns.forEach(c => { next[c.key] = !allVisible })
    setVisible(next)
  }

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { minWidth: 220, p: 1 } }}
    >
      <Box sx={{ px: 1, py: 0.5 }}>
        <Typography variant="subtitle2">Columns</Typography>
      </Box>

      <MenuItem onClick={toggleAll} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Checkbox checked={allVisible} indeterminate={someVisible} />
        <ListItemText primary="Toggle all" />
      </MenuItem>

      <Divider sx={{ my: 0.5 }} />

      {columns.map(col => (
        <MenuItem
          key={col.key}
          onClick={() => setVisible(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
        >
          <Checkbox checked={!!visible[col.key]} />
          <ListItemText primary={col.label} />
        </MenuItem>
      ))}
    </Menu>
  )
}

ColumnChooser.propTypes = {
  anchorEl: PropTypes.any,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  columns: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, label: PropTypes.string })),
  visible: PropTypes.object,
  setVisible: PropTypes.func
}
