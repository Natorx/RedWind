// 支持的文件格式类型
export const SUPPORTED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  document: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
  video: ['mp4', 'avi', 'mov', 'mkv', 'wmv'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg']
};

// 转换选项
export const CONVERSION_OPTIONS = {
  image: [
    { from: 'jpg', to: 'png', label: 'JPG → PNG' },
    { from: 'png', to: 'jpg', label: 'PNG → JPG' },
    { from: 'webp', to: 'png', label: 'WebP → PNG' },
    { from: 'svg', to: 'png', label: 'SVG → PNG' }
  ],
  document: [
    { from: 'pdf', to: 'docx', label: 'PDF → DOCX' },
    { from: 'docx', to: 'pdf', label: 'DOCX → PDF' },
    { from: 'txt', to: 'md', label: 'TXT → Markdown' }
  ],
  video: [
    { from: 'mp4', to: 'gif', label: 'MP4 → GIF' },
    { from: 'avi', to: 'mp4', label: 'AVI → MP4' }
  ],
  audio: [
    { from: 'wav', to: 'mp3', label: 'WAV → MP3' },
    { from: 'flac', to: 'mp3', label: 'FLAC → MP3' }
  ]
};