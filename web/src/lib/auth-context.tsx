'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from './api';
import { LoginInput, RegisterInput, Profile } from '@expense-app/shared';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<{ emailConfirmationRequired?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => ({}),
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('expense_app_user');
      const token = localStorage.getItem('expense_app_token');

      // Purge legacy demo user/token
      if (token === 'demo-token' || storedUser?.includes('00000000-0000-0000-0000-000000000001')) {
        localStorage.removeItem('expense_app_token');
        localStorage.removeItem('expense_app_user');
        setUser(null);
      } else if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (data: LoginInput) => {
    const session = await api.login(data);
    if (!session.token || !session.user) {
      throw new Error('No authentication token or user profile received from server.');
    }
    localStorage.setItem('expense_app_token', session.token);
    if (session.refreshToken) {
      localStorage.setItem('expense_app_refresh_token', session.refreshToken);
    }
    localStorage.setItem('expense_app_user', JSON.stringify(session.user));
    setUser(session.user);
    router.push('/dashboard');
  };

  const register = async (data: RegisterInput): Promise<{ emailConfirmationRequired?: boolean }> => {
    const session: any = await api.register(data);

    if (session.emailConfirmationRequired || !session.token || !session.user) {
      return { emailConfirmationRequired: true };
    }

    localStorage.setItem('expense_app_token', session.token);
    if (session.refreshToken) {
      localStorage.setItem('expense_app_refresh_token', session.refreshToken);
    }
    localStorage.setItem('expense_app_user', JSON.stringify(session.user));
    setUser(session.user);
    router.push('/dashboard');
    return { emailConfirmationRequired: false };
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      localStorage.removeItem('expense_app_token');
      localStorage.removeItem('expense_app_refresh_token');
      localStorage.removeItem('expense_app_user');
      router.push('/login');
    }
  };

  const updateUser = (updated: Partial<AuthUser>) => {
    if (!user) return;
    const nextUser = { ...user, ...updated };
    setUser(nextUser);
    localStorage.setItem('expense_app_user', JSON.stringify(nextUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

