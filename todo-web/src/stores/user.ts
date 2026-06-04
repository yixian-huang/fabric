import { defineStore } from 'pinia';
import { login as apiLogin, getUserInfo, logout as apiLogout } from '@/api/auth';
import type { LoginCredentials, UserInfo } from '@/api/auth';
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
    username: (state) => state.userInfo?.username || ''
  },
  
  actions: {
    async login(credentials: LoginCredentials) {
      try {
        this.loading = true;
        const response = await apiLogin(credentials);
        
        if (response.data && response.data.token) {
          this.token = response.data.token;
          localStorage.setItem('token', response.data.token);
          
          // 获取用户信息
          // await this.fetchUserInfo();
          
          return response.data;
        } else {
          throw new Error('登录失败：未返回有效的token');
        }
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
        if (response.data) {
          this.userInfo = response.data;
          return response.data;
        }
        return null;
      } catch (error) {
        console.error('获取用户信息失败', error);
        return null;
      }
    },
    
    async logout() {
      try {
        if (this.token) {
          await apiLogout();
        }
      } catch (error) {
        console.error('登出时发生错误', error);
      } finally {
        // 无论API是否成功，都清除本地状态
        this.token = '';
        this.userInfo = null;
        localStorage.removeItem('token');
      }
    },
    
    // 显示登录对话框
    openLoginDialog() {
      this.showLoginDialog = true;
    },
    
    // 关闭登录对话框
    closeLoginDialog() {
      this.showLoginDialog = false;
    }
  }
}); 