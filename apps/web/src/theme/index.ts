import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { palette } from './palette.js';
import { typography } from './typography.js';

export const baseThemeOptions: ThemeOptions = {
  palette,
  typography,
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

/**
 * Creates an application theme. Allows passing overrides for future story themes
 * while preserving the shared foundation.
 */
export function createAppTheme(options?: ThemeOptions): Theme {
  return createTheme({
    ...baseThemeOptions,
    ...options,
  });
}

export const theme = createAppTheme();

export * from './palette.js';
export * from './typography.js';
