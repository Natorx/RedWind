// Crawler.tsx
import { useEffect, useState } from 'react';
import { getBiliVideoApi } from '../apis/crawler.api';
import { VideoInfo } from '../interface/crawler.interface';

const Crawler: React.FC = () => {
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const response = await getBiliVideoApi();
        console.log(response);
        // 提取真正的数组数据
        const videoData = response.data;

        // 检查是否为数组
        if (Array.isArray(videoData)) {
          setVideos(videoData);
        } else {
          throw new Error('返回的数据不是数组格式');
        }
      } catch (err) {
        setError('获取视频失败');
        console.error('获取失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, []); // 空依赖数组，只在组件挂载时执行一次

  // 加载状态
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          <strong className="font-bold">错误！</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-gray-900">视频列表</h1>
        <p className="text-sm text-gray-400 mt-1">共 {videos.length} 个视频</p>
      </div>

      <div className="divide-y divide-gray-50">
        {videos.map((video, index) => (
          <div key={index} className="group py-4 first:pt-0 last:pb-0">
            <div className="flex gap-5">
              {/* 封面 */}
              <div className="flex-shrink-0 w-44">
                <div className="relative rounded-lg overflow-hidden bg-gray-50">
                  <img
                    src={video.coverUrl}
                    alt={video.title}
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[11px] px-1.5 py-0.5 rounded">
                    {video.views}
                  </div>
                </div>
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0 py-1">
                <a
                  href={video.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mb-2"
                >
                  <h3 className="text-base font-medium text-gray-800 line-clamp-2 group-hover:text-blue-500 transition-colors">
                    {video.title}
                  </h3>
                </a>

                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>👤 {video.author || '未知'}</span>
                  {video.comments && <span>💬 {video.comments}</span>}
                  <span>▶ {video.views}次播放</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Crawler;
