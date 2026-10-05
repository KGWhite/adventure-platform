import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { useNavigation } from '../../router/Router.js';
import { PageHeader } from '../common/index.js';

export interface AdminSummaryMetrics {
  totalUsers: number;
  totalAdventurers: number;
  totalRanks: number;
  totalCredentials: number;
}

export interface AdminDashboardProps {
  metrics: AdminSummaryMetrics | null;
}

export function AdminDashboard({ metrics }: AdminDashboardProps) {
  const { navigate } = useNavigation();

  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title="公會營運總覽 (Dashboard)"
        subtitle="監控冒險者公會核心數據、階級體系配置與已登記憑證統計。"
        badge={
          <Chip
            label="公會管理中心"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        }
      />

      {/* Metrics Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Total Adventurers */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    冒險者人數
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {metrics?.totalAdventurers ?? '...'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.12)', color: 'primary.light' }}>
                  <GroupOutlinedIcon />
                </Box>
              </Stack>
              <Button
                size="small"
                endIcon={<ArrowForwardOutlinedIcon fontSize="small" />}
                onClick={() => navigate('/admin/adventurers')}
                sx={{ p: 0, minWidth: 0, fontWeight: 600 }}
              >
                檢視冒險者名冊
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Ranks */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    公會階級數
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {metrics?.totalRanks ?? '...'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245, 158, 11, 0.12)', color: 'secondary.main' }}>
                  <MilitaryTechOutlinedIcon />
                </Box>
              </Stack>
              <Button
                size="small"
                color="secondary"
                endIcon={<ArrowForwardOutlinedIcon fontSize="small" />}
                onClick={() => navigate('/admin/ranks')}
                sx={{ p: 0, minWidth: 0, fontWeight: 600 }}
              >
                檢視階級體系配置
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Credentials */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    已發行憑證
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {metrics?.totalCredentials ?? '...'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(16, 185, 129, 0.12)', color: 'success.main' }}>
                  <BadgeOutlinedIcon />
                </Box>
              </Stack>
              <Button
                size="small"
                color="success"
                endIcon={<ArrowForwardOutlinedIcon fontSize="small" />}
                onClick={() => navigate('/admin/credentials')}
                sx={{ p: 0, minWidth: 0, fontWeight: 600 }}
              >
                檢視憑證管理
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Total System Users */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                <Box>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    系統註冊帳號
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
                    {metrics?.totalUsers ?? '...'}
                  </Typography>
                </Box>
                <Box sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(56, 189, 248, 0.12)', color: 'info.main' }}>
                  <SecurityOutlinedIcon />
                </Box>
              </Stack>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                含 USER 冒險者與 ADMIN 管理員
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Navigation Panels */}
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          p: { xs: 2, sm: 3 },
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2, color: 'text.primary' }}>
          公會管理快速通道 (Management Shortcuts)
        </Typography>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<GroupOutlinedIcon />}
              onClick={() => navigate('/admin/adventurers')}
              sx={{ py: 1.5, borderRadius: 2, justifyContent: 'flex-start' }}
            >
              冒險者名冊管理
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<MilitaryTechOutlinedIcon />}
              onClick={() => navigate('/admin/ranks')}
              sx={{ py: 1.5, borderRadius: 2, justifyContent: 'flex-start' }}
            >
              階級順位與門檻配置
            </Button>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<BadgeOutlinedIcon />}
              onClick={() => navigate('/admin/credentials')}
              sx={{ py: 1.5, borderRadius: 2, justifyContent: 'flex-start' }}
            >
              實體／數位憑證管理
            </Button>
          </Grid>
        </Grid>
      </Card>
    </Box>
  );
}
