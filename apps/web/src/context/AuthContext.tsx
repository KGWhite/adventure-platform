import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types/auth.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<User>;
  logout: () => void;
  apiUrl: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = useCallback(async (jwt: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });
      if (!res.ok) {
        throw new Error('Token expired or invalid');
      }
      const data: User = await res.json();
      setUser(data);
      return data;
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      setIsLoading(false);
    }
  }, [token, fetchCurrentUser]);

  const login = async (username: string, pass: string): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password: pass }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || 'Login failed. Please check your credentials.');
    }

    const data = await res.json();
    localStorage.setItem('token', data.accessToken);
    setToken(data.accessToken);

    // Fetch full profile (including adventurerProfile with rank)
    const fullUser = await fetchCurrentUser(data.accessToken);
    return fullUser || data.user;
  };

  const logout = () => {
    if (token) {
      fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, apiUrl: API_BASE_URL }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
