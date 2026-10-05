import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import type { SxProps, Theme } from '@mui/material/styles';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  sx?: SxProps<Theme>;
}

export function EmptyState({
  icon = <InboxOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary' }} />,
  title,
  description,
  action,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: { xs: 3, sm: 5 },
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        gap: 1.5,
        ...sx,
      }}
    >
      {icon && <Box sx={{ mb: 1, color: 'text.secondary' }}>{icon}</Box>}
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  );
}
