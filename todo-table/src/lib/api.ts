import { Toast } from '@/components/ui/toast';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// 导出 API 基础 URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** 从拦截器/envelope 响应中取出 data 载荷 */
export function unwrapApiData<T>(response: unknown): T {
  if (response == null || typeof response !== 'object') {
    throw new Error('无效的响应');
  }
  const root = response as Record<string, unknown>;

  if (typeof root.code === 'number' && root.data !== undefined) {
    return root.data as T;
  }
  if (root.data !== undefined) {
    return root.data as T;
  }
  return root as T;
}

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 10秒超时
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 从本地存储获取 token
    const token = localStorage.getItem('token');
    
    // 如果存在 token，则添加到请求头
    if (token && !config.url?.includes('login')) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    if(response.config.url.includes("download_file")) {
      return response
    }
    const result = response.data;
    if (result.code === 200) {
      // 返回数据部分
      return result.data ? { data: result.data } : result;
    } else {
      // 处理业务错误
      const errorMessage = result.message || '请求失败';
      console.error('API错误:', errorMessage);
      return Promise.reject(new Error(errorMessage));
    }
  },
  (error) => {
    // 处理HTTP错误
    let errorMessage = '网络错误';

    if (error.response && error.response.status === 400) {
      errorMessage = error.response.data.non_field_errors;
      console.log(error.response);
      toast({
        title: '错误',
        description: errorMessage,
        variant: 'destructive',
      });
    }
    
    // 处理401错误（未授权）
    if (error.response && [401, 403].includes(error.response.status)) {
      errorMessage = '未授权，请重新登录';
      // 清除本地存储的登录信息
      localStorage.removeItem('token');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('user');
      
      // 重定向到登录页
      window.location.href = `${import.meta.env.BASE_URL}login`.replace(/([^:]\/)\/+/g, '$1');
    } else if (error.response) {
      // 其他HTTP状态码错误
      errorMessage = `请求错误 (${error.response.status})`;
    } else if (error.request) {
      // 请求发出但没有收到响应
      errorMessage = '服务器无响应';
    }
    
    console.error('网络错误:', errorMessage);
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;
