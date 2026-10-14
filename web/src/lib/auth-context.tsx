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
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<AuthUser>) => void;
  demoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateUser: () => {},
  demoLogin: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('expense_app_user');
      const token = localStorage.getItem('expense_app_token');

      if (storedUser && token) {
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
    localStorage.setItem('expense_app_token', session.token);
    localStorage.setItem('expense_app_user', JSON.stringify(session.user));
    setUser(session.user);
    router.push('/dashboard');
  };

  const register = async (data: RegisterInput) => {
    const session = await api.register(data);
    localStorage.setItem('expense_app_token', session.token);
    localStorage.setItem('expense_app_user', JSON.stringify(session.user));
    setUser(session.user);
    router.push('/dashboard');
  };

  const demoLogin = async () => {
    await login({
      email: 'ramesh@example.com',
      password: 'password123',
    });
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    router.push('/login');
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
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
