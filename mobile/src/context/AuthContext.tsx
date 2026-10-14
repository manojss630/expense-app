import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobileApi } from '../api/client';
import { LoginInput, RegisterInput, Profile } from '@expense-app/shared';

interface MobileAuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
}

interface MobileAuthContextType {
  user: MobileAuthUser | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<MobileAuthUser>) => void;
}

const MobileAuthContext = createContext<MobileAuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  demoLogin: async () => {},
  logout: async () => {},
  updateUser: () => {},
});

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileAuthUser | null>({
    id: '00000000-0000-0000-0000-000000000001',
    email: 'ramesh@example.com',
    full_name: 'Ramesh Kumar',
    phone: '+91 9876543210',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    role: 'admin',
  });
  const [loading, setLoading] = useState(false);

  const login = async (data: LoginInput) => {
    try {
      setLoading(true);
      const session = await mobileApi.login(data);
      setUser(session.user);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      setLoading(true);
      const session = await mobileApi.register(data);
      setUser(session.user);
    } finally {
      setLoading(false);
    }
  };

  const demoLogin = async () => {
    await login({
      email: 'ramesh@example.com',
      password: 'password123',
    });
  };

  const logout = async () => {
    await mobileApi.logout();
    setUser(null);
  };

  const updateUser = (updated: Partial<MobileAuthUser>) => {
    if (!user) return;
    setUser({ ...user, ...updated });
  };

  return (
    <MobileAuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        demoLogin,
        logout,
        updateUser,
      }}
    >
      {children}
    </MobileAuthContext.Provider>
  );
}

export const useMobileAuth = () => useContext(MobileAuthContext);
