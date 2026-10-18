import React, { createContext, useContext, useState, useEffect } from 'react';
import { mobileApi } from '../api/client';
import { mobileStorage } from '../utils/storage';
import { LoginInput, RegisterInput } from '@expense-app/shared';

export interface MobileAuthUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: string;
}

export interface RegisterResult {
  emailConfirmationRequired?: boolean;
}

interface MobileAuthContextType {
  user: MobileAuthUser | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  updateUser: (updated: Partial<MobileAuthUser>) => void;
}

const MobileAuthContext = createContext<MobileAuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => ({ emailConfirmationRequired: false }),
  logout: async () => {},
  updateUser: () => {},
});

export function MobileAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MobileAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await mobileStorage.getItem('auth_token');
        const storedRefreshToken = await mobileStorage.getItem('auth_refresh_token');
        const storedUser = await mobileStorage.getItem('auth_user');

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Purge legacy demo account or mock tokens
          if (
            storedToken === 'demo-token' ||
            parsedUser.id === '00000000-0000-0000-0000-000000000001' ||
            parsedUser.email === 'ramesh@example.com'
          ) {
            await mobileStorage.removeItem('auth_token');
            await mobileStorage.removeItem('auth_refresh_token');
            await mobileStorage.removeItem('auth_user');
            mobileApi.setTokens(null, null);
            setUser(null);
          } else {
            mobileApi.setTokens(storedToken, storedRefreshToken);
            setUser(parsedUser);

            // Verify session in background
            mobileApi
              .getProfile()
              .then((data) => {
                if (data?.profile) {
                  const updated: MobileAuthUser = {
                    id: data.profile.id,
                    email: parsedUser.email,
                    full_name: data.profile.full_name,
                    phone: data.profile.phone,
                    avatar_url: data.profile.avatar_url,
                    role: data.profile.role,
                  };
                  setUser(updated);
                  mobileStorage.setItem('auth_user', JSON.stringify(updated));
                }
              })
              .catch(async (err) => {
                console.warn('[AuthContext] Background profile check failed:', err.message);
                if (err.message?.includes('401') || err.message?.includes('token')) {
                  // Attempt recovery with storedRefreshToken if present
                  if (storedRefreshToken) {
                    try {
                      const refreshed = await mobileApi.refreshSession(storedRefreshToken);
                      if (refreshed.token) {
                        await mobileStorage.setItem('auth_token', refreshed.token);
                        if (refreshed.refreshToken) {
                          await mobileStorage.setItem('auth_refresh_token', refreshed.refreshToken);
                        }
                        return; // Session successfully restored
                      }
                    } catch {
                      // Refresh failed, proceed to logout
                    }
                  }
                  await mobileStorage.removeItem('auth_token');
                  await mobileStorage.removeItem('auth_refresh_token');
                  await mobileStorage.removeItem('auth_user');
                  mobileApi.setTokens(null, null);
                  setUser(null);
                }
              });
          }
        } else {
          mobileApi.setTokens(null, null);
          setUser(null);
        }
      } catch (err) {
        console.warn('[AuthContext] Storage initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (data: LoginInput) => {
    try {
      setLoading(true);
      const session = await mobileApi.login(data);
      if (session.token && session.user) {
        mobileApi.setTokens(session.token, session.refreshToken || null);
        await mobileStorage.setItem('auth_token', session.token);
        if (session.refreshToken) {
          await mobileStorage.setItem('auth_refresh_token', session.refreshToken);
        }
        await mobileStorage.setItem('auth_user', JSON.stringify(session.user));
        setUser(session.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterInput): Promise<RegisterResult> => {
    try {
      setLoading(true);
      const session = await mobileApi.register(data);

      if (session.emailConfirmationRequired) {
        return { emailConfirmationRequired: true };
      }

      if (session.token && session.user) {
        mobileApi.setTokens(session.token, session.refreshToken || null);
        await mobileStorage.setItem('auth_token', session.token);
        if (session.refreshToken) {
          await mobileStorage.setItem('auth_refresh_token', session.refreshToken);
        }
        await mobileStorage.setItem('auth_user', JSON.stringify(session.user));
        setUser(session.user);
      }

      return { emailConfirmationRequired: false };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await mobileApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      mobileApi.setTokens(null, null);
      await mobileStorage.removeItem('auth_token');
      await mobileStorage.removeItem('auth_refresh_token');
      await mobileStorage.removeItem('auth_user');
      setUser(null);
    }
  };

  const updateUser = (updated: Partial<MobileAuthUser>) => {
    if (!user) return;
    const nextUser = { ...user, ...updated };
    setUser(nextUser);
    mobileStorage.setItem('auth_user', JSON.stringify(nextUser));
  };

  return (
    <MobileAuthContext.Provider
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
    </MobileAuthContext.Provider>
  );
}

export const useMobileAuth = () => useContext(MobileAuthContext);
