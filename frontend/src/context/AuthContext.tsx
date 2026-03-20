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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('email');
    const fullName = localStorage.getItem('fullName');
    if (token && email && fullName) {
      setUser({ token, email, fullName });
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await authApi.login(email, password);
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      localStorage.setItem('fullName', data.fullName);
      setUser({ token: data.token, email: data.email, fullName: data.fullName });
    }
    return data;
  };

  const register = async (fullName: string, email: string, password: string): Promise<AuthResponse> => {
    const { data } = await authApi.register(fullName, email, password);
    return data;
  };

  const loginWithToken = (data: AuthResponse) => {
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('email', data.email);
      localStorage.setItem('fullName', data.fullName);
      setUser({ token: data.token, email: data.email, fullName: data.fullName });
    }
  };

  const logout = () => {
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
