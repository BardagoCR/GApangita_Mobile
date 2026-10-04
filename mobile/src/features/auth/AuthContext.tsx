import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import type { User } from '@/src/types/api';
import { clearCsrfToken, request, saveCsrfToken } from '@/src/services/api/client';
import { login as loginRequest, logout as logoutRequest } from '@/src/services/api/gapangita';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshAuth() {
    try {
      const result = await request<{ is_authenticated: boolean; user?: User }>('/auth-status');
      setUser(result.is_authenticated ? result.user || null : null);
      if (!result.is_authenticated) await clearCsrfToken();
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void request<{ is_authenticated: boolean; user?: User }>('/auth-status')
      .then((result) => {
        setUser(result.is_authenticated ? result.user || null : null);
        if (!result.is_authenticated) void clearCsrfToken();
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function signIn(username: string, password: string) {
    const result = await loginRequest(username, password);
    await saveCsrfToken(result.csrf_token);
    setUser(result.user);
  }

  async function signOut() {
    try {
      await logoutRequest();
    } finally {
      await clearCsrfToken();
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}