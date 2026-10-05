import Box from '@mui/material/Box';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import Button from '@mui/material/Button';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { useNavigation } from '../router/Router.js';
import { PageHeader, EmptyState } from './common/index.js';

export function AdventurerRewardsView() {
  const { navigate } = useNavigation();

  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="公會獎勵兌換所"
        subtitle="使用已累積之公會功績或達成特定榮譽階級，兌換冒險者專屬獎勵。"
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
        icon={<CardGiftcardOutlinedIcon sx={{ fontSize: 56, color: 'secondary.main' }} />}
        title="Coming soon"
        description="公會獎勵兌換系統整備中。後續階段將開放使用公會功績兌換虛擬與實體冒險獎勵。"
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
