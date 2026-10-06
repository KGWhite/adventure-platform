import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useNavigation } from '../router/Router.js';
import type { Rank } from '../types/auth.js';
import { RankBadge, MeritProgress, CredentialStatusCard } from './adventurer/index.js';
import { PageHeader } from './common/index.js';

export function AdventurerView() {
  const { user, apiUrl } = useAuth();
  const { navigate } = useNavigation();
  const [ranks, setRanks] = useState<Rank[]>([]);
  const profile = user?.adventurerProfile;

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/ranks`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Rank[]) => setRanks(data))
      .catch(() => {});
  }, [apiUrl]);

  const displayName = profile?.displayName || user?.username || '未登錄冒險者';
  const rank = profile?.currentRank;
  const merit = 0; // MVP Merit ledger initial state
  const credentials = profile?.credentials || [];

  // Determine next rank strictly from database data
  const nextRank = rank ? ranks.find((r) => r.order === rank.order + 1) : null;
  const isMaxRank = Boolean(rank && ranks.length > 0 && !nextRank);
  const nextThreshold = nextRank ? nextRank.promotionThreshold : isMaxRank ? null : (rank?.promotionThreshold || 100);


  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      {/* Page Header */}
      <PageHeader
        title="冒險者公會儀表板"
        subtitle="歡迎回到冒險者公會。檢視當前階級、功績進度與公會委託。"
        badge={
          <Chip
            label="⚔️ Adventurer Guild"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        }
      />

      {/* Hero Profile Summary Card */}
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2.5}
            sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Avatar
              sx={{
                width: { xs: 68, sm: 82 },
                height: { xs: 68, sm: 82 },
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: { xs: '1.6rem', sm: '2rem' },
                fontWeight: 900,
                border: '2.5px solid',
                borderColor: 'secondary.main',
                boxShadow: '0 4px 14px rgba(180, 83, 9, 0.25)',
              }}
            >
              {rank?.code || 'F'}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  {displayName}
                </Typography>
                <Chip
                  label={`@${user?.username}`}
                  size="small"
                  variant="outlined"
                  sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8125rem' }}
                />
              </Stack>

              <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', mt: 1, flexWrap: 'wrap', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    目前階級：
                  </Typography>
                  <RankBadge rank={rank} size="small" />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                    公會功績：
                  </Typography>
                  <Typography
                    variant="h6"
                    component="span"
                    sx={{ fontWeight: 800, color: 'secondary.main', letterSpacing: 0.5 }}
                  >
                    {merit} Merit
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* Main Grid: Merit Progress & Credential Status */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Merit & Promotion Progress Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 3,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 2 }}>
                <MilitaryTechOutlinedIcon sx={{ color: 'secondary.main', fontSize: 26 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  公會功績與晉升資格
                </Typography>
              </Stack>

              <MeritProgress
                currentMerit={merit}
                promotionThreshold={nextThreshold}
                targetRankName={nextRank?.name}
              />

            </CardContent>
          </Card>
        </Grid>

        {/* Credentials Card */}
        <Grid size={{ xs: 12, md: 6 }}>
          <CredentialStatusCard credentials={credentials} />
        </Grid>
      </Grid>

      {/* Guild Bulletin Notice */}
      <Card
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.25 }}>
            <CampaignOutlinedIcon sx={{ color: 'primary.light', fontSize: 26 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
              📜 公會公告事項
            </Typography>
          </Stack>
          <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
            冒險者身分登記確認完畢。目前階級為 <strong>Rank {rank?.code || 'F'} ({rank?.name || '初階冒險者'})</strong>。任務委託系統目前整備中，請等候公會管理員於後台審核指派新任務。
          </Typography>
        </CardContent>
      </Card>

      {/* Quick Navigation Action Cards for Mobile & Touch */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<AssignmentOutlinedIcon />}
            onClick={() => navigate('/user/quests')}
            sx={{
              py: 1.75,
              borderRadius: 2.5,
              fontSize: '1.05rem',
              fontWeight: 700,
              justifyContent: 'flex-start',
              color: 'text.primary',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(190, 18, 60, 0.05)',
              },
            }}
          >
            前往任務告示欄 (Quests)
          </Button>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PersonOutlineOutlinedIcon />}
            onClick={() => navigate('/user/profile')}
            sx={{
              py: 1.75,
              borderRadius: 2.5,
              fontSize: '1.05rem',
              fontWeight: 700,
              justifyContent: 'flex-start',
              color: 'text.primary',
              borderColor: 'divider',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'rgba(190, 18, 60, 0.05)',
              },
            }}
          >
            檢視完整個人檔案 (Profile)
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
