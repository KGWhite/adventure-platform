import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function PageHeader({ title, subtitle, badge, action, sx }: PageHeaderProps) {
  return (
    <Box sx={{ mb: { xs: 2.5, sm: 3.5 }, ...sx }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Box>
          {badge && <Box sx={{ mb: 1 }}>{badge}</Box>}
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              color: 'text.primary',
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.65rem', sm: '2rem' },
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body1"
              sx={{
                color: 'text.secondary',
                mt: 0.75,
                fontSize: { xs: '0.95rem', sm: '1.0625rem' },
                lineHeight: 1.6,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ alignSelf: { xs: 'stretch', sm: 'auto' } }}>{action}</Box>}
      </Stack>
    </Box>
  );
}
