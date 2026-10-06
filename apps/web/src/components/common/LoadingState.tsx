import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

export interface LoadingStateProps {
  message?: string;
  minHeight?: string | number;
  fullscreen?: boolean;
  sx?: SxProps<Theme>;
}

export function LoadingState({
  message = '載入中...',
  minHeight = 240,
  fullscreen = false,
  sx,
}: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        minHeight: fullscreen ? '100vh' : minHeight,
        p: 3,
        textAlign: 'center',
        ...sx,
      }}
    >
      <CircularProgress color="primary" size={44} />
      {message && (
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
