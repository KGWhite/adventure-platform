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
 * Resembles a Guild Seal / Adventurer Medal on parchment.
 */
export function RankBadge({ rank, size = 'medium', showName = true }: RankBadgeProps) {
  const code = rank?.code || '無';
  const name = rank?.name;

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1.25 }}>
      <Chip
        label={code}
        size={size}
        sx={{
          fontWeight: 900,
          letterSpacing: '0.04em',
          fontSize: size === 'small' ? '0.875rem' : '1.05rem',
          minWidth: size === 'small' ? 36 : 46,
          height: size === 'small' ? 28 : 36,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #be123c 0%, #c2410c 55%, #b45309 100%)',
          color: '#ffffff',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
          boxShadow: '0 2px 8px rgba(190, 18, 60, 0.28)',
          border: '1.5px solid #fef08a',
        }}
      />
      {showName && name && (
        <Typography
          variant={size === 'small' ? 'body2' : 'body1'}
          sx={{
            color: 'text.primary',
            fontWeight: 800,
            fontSize: size === 'small' ? '0.95rem' : '1.1rem',
            letterSpacing: '0.02em',
          }}
        >
          {name}
        </Typography>
      )}
    </Box>
  );
}
