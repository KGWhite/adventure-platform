import Box from '@mui/material/Box';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import Button from '@mui/material/Button';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { useNavigation } from '../router/Router.js';
import { PageHeader, EmptyState } from './common/index.js';

export function AdventurerQuestsView() {
  const { navigate } = useNavigation();

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

      <EmptyState
        icon={<AssignmentOutlinedIcon sx={{ fontSize: 56, color: 'primary.light' }} />}
        title="Coming soon"
        description="公會委託任務系統整備中。公會管理員即將開放新任務委託，敬請期待後續公告。"
        action={
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/user')}
            sx={{ borderRadius: 2 }}
          >
            返回公會首頁
          </Button>
        }
      />
    </Box>
  );
}
