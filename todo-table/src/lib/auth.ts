import { AxiosResponse } from 'axios';
import api from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  token: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// 登录操作
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response: AxiosResponse<AuthResponse> = await api.post('/base/auth/login', credentials);
    console.log(response);
    const { user, token } = response.data;
    
    // 保存 token 到 localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('user', JSON.stringify(user));
    
    return user;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '登录失败');
  }
};

// 登出操作
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
};

// 获取当前登录用户
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// 检查用户是否已认证
export const isAuthenticated = (): boolean => {
  return localStorage.getItem('isAuthenticated') === 'true';
}; 