// src/api/account.ts
import { req_to_server } from './requests';

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    username: string;
  };
}

export interface RegisterData {
  username: string;
  password: string;
}

export const accountApi = {
  // 登录
  login: async (username: string, password: string) => {
    return await req_to_server.post<LoginResponse>('/account/login', {
      username,
      password,
    });
  },

  // 注册
  register: async (data: RegisterData) => {
    return await req_to_server.post('/account/register', data);
  },

  // 获取当前用户信息（需要 token）
  getProfile: async () => {
    return await req_to_server.get<{ id: string; username: string }>('/account/profile');
  },

  // 更新用户信息
  updateProfile: async (data: { username?: string }) => {
    return await req_to_server.put('/account/profile', data);
  },

  // 退出登录（如果有后端销毁 token 的接口）
  logout: async () => {
    return await req_to_server.post('/account/logout');
  },
};
