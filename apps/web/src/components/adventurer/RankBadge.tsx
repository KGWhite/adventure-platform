import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import type { Rank } from '../../types/auth.js';

export interface RankBadgeProps {
  rank?: Rank | null;
  size?: 'small' | 'medium';
  showName?: boolean;
}

/**
 * Reusable rank presentation component.
 * Fully database-driven: consumes rank data without hard-coding progression logic.
 */
export function RankBadge({ rank, size = 'medium', showName = true }: RankBadgeProps) {
  const code = rank?.code || '無';
  const name = rank?.name;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      <Chip
        label={code}
        color="secondary"
        size={size}
        sx={{
          fontWeight: 700,
          letterSpacing: '0.05em',
          fontSize: size === 'small' ? '0.75rem' : '0.875rem',
          minWidth: size === 'small' ? 32 : 40,
        }}
      />
      {showName && name && (
        <Typography
          variant={size === 'small' ? 'caption' : 'body2'}
          sx={{ color: 'text.secondary', fontWeight: 500 }}
        >
          {name}
        </Typography>
      )}
    </Box>
  );
}
