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
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                letterSpacing: '-0.02em',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                color: 'text.primary',
              }}
            >
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
            spacing={1.25}
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
                    color: isActive ? 'primary.main' : 'text.secondary',
                    bgcolor: isActive ? 'rgba(190, 18, 60, 0.08)' : 'transparent',
                    border: isActive ? '1px solid rgba(190, 18, 60, 0.3)' : '1px solid transparent',
                    fontWeight: isActive ? 800 : 600,
                    fontSize: '1rem',
                    borderRadius: 2.5,
                    px: 2,
                    py: 0.85,
                    '&:hover': {
                      bgcolor: 'rgba(190, 18, 60, 0.05)',
                      color: 'primary.main',
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
                gap: 1.25,
                cursor: 'pointer',
                p: 0.75,
                borderRadius: 2,
                '&:hover': { bgcolor: 'rgba(190, 18, 60, 0.05)' },
              }}
            >
              <Avatar
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontSize: '0.9375rem',
                  fontWeight: 800,
                  border: '2px solid',
                  borderColor: 'secondary.main',
                  boxShadow: '0 2px 8px rgba(180, 83, 9, 0.25)',
                }}
              >
                {rankCode}
              </Avatar>
              <Typography
                variant="body1"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  maxWidth: 130,
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
                size="medium"
                aria-label="登出"
                sx={{
                  color: 'text.secondary',
                  '&:hover': { color: 'error.main' },
                }}
              >
                <LogoutOutlinedIcon fontSize="medium" />
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
          pb: { xs: 10, md: 4 },
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
          height: 68,
          bgcolor: 'background.paper',
          borderTop: '1px solid',
          borderColor: 'divider',
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            py: 1,
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
            '& .MuiSvgIcon-root': {
              fontSize: 24,
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.875rem',
              fontWeight: 600,
              mt: 0.5,
              '&.Mui-selected': {
                fontSize: '0.9375rem',
                fontWeight: 700,
              },
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
