import React, { useState, useEffect } from 'react';
import { req_to_server } from '../apis/requests';

// 帖子类型定义
interface Post {
  id?: number;
  title: string;
  content: string;
  createdAt?: string;
}

const Community: React.FC = () => {
  // 帖子列表
  const [posts, setPosts] = useState<Post[]>([]);
  // 表单状态（新增 / 编辑）
  const [form, setForm] = useState<Post>({ title: '', content: '' });
  // 编辑模式时记录被编辑的帖子 id
  const [editingId, setEditingId] = useState<number | null>(null);
  // 加载状态
  const [loading, setLoading] = useState(false);
  // 错误/成功消息
  const [message, setMessage] = useState('');

  // 获取所有帖子
  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await req_to_server.get<Post[]>('/post/');
      setPosts(res.data);
    } catch (err) {
      console.error('获取帖子失败:', err);
      setMessage('获取帖子失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchPosts();
  }, []);

  // 输入处理
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 新增或者更新帖子
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setMessage('标题不能为空');
      return;
    }
    try {
      if (editingId !== null) {
        // 更新
        await req_to_server.put(`/post/edit/${editingId}`, form);
        setMessage('帖子更新成功');
      } else {
        // 新增
        await req_to_server.post('/post/setPosts', form);
        setMessage('帖子添加成功');
      }
      // 重置表单
      setForm({ title: '', content: '' });
      setEditingId(null);
      fetchPosts();
    } catch (err) {
      console.error('提交失败:', err);
      setMessage('操作失败');
    }
  };

  // 进入编辑模式
  const handleEdit = (post: Post) => {
    setForm({ title: post.title, content: post.content });
    setEditingId(post.id!);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setForm({ title: '', content: '' });
    setEditingId(null);
  };

  // 删除帖子
  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该帖子吗？')) return;
    try {
      await req_to_server.delete(`/post/remove/${id}`);
      setMessage('删除成功');
      fetchPosts();
    } catch (err) {
      console.error('删除失败:', err);
      setMessage('删除失败');
    }
  };

  // 显示的消息自动消失
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 text-neutral-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-red-400">社区帖子管理</h1>

        {/* 提示消息 */}
        {message && (
          <div className="mb-4 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-sm">
            {message}
          </div>
        )}

        {/* 表单 */}
        <form
          onSubmit={handleSubmit}
          className="bg-neutral-900/60 border border-red-500/20 rounded-xl p-6 mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">
            {editingId ? '编辑帖子' : '新增帖子'}
          </h2>
          <div className="mb-4">
            <label className="block text-sm text-neutral-400 mb-1">标题</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
              placeholder="请输入标题"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm text-neutral-400 mb-1">内容</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 bg-neutral-800 border border-red-500/30 rounded-lg focus:outline-none focus:border-red-500 transition-colors resize-none"
              placeholder="请输入内容"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg"
            >
              {editingId ? '保存修改' : '添加'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-neutral-800 border border-red-500/30 rounded-lg hover:bg-neutral-700 transition-colors"
              >
                取消
              </button>
            )}
          </div>
        </form>

        {/* 帖子列表 */}
        <div className="space-y-4">
          {loading && <p className="text-center text-neutral-500">加载中...</p>}
          {!loading && posts.length === 0 && (
            <p className="text-center text-neutral-500">暂无帖子，请添加</p>
          )}
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-neutral-900/60 border border-red-500/20 rounded-xl p-6 hover:border-red-500/40 transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold text-red-300">{post.title}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(post)}
                    className="px-3 py-1 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(post.id!)}
                    className="px-3 py-1 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
              <p className="text-neutral-300 leading-relaxed">{post.content}</p>
              {post.createdAt && (
                <p className="mt-2 text-xs text-neutral-500">
                  创建时间: {new Date(post.createdAt).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Community;
