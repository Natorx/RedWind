import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useAccountStore } from '../stores/account';

const BASE_URL = import.meta.env.VITE_SERVER_URL;

const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动注入 token
request.interceptors.request.use(
  (config) => {
    const token = useAccountStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // 如果是 FormData 上传，让浏览器自动设置 Content-Type（含 boundary）
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：统一处理错误
request.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      // 401 -> token 失效，自动登出
      if (status === 401) {
        useAccountStore.getState().logout();
        // 可选重定向到登录页
        // window.location.href = '/login';
      }
      // 提取后端返回的错误消息
      const message = error.response.data?.message || `请求失败 (${status})`;
      return Promise.reject(new Error(message));
    }
    // 网络错误等
    return Promise.reject(new Error('网络异常，请稍后重试'));
  }
);

const req_to_server = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { request, req_to_server };
