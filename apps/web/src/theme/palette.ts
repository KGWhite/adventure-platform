import type { PaletteOptions } from '@mui/material/styles';

/**
 * Guild Parchment Light Palette
 * Inspired by daytime adventurer guild halls, warm parchment quest sheets,
 * guild seals, and heroic RPG energy.
 */
export const palette: PaletteOptions = {
  mode: 'light',
  primary: {
    main: '#be123c', // Guild Crimson / Adventure Red
    light: '#e11d48',
    dark: '#881337',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#b45309', // Warm Guild Amber / Gold
    light: '#d97706',
    dark: '#78350f',
    contrastText: '#ffffff',
  },
  background: {
    default: '#f8f4eb', // Warm parchment / ivory page foundation
    paper: '#fffdf9', // Clean warm parchment paper surface
  },
  text: {
    primary: '#2d241e', // Deep charcoal warm brown (high readability on parchment)
    secondary: '#6b584a', // Medium roasted warm coffee brown
    disabled: '#a89a8e',
  },
  error: {
    main: '#b91c1c',
    light: '#dc2626',
    dark: '#7f1d1d',
  },
  warning: {
    main: '#c2410c', // Torch Orange
    light: '#ea580c',
    dark: '#7c2d12',
  },
  info: {
    main: '#1d4ed8', // Guild Insignia Royal Blue
    light: '#2563eb',
    dark: '#1e3a8a',
  },
  success: {
    main: '#15803d', // Fresh Adventure Green
    light: '#16a34a',
    dark: '#14532d',
  },
  divider: '#e5dcc7', // Warm parchment border
};
