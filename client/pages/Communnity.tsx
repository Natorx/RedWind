import React, { useState, useEffect } from 'react';
import { req_to_server } from '../apis/requests';

interface Post {
  id?: number;
  title: string;
  content: string;
  createdAt?: string;
}

const SkeletonPost = () => (
  <div className="bg-neutral-900/50 border border-red-500/10 rounded-xl p-5 animate-pulse space-y-3">
    <div className="flex items-start justify-between">
      <div className="h-4 bg-neutral-700 rounded w-3/5" />
      <div className="h-3 bg-neutral-700 rounded w-12" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-neutral-700 rounded w-full" />
      <div className="h-3 bg-neutral-700 rounded w-4/5" />
    </div>
  </div>
);

const Community: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState<Post>({ title: '', content: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await req_to_server.get<Post[]>('/post/');
      setPosts(res.data);
    } catch { setMessage('获取帖子失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setMessage('标题不能为空'); return; }
    try {
      if (editingId !== null) {
        await req_to_server.put(`/post/edit/${editingId}`, form);
        setMessage('帖子更新成功');
      } else {
        await req_to_server.post('/post/setPosts', form);
        setMessage('帖子添加成功');
      }
      setForm({ title: '', content: '' });
      setEditingId(null);
      fetchPosts();
    } catch { setMessage('操作失败'); }
  };

  const handleEdit = (post: Post) => {
    setForm({ title: post.title, content: post.content });
    setEditingId(post.id!);
  };

  const handleCancelEdit = () => {
    setForm({ title: '', content: '' });
    setEditingId(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该帖子吗？')) return;
    try {
      await req_to_server.delete(`/post/remove/${id}`);
      setMessage('删除成功');
      fetchPosts();
    } catch { setMessage('删除失败'); }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen flex justify-between flex-col bg-gradient-to-br from-red-950 to-neutral-900 text-neutral-100 relative">
      {/* 主内容区 */}
      <div className="w-full mx-auto p-6">
        {message && (
          <div className="mb-3 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded text-sm text-center">
            {message}
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            // 骨架屏：显示 3 个骨架卡片
            Array.from({ length: 3 }).map((_, i) => <SkeletonPost key={i} />)
          ) : posts.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm">暂无帖子，发布第一条吧</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="group relative bg-neutral-900/50 border border-red-500/10 rounded-xl p-5 hover:border-red-400/40 transition-all duration-300 shadow-sm hover:shadow-red-500/10"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-red-200 tracking-wide max-w-[75%]">
                    {post.title}
                  </h3>
                  {post.createdAt && (
                    <span className="text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-neutral-300 leading-relaxed text-sm break-words">
                  {post.content}
                </p>
                <div className="absolute right-3 bottom-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEdit(post)}
                    className="p-1.5 rounded-md bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-blue-200 transition-colors"
                    title="编辑"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L13 15H11v-2l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(post.id!)}
                    className="p-1.5 rounded-md bg-red-500/20 text-red-400 hover:bg-red-500/40 hover:text-red-200 transition-colors"
                    title="删除"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 固定高度 120px 的底部输入栏，内部可滚动，绝不超出 */}
      <div
        className="bottom-0 left-0 right-0 z-50 bg-neutral-900/90 backdrop-blur-md border-t border-red-500/20 shadow-2xl h-[120px] overflow-y-auto px-4 py-3"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto h-full flex flex-col gap-2"
        >
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleInputChange}
            placeholder="输入帖子标题"
            className="w-full px-3 py-1.5 text-sm bg-neutral-800 border border-red-500/20 rounded focus:outline-none focus:border-red-400 transition-colors shrink-0"
          />
          <div className="flex gap-2 items-center shrink-0">
            <input
              type="text"
              name="content"
              value={form.content}
              onChange={handleInputChange}
              placeholder="写点什么…"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-neutral-800 border border-red-500/20 rounded focus:outline-none focus:border-red-400 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-sm bg-gradient-to-r from-red-500 to-red-700 rounded hover:from-red-600 hover:to-red-800 transition-all shadow whitespace-nowrap shrink-0"
            >
              {editingId ? '保存' : '发布'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-3 py-1.5 text-sm bg-neutral-800 border border-red-500/20 rounded hover:bg-neutral-700 transition-colors whitespace-nowrap shrink-0"
              >
                取消
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Community;
