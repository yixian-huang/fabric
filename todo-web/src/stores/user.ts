import { defineStore } from 'pinia';
import { login as apiLogin, getUserInfo, type LoginCredentials, type UserInfo, type LoginResult } from '@/api/auth';
import { unwrapData } from '@/api/utils';
import { ElMessage } from 'element-plus';

export const useUserStore = defineStore('user', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    userInfo: null as UserInfo | null,
    loading: false,
    showLoginDialog: false
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    username: (state) => state.userInfo?.nickname || state.userInfo?.username || ''
  },
  
  actions: {
    async login(credentials: LoginCredentials) {
      try {
        this.loading = true;
        const response = await apiLogin(credentials);
        const payload = unwrapData<LoginResult>(response);

        if (payload?.token) {
          this.token = payload.token;
          localStorage.setItem('token', payload.token);
          await this.fetchUserInfo();
          return payload;
        }
        throw new Error('登录失败：未返回有效的 token');
      } catch (error: any) {
        ElMessage.error(error.message || '登录失败');
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    async fetchUserInfo() {
      if (!this.token) return null;
      
      try {
        const response = await getUserInfo();
        const info = unwrapData<UserInfo>(response);
        if (info?.user_id) {
          this.userInfo = info;
          return info;
        }
        return null;
      } catch (error) {
        console.error('获取用户信息失败', error);
        return null;
      }
    },
    
    logout() {
      this.token = '';
      this.userInfo = null;
      localStorage.removeItem('token');
    },
    
    openLoginDialog() {
      this.showLoginDialog = true;
    },
    
    closeLoginDialog() {
      this.showLoginDialog = false;
    }
  }
});
