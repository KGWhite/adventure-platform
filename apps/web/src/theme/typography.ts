import type { TypographyVariantsOptions } from '@mui/material/styles';

export const typography: TypographyVariantsOptions = {
  fontFamily: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(','),
  h1: {
    fontSize: '2.25rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
  },
  h2: {
    fontSize: '1.875rem',
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: '-0.015em',
  },
  h3: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h4: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.35,
  },
  h5: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.45,
  },
  body1: {
    fontSize: '0.9375rem',
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.8125rem',
    lineHeight: 1.5,
  },
  button: {
    textTransform: 'none',
    fontWeight: 600,
  },
};
