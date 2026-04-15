export interface VideoInfo {
  title: string;      // 视频标题
  coverUrl: string;   // 封面图片URL
  link: string;       // 视频链接
  author?: string;    // 作者
  views?: string;     // 播放量
  comments?: string;  // 评论数
}