import axios from 'axios';
import { ElMessage } from 'element-plus';


// 创建 axios 实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // 基础URL
  timeout: 60000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json',
  },
});


// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token 等认证信息
    const token = localStorage.getItem('token');
    if (token && !config.url?.includes('login')) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 直接返回数据部分
    const { data } = response;
    
    // 可以根据业务状态码做不同处理
    if (data.code && data.code !== 200) {
      // 处理参数验证错误
      if (data.code === 400 && data.errors) {
        // 将错误信息格式化为更友好的形式
        const errorMessages = data.errors.map((error: any) => {
          // 处理嵌套字段的错误信息
          const fieldPath = error.field.split('.');
          const lastField = fieldPath[fieldPath.length - 1];
          // 如果是数组索引，转换为更友好的形式
          return `${lastField}：${error.message}`;
        });
        
        ElMessage.error(errorMessages.join('\n'));
      } else {
        ElMessage.error(data.message || '请求失败');
      }
      return Promise.reject(new Error(data.message || '请求失败'));
    }
    
    return data;  // 直接返回服务器响应的数据对象
  },
  (error) => {
    let message = '';
    
    if (error.response) {
      // 请求已发出，但服务器返回状态码不在 2xx 范围内
      switch (error.response.status) {
        case 400:
          // 处理参数验证错误
          if (error.response.data.errors) {
            const errorMessages = error.response.data.errors.map((error: any) => {
              const fieldPath = error.field.split('.');
              const lastField = fieldPath[fieldPath.length - 1];
              return `${lastField}：${error.message}`;
            });
            
            message = errorMessages.join('\n');
          } else {
            message = '请求参数错误';
          }
          break;
        case 401:
          message = '未授权，请重新登录';
          // 可以在这里处理登出逻辑
          // store.dispatch('user/logout');
          break;
        case 403:
          message = error.response.data.detail;
          localStorage.clear()
          // 在拦截器中不能直接使用 useRouter，需要使用 window.location 进行重定向
          window.location.href = '/login';
          break;
        case 404:
          message = '请求地址出错';
          break;
        case 408:
          message = '请求超时';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        case 501:
          message = '服务未实现';
          break;
        case 502:
          message = '网关错误';
          break;
        case 503:
          message = '服务不可用';
          break;
        case 504:
          message = '网关超时';
          break;
        default:
          message = `连接出错(${error.response.status})!`;
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      message = '网络请求超时!';
    } else {
      // 请求配置有误
      message = '请求配置错误: ' + error.message;
    }
    
    ElMessage.error(message);
    console.error(message);
    return Promise.reject(error);
  }
);

export default request; 