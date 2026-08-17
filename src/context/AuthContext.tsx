import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiErrorMessage, loginAdmin } from '../lib/api';
import type { AdminProfile } from '../types';

const TOKEN_KEY = 'neptune_admin_access_token';
const USER_KEY = 'neptune_admin_user';

interface AuthContextValue {
  admin: AdminProfile | null;
  isAuthenticated: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(): AdminProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminProfile>;
    if (!parsed.loginId) return null;
    return {
      name: parsed.name || parsed.loginId,
      loginId: parsed.loginId,
      role: parsed.role === 'ADMIN' ? 'ADMIN' : 'ADMIN',
      email: parsed.email || '',
      mobile: parsed.mobile || '',
    };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(() => parseStoredUser());

  const login = useCallback(async (loginId: string, password: string) => {
    const response = await loginAdmin(loginId, password);
    const user = response.user;

    if (user.role !== 'ADMIN') {
      throw new Error('Only admin users can access the Neptune admin dashboard.');
    }

    const nextAdmin: AdminProfile = {
      name: user.loginId,
      loginId: user.loginId,
      role: 'ADMIN',
      email: '',
      mobile: '',
    };

    localStorage.setItem(TOKEN_KEY, response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextAdmin));
    setAdmin(nextAdmin);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({ admin, isAuthenticated: admin !== null, login, logout }),
    [admin, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getApiFailureMessage(error: unknown): string {
  return apiErrorMessage(error, 'Unable to authenticate with the Neptune backend.');
}
