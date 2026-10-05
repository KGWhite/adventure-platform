import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import { useAuth } from '../context/AuthContext.js';
import { useNavigation } from '../router/Router.js';
import { RankBadge, CredentialStatusCard } from './adventurer/index.js';
import { PageHeader } from './common/index.js';

export function AdventurerProfileView() {
  const { user, logout } = useAuth();
  const { navigate } = useNavigation();
  const profile = user?.adventurerProfile;

  const displayName = profile?.displayName || user?.username || '未登錄冒險者';
  const rank = profile?.currentRank;
  const credentials = profile?.credentials || [];

  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="冒險者個人檔案"
        subtitle="檢視公會登記之冒險者證號、階級詳細資訊與認證憑證。"
        badge={
          <Chip
            label="冒險者資訊"
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        }
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

      <Stack spacing={2.5}>
        {/* Account Details Card */}
        <Card
          variant="outlined"
          sx={{
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
              sx={{ alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2 }}
            >
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  border: '2px solid',
                  borderColor: 'secondary.main',
                }}
              >
                {rank?.code || 'F'}
              </Avatar>

              <Box sx={{ flex: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {displayName}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                  公會會員帳號: @{user?.username}
                </Typography>
              </Box>

              <Chip label={user?.role || 'USER'} color="primary" size="small" sx={{ fontWeight: 600 }} />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Stack spacing={1.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonOutlineOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    使用者 ID (UUID)
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  {user?.id}
                </Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    冒險者檔案 ID
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>
                  {profile?.id || '未建立'}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Rank Details Card */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2 }}>
              <MilitaryTechOutlinedIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
                階級檔案 (Rank Details)
              </Typography>
            </Stack>

            <Stack spacing={1.5}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  目前階級：
                </Typography>
                <RankBadge rank={rank} size="small" />
              </Stack>

              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  階級順位 (Order)：
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  第 {rank?.order ?? 1} 階
                </Typography>
              </Stack>

              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  晉升功績門檻：
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {rank?.promotionThreshold ? `${rank.promotionThreshold} 功績` : '已達最高階級'}
                </Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Credentials Breakdown Card */}
        <CredentialStatusCard credentials={credentials} />

        {/* Logout Action */}
        <Box sx={{ pt: 1 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            size="large"
            startIcon={<LogoutOutlinedIcon />}
            onClick={logout}
            sx={{ py: 1.5, borderRadius: 2 }}
          >
            登出公會系統
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
