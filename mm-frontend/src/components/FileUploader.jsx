// src/components/FileUploader.jsx
import React, { useState, useRef } from 'react'
import api from '../Services/api'
import { Box, Button, Typography, CircularProgress, Paper } from '@mui/material'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

export default function FileUploader({ onComplete, country, onLoading }) {
  const [file, setFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile)
      } else {
        onComplete([], new Error('Only PDF files are allowed'))
      }
    }
  }

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const upload = async () => {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    if (country) fd.append('country', country)
    try {
      if (onLoading) onLoading(true)
      const res = await api.post('/import/pdf', fd) // Fixed endpoint path to match backend
      if (res.data.warning) {
        onComplete(res.data.transactions || [], null, res.data.warning)
      } else {
        onComplete(res.data.transactions || [])
      }
    } catch (err) {
      console.error(err)
      onComplete([], err)
    } finally {
      if (onLoading) onLoading(false)
    }
  }

  return (
    <Paper
      variant="outlined"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      sx={{
        p: 4,
        border: '2px dashed',
        borderColor: dragActive ? 'primary.main' : 'divider',
        borderRadius: 2,
        textAlign: 'center',
        bgcolor: dragActive ? 'action.hover' : 'background.paper',
        transition: 'all 0.2s ease',
        cursor: 'pointer'
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <Box sx={{ mb: 2 }}>
        <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="h6" gutterBottom>
          {file ? file.name : 'Drag & Drop PDF here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse
        </Typography>
      </Box>

      {file && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={(e) => { e.stopPropagation(); upload() }}
            startIcon={null}
          >
            Upload & Parse
          </Button>
        </Box>
      )}
    </Paper>
  )
}
