import { useEffect, useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import { useNavigation } from '../router/Router.js';
import { API_BASE_URL } from '../context/AuthContext.js';
import { PageHeader, EmptyState, ErrorState } from './common/index.js';
import type { Quest } from '../types/quest.js';

/**
 * Read-only quest notice board.
 * Quests are accepted and claimed at the Guild Terminal (/guild) by scanning
 * the adventurer's credential; progress is updated by the server.
 */
export function AdventurerQuestsView() {
  const { navigate } = useNavigation();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/quests`);
      if (!res.ok) {
        throw new Error(`任務清單載入失敗 (HTTP ${res.status})`);
      }
      const data: Quest[] = await res.json();
      setQuests(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '連線逾時或網路錯誤，請稍後再試。');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="公會任務告示欄"
        subtitle="承接公會委託任務，完成後可累積公會功績以爭取晉升。"
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackOutlinedIcon />}
            onClick={() => navigate('/user')}
            sx={{ borderRadius: 2 }}
          >
            返回總覽
          </Button>
        }
      />

      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        請攜帶冒險者卡前往公會櫃檯掃描，即可接取委託；達成目標後回到公會再次掃卡領取報酬。
      </Alert>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : error ? (
        <ErrorState message={error} onRetry={loadQuests} />
      ) : quests.length === 0 ? (
        <EmptyState title="目前沒有公會委託" description="請稍後再回來查看告示欄。" />
      ) : (
        <Stack spacing={2.5}>
          {quests.map((quest) => (
            <Card
              key={quest.id}
              variant="outlined"
              sx={{
                borderRadius: 3,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: { xs: 1, sm: 1.5 },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    mb: 1.75,
                  }}
                >
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 800,
                      color: 'text.primary',
                      fontSize: { xs: '1.25rem', sm: '1.4rem' },
                    }}
                  >
                    {quest.title}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    {quest.rewardGold > 0 && (
                      <Chip
                        icon={<PaidOutlinedIcon />}
                        label={`+${quest.rewardGold} 金幣`}
                        size="medium"
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: '0.9375rem', height: 32 }}
                      />
                    )}
                    <Chip
                      icon={<MilitaryTechOutlinedIcon sx={{ fontSize: 20, color: '#ffffff !important' }} />}
                      label={`+${quest.rewardMerit} 功績`}
                      size="medium"
                      sx={{
                        fontWeight: 800,
                        fontSize: '0.9375rem',
                        background: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)',
                        color: '#ffffff',
                        boxShadow: '0 2px 8px rgba(180, 83, 9, 0.25)',
                        px: 1,
                        height: 32,
                      }}
                    />
                  </Stack>
                </Box>

                <Typography
                  variant="body1"
                  sx={{
                    color: 'text.secondary',
                    lineHeight: 1.6,
                    fontSize: { xs: '0.95rem', sm: '1.05rem' },
                  }}
                >
                  {quest.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
