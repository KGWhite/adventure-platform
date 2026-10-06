import { createTheme, type Theme, type ThemeOptions } from '@mui/material/styles';
import { palette } from './palette.js';
import { typography } from './typography.js';

export const baseThemeOptions: ThemeOptions = {
  palette,
  typography,
  shape: {
    borderRadius: 12,
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
          borderRadius: 10,
          fontWeight: 700,
          fontSize: '1rem',
          padding: '10px 20px',
          textTransform: 'none',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        sizeSmall: {
          fontSize: '0.875rem',
          padding: '6px 14px',
          minHeight: 36,
        },
        sizeLarge: {
          fontSize: '1.0625rem',
          padding: '12px 24px',
          minHeight: 48,
        },
        contained: {
          boxShadow: '0 3px 12px rgba(190, 18, 60, 0.28)',
          '&:hover': {
            boxShadow: '0 6px 18px rgba(190, 18, 60, 0.38)',
            transform: 'translateY(-1px)',
          },
        },
        outlined: {
          borderColor: 'rgba(180, 83, 9, 0.38)',
          color: '#be123c',
          '&:hover': {
            borderColor: '#b45309',
            backgroundColor: 'rgba(180, 83, 9, 0.08)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          backgroundImage: 'none',
          backgroundColor: '#fffdf9',
          border: '1px solid #e5dcc7',
          boxShadow: '0 4px 16px -2px rgba(90, 68, 40, 0.07), 0 2px 6px -1px rgba(90, 68, 40, 0.04)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: '#be123c',
            boxShadow: '0 8px 24px -4px rgba(90, 68, 40, 0.12), 0 4px 10px -2px rgba(90, 68, 40, 0.06)',
          },
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
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          fontSize: '0.875rem',
          borderRadius: 8,
        },
        sizeSmall: {
          fontSize: '0.8125rem',
          height: 26,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: '#6b584a',
          '&.Mui-focused': {
            color: '#be123c',
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '1rem',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          borderColor: '#e8dfcb',
          color: '#2d241e',
        },
        head: {
          fontWeight: 700,
          color: '#3d3026',
          fontSize: '0.9375rem',
          backgroundColor: 'rgba(240, 233, 218, 0.55)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          fontWeight: 500,
          borderRadius: 10,
        },
      },
    },
    MuiBottomNavigationAction: {
      styleOverrides: {
        root: {
          color: '#6b584a',
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.875rem',
            fontWeight: 600,
            '&.Mui-selected': {
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#be123c',
            },
          },
          '&.Mui-selected': {
            color: '#be123c',
          },
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
