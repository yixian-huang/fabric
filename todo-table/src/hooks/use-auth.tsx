import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, login as authLogin, logout as authLogout, getCurrentUser, isAuthenticated } from '@/lib/auth';
import type { LoginCredentials } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isLoggedIn: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 初始化时检查用户登录状态
  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      setIsLoggedIn(authenticated);
      
      if (authenticated) {
        const currentUser = getCurrentUser();
        setUser(currentUser);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // 登录方法
  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const loggedInUser = await authLogin(credentials);
      setUser(loggedInUser);
      setIsLoggedIn(true);
    } finally {
      setLoading(false);
    }
  };

  // 登出方法
  const logout = () => {
    authLogout();
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth; 