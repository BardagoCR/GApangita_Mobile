import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import type { User } from '@/src/types/api';
import { clearCsrfToken, request, saveCsrfToken } from '@/src/services/api/client';
import { login as loginRequest, logout as logoutRequest } from '@/src/services/api/gapangita';

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  authError: string;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [authError, setAuthError] = useState('');
  const generation = useRef(0);

  const refreshAuth = useCallback(async () => {
    const current = ++generation.current;
    setIsLoading(true);
    try {
      const result = await request<{ is_authenticated: boolean; user?: User }>('/auth-status');
      if (current !== generation.current) return;
      if (typeof result.is_authenticated !== 'boolean' || (result.is_authenticated && !result.user)) {
        throw new Error('The server returned an invalid session. Please retry.');
      }
      if (!result.is_authenticated) await clearCsrfToken();
      if (current !== generation.current) return;
      setUser(result.is_authenticated ? result.user || null : null);
      setAuthError('');
    } catch (reason) {
      if (current === generation.current) setAuthError(reason instanceof Error ? reason.message : 'Unable to check your session.');
    } finally {
      if (current === generation.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
    return () => { generation.current++; };
  }, [refreshAuth]);

  async function signIn(username: string, password: string) {
    generation.current++;
    setIsLoading(true);
    try {
      const result = await loginRequest(username, password);
      await saveCsrfToken(result.csrf_token);
      setUser(result.user);
      setAuthError('');
    } catch (reason) {
      setAuthError('Unable to confirm your session. Retry the session check.');
      throw reason;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut() {
    generation.current++;
    setIsLoading(true);
    try {
      await logoutRequest();
      await clearCsrfToken();
      setUser(null);
      setAuthError('');
    } catch (reason) {
      setAuthError('Unable to confirm sign-out. Check your connection and retry.');
      throw reason;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, authError, signIn, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}