import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface MeritProgressProps {
  currentMerit?: number;
  promotionThreshold?: number | null;
  targetRankName?: string;
}

/**
 * Reusable Guild Merit progress presentation component.
 * Safely handles current merit, promotion threshold, and max rank situations.
 */
export function MeritProgress({
  currentMerit = 0,
  promotionThreshold = null,
  targetRankName,
}: MeritProgressProps) {
  const hasThreshold = typeof promotionThreshold === 'number' && promotionThreshold > 0;
  const percentage = hasThreshold
    ? Math.min(100, Math.round((currentMerit / promotionThreshold) * 100))
    : 100;

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'baseline',
          mb: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          {hasThreshold
            ? targetRankName
              ? `晉升至 ${targetRankName} 進度`
              : '晉升所需公會功績'
            : '公會最高階級'}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>
          {hasThreshold ? `${currentMerit} / ${promotionThreshold}` : `${currentMerit} (上限)`}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: 'rgba(255, 255, 255, 0.08)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 5,
            background: hasThreshold
              ? 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)'
              : 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)',
          },
        }}
      />

      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 0.75,
        }}
      >
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {hasThreshold ? `目前進度 ${percentage}%` : '已達成階級榮譽上限'}
        </Typography>
        {hasThreshold && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            尚需 {Math.max(0, promotionThreshold - currentMerit)} 功績
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
