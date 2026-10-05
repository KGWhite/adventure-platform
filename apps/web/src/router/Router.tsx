import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { LoadingState } from '../components/common/index.js';

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
    if (window.location.pathname !== to) {
      window.history.pushState(null, '', to);
      setPath(to);
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

    if (!user) {
      // Unauthenticated users can only view /login
      if (path !== '/login') {
        navigate('/login');
      }
    } else {
      // Authenticated users
      if (path === '/login' || path === '/') {
        if (user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      } else if (path.startsWith('/admin') && user.role !== 'ADMIN') {
        // Enforce role separation: USER cannot access /admin
        navigate('/user');
      }
    }
  }, [user, isLoading, path, navigate]);

  if (isLoading) {
    return <LoadingState message="載入冒險者公會中..." fullscreen />;
  }

  return <>{children}</>;
}

