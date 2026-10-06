import { useState, type ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import MilitaryTechOutlinedIcon from '@mui/icons-material/MilitaryTechOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { useAuth } from '../context/AuthContext.js';
import { PageContainer } from '../components/common/index.js';


export type AdminTab =
  | 'dashboard'
  | 'adventurers'
  | 'ranks'
  | 'credentials'
  | 'quests'
  | 'promotions'
  | 'rewards';

export interface AdminLayoutProps {
  children: ReactNode;
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

const DRAWER_WIDTH = 240;

interface NavItemConfig {
  key: AdminTab;
  label: string;
  icon: ReactNode;
  isComingSoon?: boolean;
}

const ADMIN_NAV_ITEMS: NavItemConfig[] = [
  { key: 'dashboard', label: '總覽 Dashboard', icon: <DashboardOutlinedIcon /> },
  { key: 'adventurers', label: '冒險者 Adventurers', icon: <GroupOutlinedIcon /> },
  { key: 'ranks', label: '階級體系 Ranks', icon: <MilitaryTechOutlinedIcon /> },
  { key: 'credentials', label: '憑證管理 Credentials', icon: <BadgeOutlinedIcon /> },
  { key: 'quests', label: '任務系統 Quests', icon: <AssignmentOutlinedIcon />, isComingSoon: true },
  { key: 'promotions', label: '晉升審核 Promotions', icon: <HowToRegOutlinedIcon />, isComingSoon: true },
  { key: 'rewards', label: '獎勵設定 Rewards', icon: <CardGiftcardOutlinedIcon />, isComingSoon: true },
];

export function AdminLayout({ children, currentTab, onTabChange }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleSelectTab = (tab: AdminTab) => {
    onTabChange(tab);
    setMobileOpen(false);
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Header in Drawer */}
      <Toolbar sx={{ px: 2.5, py: 1, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <SecurityOutlinedIcon sx={{ color: 'secondary.main', fontSize: 28 }} />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', fontSize: '1.15rem' }}>
            公會管理後台
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: '0.06em', fontSize: '0.8125rem', fontWeight: 600 }}>
            GUILD ADMIN
          </Typography>
        </Box>
      </Toolbar>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Navigation List */}
      <List sx={{ px: 1.5, py: 1.5, flex: 1 }}>
        {ADMIN_NAV_ITEMS.map((item) => {
          const isSelected = currentTab === item.key;
          return (
            <ListItem key={item.key} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleSelectTab(item.key)}
                sx={{
                  borderRadius: 2.5,
                  py: 1.25,
                  px: 1.75,
                  '&.Mui-selected': {
                    bgcolor: 'rgba(190, 18, 60, 0.08)',
                    border: '1px solid rgba(190, 18, 60, 0.28)',
                    color: 'primary.main',
                    fontWeight: 800,
                    '& .MuiListItemIcon-root': {
                      color: 'primary.main',
                    },
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: isSelected ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: isSelected ? 800 : 600 }}>
                      {item.label}
                    </Typography>
                  }
                />

                {item.isComingSoon && (
                  <Chip
                    label="Soon"
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'text.secondary',
                      borderColor: 'divider',
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'divider' }} />

      {/* Footer Info in Drawer */}
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontSize: '0.8125rem' }}>
          Adventure Platform v0.1
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600 }}>
          Role: {user?.role || 'ADMIN'}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      {/* Top Navbar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
          {/* Left: Mobile Drawer Hamburger & Title */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="開啟導覽選單"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ display: { md: 'none' }, color: 'text.secondary' }}
            >
              <MenuOutlinedIcon />
            </IconButton>

            <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '1.2rem' }}>
              🛡️ 管理控制台
            </Typography>
          </Stack>

          {/* Right: Admin User & Logout */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              label={`管理員: @${user?.username}`}
              size="medium"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 700, fontSize: '0.875rem', display: { xs: 'none', sm: 'inline-flex' } }}
            />

            <Tooltip title="登出管理後台">
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

      {/* Navigation Drawers: Mobile (Temporary) and Desktop (Permanent) */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
        aria-label="公會管理功能選單"
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* Desktop Permanent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: DRAWER_WIDTH,
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          mt: 8, // Toolbar height offset
          minHeight: '100vh',
        }}
      >
        <PageContainer maxWidth="lg" disableGutters>
          {children}
        </PageContainer>
      </Box>
    </Box>
  );
}
