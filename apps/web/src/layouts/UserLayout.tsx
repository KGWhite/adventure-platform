import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { useAuth } from '../context/AuthContext.js';
import { useNavigation } from '../router/Router.js';
import { PageContainer } from '../components/common/index.js';

export interface UserLayoutProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { label: '首頁', path: '/user', icon: <HomeRoundedIcon /> },
  { label: '任務', path: '/user/quests', icon: <AssignmentOutlinedIcon /> },
  { label: '獎勵', path: '/user/rewards', icon: <CardGiftcardOutlinedIcon /> },
  { label: '檔案', path: '/user/profile', icon: <PersonOutlineOutlinedIcon /> },
];

export function UserLayout({ children }: UserLayoutProps) {
  const { user, logout } = useAuth();
  const { path, navigate } = useNavigation();

  // Find active navigation value
  const activeNav = NAV_ITEMS.some((item) => item.path === path) ? path : '/user';

  const rankCode = user?.adventurerProfile?.currentRank?.code || 'F';
  const displayName = user?.adventurerProfile?.displayName || user?.username || '冒險者';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      {/* Top AppBar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          {/* Brand */}
          <Box
            onClick={() => navigate('/user')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <span>⚔️</span>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                冒險者公會
              </Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
                公會
              </Box>
            </Typography>
          </Box>

          {/* Desktop Navigation Links (hidden on mobile) */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = path === item.path;
              return (
                <Button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    color: isActive ? 'primary.light' : 'text.secondary',
                    bgcolor: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: 2,
                    px: 1.75,
                    py: 0.75,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                      color: 'text.primary',
                    },
                  }}
                >
                  {item.label}
                </Button>
              );
            })}
          </Stack>

          {/* User Status & Logout */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Box
              onClick={() => navigate('/user/profile')}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                p: 0.5,
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
              }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'primary.dark',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  border: '1.5px solid',
                  borderColor: 'secondary.main',
                }}
              >
                {rankCode}
              </Avatar>
              <Typography
                variant="body2"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  fontWeight: 600,
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {displayName}
              </Typography>
            </Box>

            <Tooltip title="登出公會系統">
              <IconButton
                onClick={logout}
                size="small"
                aria-label="登出"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <LogoutOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content Area (Mobile padded to avoid bottom navigation) */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          pb: { xs: 9, md: 4 },
        }}
      >
        <PageContainer maxWidth="md">
          {children}
        </PageContainer>
      </Box>

      {/* Mobile Bottom Navigation (Fixed on mobile screen) */}
      <BottomNavigation
        value={activeNav}
        onChange={(_, newValue) => {
          navigate(newValue);
        }}
        showLabels
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          height: 64,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 1,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.light',
            },
          },
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.path}
            value={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  );
}
