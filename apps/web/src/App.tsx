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

  if (path.startsWith('/user')) {
    return (
      <UserLayout>
        <UserRouter path={path} />
      </UserLayout>
    );
  }

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
