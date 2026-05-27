import { Post } from '../interface/post';
import { request } from './requests';

export const postApi = {
  // 获取所有帖子
  get: () => request.get<Post[]>('/post/'),

  // 创建帖子（FormData）
  set: (formData: FormData) =>
    request.post('/post/setPosts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // 更新帖子（FormData）
  edit: (id: string, formData: FormData) =>
    request.put(`/post/edit/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // 删除帖子
  delete: (id: string) => request.delete(`/post/remove/${id}`),
};
