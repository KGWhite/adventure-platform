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
          mb: 1.25,
        }}
      >
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {hasThreshold
            ? targetRankName
              ? `晉升至 ${targetRankName} 進度`
              : '晉升所需公會功績'
            : '公會最高階級'}
        </Typography>
        <Typography
          variant="h5"
          component="span"
          sx={{
            fontWeight: 900,
            color: 'secondary.main',
            letterSpacing: 0.5,
          }}
        >
          {hasThreshold ? `${currentMerit} / ${promotionThreshold}` : `${currentMerit} (上限)`}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={percentage}
        sx={{
          height: 14,
          borderRadius: 7,
          bgcolor: 'rgba(180, 83, 9, 0.12)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 7,
            background: hasThreshold
              ? 'linear-gradient(90deg, #be123c 0%, #c2410c 50%, #b45309 100%)'
              : 'linear-gradient(90deg, #b45309 0%, #d97706 100%)',
            boxShadow: '0 2px 6px rgba(190, 18, 60, 0.25)',
          },
        }}
      />

      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
          {hasThreshold ? `目前進度 ${percentage}%` : '已達成階級榮譽上限'}
        </Typography>
        {hasThreshold && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            尚需 <Box component="span" sx={{ color: 'secondary.main', fontWeight: 700 }}>{Math.max(0, promotionThreshold - currentMerit)}</Box> 功績
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
