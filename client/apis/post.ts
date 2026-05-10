import { Post } from '../interface/post';
import { req_to_server } from './requests';

export const postApi = {
  get: async () => {
    return await req_to_server.get<Post[]>('/post/');
  },

  // 创建帖子：接收 FormData（含 title, content, tag, 以及可选的 images 文件）
  set: async (formData: FormData) => {
    return await req_to_server.post('/post/setPosts', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // 更新帖子：接收 FormData（同上，但 id 通过 URL 参数传递）
  edit: async (id: number, formData: FormData) => {
    return await req_to_server.put(`/post/edit/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: async (id: number) => {
    return await req_to_server.delete(`/post/remove/${id}`);
  },
};
