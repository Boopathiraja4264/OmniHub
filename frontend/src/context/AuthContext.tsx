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
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (fullName: string, email: string, password: string) => Promise<AuthResponse>;
  loginWithToken: (data: AuthResponse) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On app load: rehydrate session from HttpOnly cookie via /api/auth/me
  useEffect(() => {
    authApi.getMe()
      .then(r => {
        setUser({ email: r.data.email, fullName: r.data.fullName, token: '' });
      })
      .catch(() => {
        // No valid session — clear any stale localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('email');
        localStorage.removeItem('fullName');
      })
      .finally(() => setLoading(false));
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
      // Cookie is set by backend; store user info in memory only
      setUser({ email: data.email, fullName: data.fullName, token: '' });
    }
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, loginWithToken, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
