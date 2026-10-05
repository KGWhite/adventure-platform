import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import type { SxProps, Theme } from '@mui/material/styles';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  sx?: SxProps<Theme>;
}

export function ErrorState({
  title = '發生錯誤',
  message,
  onRetry,
  retryText = '重試',
  sx,
}: ErrorStateProps) {
  return (
    <Box sx={{ my: 2, ...sx }}>
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" size="small" onClick={onRetry}>
              {retryText}
            </Button>
          )
        }
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  );
}
