import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme/index.js';
import { UserLayout } from './layouts/index.js';

import { AuthProvider } from './context/AuthContext.js';
import { NavigationProvider, RouteGuard, useNavigation } from './router/Router.js';
import { LoginView } from './components/LoginView.js';
import { AdventurerView } from './components/AdventurerView.js';
import { AdventurerProfileView } from './components/AdventurerProfileView.js';
import { AdventurerQuestsView } from './components/AdventurerQuestsView.js';
import { AdventurerRewardsView } from './components/AdventurerRewardsView.js';
import { AdminView } from './components/AdminView.js';
import { BossActorView } from './components/actor/BossActorView.js';
import { ShopActorView } from './components/actor/ShopActorView.js';
import { BossDisplayView } from './components/display/BossDisplayView.js';
import { FollowDisplayView } from './components/display/FollowDisplayView.js';
import { GuildDisplayView } from './components/display/GuildDisplayView.js';
import { ShopDisplayView } from './components/display/ShopDisplayView.js';
import { StatusDisplayView } from './components/display/StatusDisplayView.js';
import { GuildTerminalView } from './components/guild/GuildTerminalView.js';
import { StaffConsoleView } from './components/staff/StaffConsoleView.js';
import { StatusTerminalView } from './components/status/StatusTerminalView.js';
import './App.css';

function UserRouter({ path }: { path: string }) {
  if (path === '/user/profile') {
    return <AdventurerProfileView />;
  }
  if (path === '/user/quests') {
    return <AdventurerQuestsView />;
  }
  if (path === '/user/rewards') {
    return <AdventurerRewardsView />;
  }
  return <AdventurerView />;
}

function MainRouter() {
  const { path } = useNavigation();

  // 1. World Node: Display Nodes (/display follows the staff console;
  //    /display/guild-01, /display/shop-01, /display/status-01, /display/boss-01)
  if (path === '/display' || path === '/display/') {
    return <FollowDisplayView />;
  }
  if (path.startsWith('/display/guild')) {
    return <GuildDisplayView />;
  }
  if (path.startsWith('/display/status')) {
    return <StatusDisplayView />;
  }
  if (path.startsWith('/display/shop')) {
    return <ShopDisplayView />;
  }
  if (path.startsWith('/display')) {
    return <BossDisplayView />;
  }

  // 2. Staff Console: one phone operating every station (/staff)
  if (path.startsWith('/staff')) {
    return <StaffConsoleView />;
  }

  // World Node: Actor Terminals (/actor/shop/shop-01, /actor/boss)
  if (path.startsWith('/actor/shop')) {
    return <ShopActorView />;
  }
  if (path.startsWith('/actor')) {
    return <BossActorView />;
  }

  // 3. World Node: Guild Terminal (/guild)
  if (path.startsWith('/status')) {
    return <StatusTerminalView />;
  }

  if (path.startsWith('/guild')) {
    return <GuildTerminalView />;
  }

  // 3. User Dashboard
  if (path.startsWith('/user')) {
    return (
      <UserLayout>
        <UserRouter path={path} />
      </UserLayout>
    );
  }

  // 4. Admin Console
  if (path.startsWith('/admin')) {
    return <AdminView />;
  }

  // Default to Login view
  return <LoginView />;
}

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NavigationProvider>
          <RouteGuard>
            <MainRouter />
          </RouteGuard>
        </NavigationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
