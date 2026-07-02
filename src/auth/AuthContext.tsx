import { createContext, useContext, useState, type ReactNode } from 'react';
import { login as loginRequest, logout as logoutRequest } from './authClient';
import { resetStreamixToken } from '../streamix/streamixClient';

interface AuthContextValue {
  isAuthenticated: boolean;
  email: string | null;
  submitting: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const login = async (loginEmail: string, password: string) => {
    setSubmitting(true);
    setError('');

    try {
      const loggedInEmail = await loginRequest(loginEmail, password);
      setEmail(loggedInEmail);
      setIsAuthenticated(true);
    } catch (err) {
      setIsAuthenticated(false);
      setError(err instanceof Error ? err.message : 'login_failed');
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    logoutRequest();
    resetStreamixToken();
    setIsAuthenticated(false);
    setEmail(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, submitting, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
