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
import { BossDisplayView } from './components/display/BossDisplayView.js';
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

  // 1. World Node: Boss Display Node (/display/boss-01)
  if (path.startsWith('/display')) {
    return <BossDisplayView />;
  }

  // 2. World Node: Boss Actor Terminal (/actor/boss)
  if (path.startsWith('/actor')) {
    return <BossActorView />;
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
