import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from '../components/common/index.js';
import { canAccess, homePath, isPublicPath, isStaffPath, landingPath } from './routeAccess.js';

interface NavigationContextType {
  path: string;
  navigate: (to: string) => void;
}


const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const onPopState = () => {
      setPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname + window.location.search !== to) {
      window.history.pushState(null, '', to);
      // path tracks the pathname only; the query (e.g. ?next=) stays in the URL
      setPath(window.location.pathname);
    }
  };

  return (
    <NavigationContext.Provider value={{ path, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
}

export function RouteGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const { path, navigate } = useNavigation();

  useEffect(() => {
    if (isLoading) return;

    if (isPublicPath(path)) {
      return;
    }

    if (!user) {
      // Unauthenticated users can only view /login; staff pages come back after login
      if (path !== '/login') {
        navigate(isStaffPath(path) ? `/login?next=${encodeURIComponent(path)}` : '/login');
      }
    } else if (path === '/login' || path === '/') {
      navigate(landingPath(user.role));
    } else if (!canAccess(user.role, path)) {
      // Enforce role separation: e.g. USER cannot open /admin or /staff
      navigate(homePath(user.role));
    }
  }, [user, isLoading, path, navigate]);

  if (isLoading) {
    return <LoadingState message="載入冒險者公會中..." fullscreen />;
  }

  return <>{children}</>;
}
