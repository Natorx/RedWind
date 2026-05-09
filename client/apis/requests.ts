import axios from 'axios';
import { server_chat_addr, server_port } from '../config/api.config';

const request = axios.create({
  timeout: 3000,
  headers: {
    'Content-Type': 'application/json',
  },
});
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

const req_to_server = axios.create({
  baseURL: `http://${server_chat_addr}:${server_port}`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export { request, req_to_server };
