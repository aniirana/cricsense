import { createContext, useContext, useState, useEffect } from 'react';
import { getMe } from '../lib/api';
import { useRouter } from 'next/router';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('cs_token');
    if (token) {
      getMe().then(r => setUser(r.data)).catch(() => localStorage.removeItem('cs_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signin = (token, userData) => {
    localStorage.setItem('cs_token', token);
    setUser(userData);
    router.push('/dashboard');
  };

  const signout = () => {
    localStorage.removeItem('cs_token');
    setUser(null);
    router.push('/login');
  };

  return <AuthContext.Provider value={{ user, loading, signin, signout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
