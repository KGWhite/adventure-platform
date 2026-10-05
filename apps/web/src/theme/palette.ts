import type { PaletteOptions } from '@mui/material/styles';

export const palette: PaletteOptions = {
  mode: 'dark',
  primary: {
    main: '#6366f1',
    light: '#818cf8',
    dark: '#4f46e5',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    contrastText: '#0f172a',
  },
  background: {
    default: '#0a0d14',
    paper: '#111726',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
    disabled: '#64748b',
  },
  error: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
  },
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
  },
  info: {
    main: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0284c7',
  },
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
};
