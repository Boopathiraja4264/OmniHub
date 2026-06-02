import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

export interface AuthResponse {
  token?: string;
  email: string;
  fullName: string;
  requiresEmailVerification?: boolean;
  twoFactorRequired?: boolean;
  twoFactorMethod?: string;
  tempToken?: string;
  challengeToken?: string;
  oauthProvider?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (fullName: string, email: string, password: string) => Promise<AuthResponse>;
  loginWithToken: (data: AuthResponse) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  loading: boolean;
  wakingUp: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

const WAKEUP_TIMEOUT_MS = 30_000; // 30s per attempt before retry
const MAX_RETRIES = 12;            // 12 × ~33s ≈ 6 min (Render cold start ≤ 4 min)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [wakingUp, setWakingUp] = useState(false);

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : prev);
  };

  useEffect(() => {
    let cancelled = false;

    const tryGetMe = async (attempt: number): Promise<void> => {
      if (cancelled) return;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKEUP_TIMEOUT_MS);
      try {
        const r = await authApi.getMe({ signal: controller.signal });
        clearTimeout(timeoutId);
        if (cancelled) return;
        setUser({ email: r.data.email, fullName: r.data.fullName, token: '', oauthProvider: r.data.oauthProvider || '', profilePicture: r.data.profilePicture || undefined });
        setLoading(false);
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        const isNetworkOrTimeout = !err?.response; // no HTTP response = timeout / network down
        if (isNetworkOrTimeout && attempt < MAX_RETRIES) {
          setWakingUp(true);
          await new Promise(res => setTimeout(res, 3000));
          return tryGetMe(attempt + 1);
        }
        // 401, 403, or max retries — treat as no session
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('fullName');
        setLoading(false);
      }
    };

    tryGetMe(0);
    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await authApi.login(email, password);
    if (data.token && !data.twoFactorRequired && !data.requiresEmailVerification) {
      // Cookie is set by backend; store user info in memory only
      setUser({ email: data.email, fullName: data.fullName, token: '' });
    }
    return data;
  };

  const register = async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await authApi.register(fullName, email, password);
    return data;
  };

  const loginWithToken = (data: AuthResponse) => {
    if (data.token || data.email) {
      setUser({ email: data.email, fullName: data.fullName, token: '', oauthProvider: data.oauthProvider || '' });
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithToken, logout, updateUser, loading, wakingUp }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
