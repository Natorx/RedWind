export interface Post {
  id: string;          // 改为 string（UUID）
  title: string;
  content: string;
  tag?: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
  author?: {           // 新增作者信息
    id: string;
    username: string;
  };
}
