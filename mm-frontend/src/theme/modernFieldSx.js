// src/theme/modernFieldSx.js
// Centralized styling for form fields (glass‑morphism, dark mode)
import { COLORS } from './tokens'; // assuming tokens are exported from a file; if not, define inline

export const modernFieldSx = {
    '& .MuiOutlinedInput-root': {
        backgroundColor: COLORS.inputBg,
        borderRadius: 8,
        boxShadow: '0 6px 18px rgba(2,6,23,0.45)',
        '& .MuiInputBase-input': { color: COLORS.textPrimary, padding: '10px 12px' },
        '& fieldset': { borderColor: 'rgba(255,255,255,0.06)' },
        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.14)' },
        '&.Mui-focused': {
            boxShadow: '0 10px 30px rgba(96,165,250,0.08)',
            '& fieldset': { borderColor: '#60a5fa', borderWidth: 1.5 },
        },
    },
    '& .MuiInputLabel-root': { color: COLORS.textSecondary, fontSize: 13 },
    '& .MuiFormHelperText-root': { color: COLORS.textSecondary },
    '& .MuiSelect-select': { color: COLORS.textPrimary },
};
