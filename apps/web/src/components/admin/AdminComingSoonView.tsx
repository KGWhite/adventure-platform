import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { PageHeader, EmptyState } from '../common/index.js';

export interface AdminComingSoonViewProps {
  title: string;
  subtitle: string;
  featureName: string;
  onBackToDashboard: () => void;
}

export function AdminComingSoonView({
  title,
  subtitle,
  featureName,
  onBackToDashboard,
}: AdminComingSoonViewProps) {
  return (
    <Box sx={{ width: '100%' }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button
            variant="outlined"
            startIcon={<ArrowBackOutlinedIcon />}
            onClick={onBackToDashboard}
            sx={{ borderRadius: 2 }}
          >
            返回總覽
          </Button>
        }
      />

      <EmptyState
        icon={<ConstructionOutlinedIcon sx={{ fontSize: 56, color: 'text.secondary' }} />}
        title="Coming soon"
        description={`${featureName}功能整備中。本階段不提供虛構 CRUD 操作，後續後端工作流完成後將正式開放管理功能。`}
        action={
          <Button
            variant="contained"
            color="primary"
            onClick={onBackToDashboard}
            sx={{ borderRadius: 2 }}
          >
            返回公會管理總覽
          </Button>
        }
      />
    </Box>
  );
}
