import request from './request';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserInfo {
  id: string;
  username: string;
  name?: string;
  avatar?: string;
  role?: string;
}

/**
 * 用户登录
 */
export function login(data: LoginCredentials) {
  return request({
    url: '/base/auth/login',
    method: 'post',
    data
  });
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return request({
    url: '/base/auth/me',
    method: 'get'
  });
}

/**
 * 用户登出
 */
export function logout() {
  return request({
    url: '/auth/logout',
    method: 'post'
  });
} 

export interface RegisterData {
  email: string
  username: string
  password: string
  password_confirm: string
  email_subscription: boolean
}

export function register(data: RegisterData) {
  return request({
    url: '/base/auth/register',
    method: 'post',
    data
  })
}

export function verifyEmail(token: string) {
  return request({
    url: '/base/auth/verify-email',
    method: 'post',
    data: { token }
  })
}

export function resendVerification(email: string) {
  return request({
    url: '/base/auth/resend-verification',
    method: 'post',
    data: { email }
  })
} 