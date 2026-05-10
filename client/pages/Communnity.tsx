import React, { useState, useEffect, useRef } from 'react';
import { Post } from '../interface/post';
import { postApi } from '../apis/post';

const SkeletonPost = () => (
  <div className="bg-neutral-900/50 border border-red-500/10 rounded-xl p-5 animate-pulse space-y-3">
    <div className="flex items-start justify-between">
      <div className="h-4 bg-neutral-700 rounded w-3/5" />
      <div className="h-3 bg-neutral-700 rounded w-12" />
    </div>
    <div className="h-3 bg-neutral-700 rounded w-1/5" />
    <div className="space-y-2">
      <div className="h-3 bg-neutral-700 rounded w-full" />
      <div className="h-3 bg-neutral-700 rounded w-4/5" />
    </div>
  </div>
);

const Community: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [form, setForm] = useState<Post>({ title: '', content: '', tag: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 图片相关状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await postApi.get();
      setPosts(res.data);
    } catch {
      setMessage('获取帖子失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 选择文件
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // 限制最多6张
    const remaining = 6 - selectedFiles.length;
    if (files.length > remaining) {
      setMessage(`最多可选择 ${remaining} 张图片`);
      return;
    }
    setSelectedFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 删除已选择的某个文件
  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setMessage('标题不能为空');
      return;
    }

    const formData = new FormData();
    formData.append('title', form.title);
    formData.append('content', form.content);
    if (form.tag) formData.append('tag', form.tag);
    selectedFiles.forEach((file) => {
      formData.append('images', file);
    });

    try {
      if (editingId !== null) {
        await postApi.edit(editingId, formData);
        setMessage('帖子更新成功');
      } else {
        await postApi.set(formData);
        setMessage('帖子添加成功');
      }
      setForm({ title: '', content: '', tag: '' });
      setEditingId(null);
      setSelectedFiles([]);
      fetchPosts();
    } catch {
      setMessage('操作失败');
    }
  };

  const handleEdit = (post: Post) => {
    setForm({ title: post.title, content: post.content, tag: post.tag || '' });
    setEditingId(post.id!);
    setSelectedFiles([]);
  };

  const handleCancelEdit = () => {
    setForm({ title: '', content: '', tag: '' });
    setEditingId(null);
    setSelectedFiles([]);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定删除该帖子吗？')) return;
    try {
      await postApi.delete(id);
      setMessage('删除成功');
      fetchPosts();
    } catch {
      setMessage('删除失败');
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 图片布局函数
  const getImageContainerClass = (count: number) => {
    if (count === 1) return 'grid grid-cols-1 gap-2';
    if (count === 2) return 'grid grid-cols-2 gap-2';
    if (count <= 4) return 'grid grid-cols-2 gap-2';
    return 'grid grid-cols-3 gap-2';
  };

  const getImageSizeClass = (count: number) => {
    if (count === 1) return 'w-full h-48 object-cover rounded';
    if (count === 2) return 'w-full h-32 object-cover rounded';
    return 'w-full h-24 object-cover rounded';
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-red-950 to-neutral-900 text-neutral-100">
      {/* 消息提示（浮动） */}
      {message && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded text-sm text-center">
          {message}
        </div>
      )}

      {/* 上部展示区：占满剩余高度，可滚动 */}
      <div className="flex-1 overflow-y-auto scroll-none p-6">
        <div className="flex justify-around items-start gap-2">
          {/* 左栏：帖子列表（可滚动） */}
          <div className="w-70% space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <SkeletonPost key={i} />)
            ) : posts.length === 0 ? (
              <p className="text-center text-neutral-500 text-sm">
                暂无帖子，发布第一条吧
              </p>
            ) : (
              posts.map((post) => {
                const imageCount = post.images?.length || 0;
                return (
                  <div
                    key={post.id}
                    className="group relative bg-neutral-900/50 border border-red-500/10 rounded-xl p-5 hover:border-red-400/40 transition-all duration-300 shadow-sm hover:shadow-red-500/10"
                  >
                    {/* 标题、标签、日期 */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex max-w-[75%]">
                        <h3 className="text-lg font-semibold text-red-200 tracking-wide">
                          {post.title}
                        </h3>
                        {post.tag && (
                          <span className="inline-block ml-4 mb-2 px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-300 border border-red-500/20">
                            {post.tag}
                          </span>
                        )}
                      </div>
                      {post.createdAt && (
                        <span className="text-[14px] font-bold text-neutral-500 whitespace-nowrap">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <p className="text-neutral-300 leading-relaxed text-sm break-words">
                      {post.content}
                    </p>

                    {/* 图片展示 */}
                    {imageCount > 0 && (
                      <div className={`mt-3 ${getImageContainerClass(imageCount)}`}>
                        {post.images!.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`img-${idx}`}
                            className={getImageSizeClass(imageCount) + ' border border-red-500/10'}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* 编辑/删除按钮 */}
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
                );
              })
            )}
          </div>

          {/* 右栏：固定区域（示例） */}
          <div className="w-30% sticky top-0">
            {/* 右侧内容可自定义 */}
            <div className="bg-neutral-800/50 rounded-xl p-4 border border-red-500/10">
              <h2 className="text-red-200 font-semibold mb-2">右侧面板</h2>
              <p className="text-neutral-400 text-sm">此处可展示其他信息，固定不动。</p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部输入栏：始终固定在底部 */}
      <div className="bg-neutral-900/90 backdrop-blur-md border-t border-red-500/20 shadow-2xl px-4 py-3">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* 标签和标题 */}
          <div className="grid grid-cols-12 gap-2 shrink-0">
            <div className="col-span-3">
              <input
                type="text"
                name="tag"
                value={form.tag || ''}
                onChange={handleInputChange}
                placeholder="标签"
                className="w-full px-3 py-1.5 text-sm text-gray bg-neutral-800 border border-red-500/20 rounded focus:outline-none focus:border-red-400 transition-colors"
              />
            </div>
            <div className="col-span-9">
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleInputChange}
                placeholder="输入帖子标题"
                className="w-full px-3 py-1.5 text-sm text-gray bg-neutral-800 border border-red-500/20 rounded focus:outline-none focus:border-red-400 transition-colors"
              />
            </div>
          </div>

          {/* 内容输入 + 操作按钮 */}
          <div className="flex gap-2 items-center shrink-0 flex-wrap">
            <input
              type="text"
              name="content"
              value={form.content}
              onChange={handleInputChange}
              placeholder="写点什么…"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm text-gray bg-neutral-800 border border-red-500/20 rounded focus:outline-none focus:border-red-400 transition-colors"
            />
            <button
              type="submit"
              className="px-4 py-1.5 text-sm text-white cursor-pointer bg-gradient-to-r from-red-500 to-red-700 rounded hover:from-red-600 hover:to-red-800 transition-all shadow whitespace-nowrap shrink-0"
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

          {/* 图片选择 */}
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs text-gray bg-neutral-800 border border-red-500/20 rounded hover:bg-neutral-700"
            >
              选择图片
            </button>

            {selectedFiles.length > 0 && (
              <span className="text-xs text-neutral-400">
                已选择 {selectedFiles.length} 个文件
                {selectedFiles.map((file, idx) => (
                  <span key={idx} className="ml-1 inline-flex items-center gap-1 bg-neutral-800 px-1.5 py-0.5 rounded">
                    <span className="max-w-[80px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-300 hover:text-red-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Community;
