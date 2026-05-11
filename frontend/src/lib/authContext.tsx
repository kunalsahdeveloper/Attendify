import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** email+password login OR token-only for Google SSO (pass token as 3rd arg, leave password empty) */
  login: (email: string, password: string, preIssuedToken?: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    teacherId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = api.getToken();
    if (token) {
      void api.auth.getMe().then((response) => {
        if (response.success && response.data) {
          setUser(response.data.user);
        } else {
          api.setToken(null);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, preIssuedToken?: string) => {
    // Google path: token already set by api.auth.google(); just fetch the user
    if (preIssuedToken) {
      api.setToken(preIssuedToken);
      const meRes = await api.auth.getMe();
      if (meRes.success && meRes.data) {
        setUser(meRes.data.user);
        return { success: true as const };
      }
      api.setToken(null);
      return { success: false as const, error: 'Could not load user profile' };
    }

    const response = await api.auth.login(email, password);
    if (response.success && response.data) {
      setUser(response.data.user);
      return { success: true as const };
    }
    return {
      success: false as const,
      error: (response as { error?: string }).error || 'Login failed',
    };
  };

  const register = async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    teacherId?: string;
  }) => {
    const response = await api.auth.register({ ...data, role: 'teacher' });
    if (response.success && response.data) {
      setUser(response.data.user);
      return { success: true as const };
    }
    return { success: false as const, error: response.error || 'Registration failed' };
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const meRes = await api.auth.getMe();
    if (meRes.success && meRes.data) {
      setUser(meRes.data.user);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
