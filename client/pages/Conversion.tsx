import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, FileText, Image, FileVideo, Music, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
// 支持的文件格式类型
const SUPPORTED_FORMATS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
  document: ['pdf', 'doc', 'docx', 'txt', 'md', 'rtf'],
  video: ['mp4', 'avi', 'mov', 'mkv', 'wmv'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg']
};

// 转换选项
const CONVERSION_OPTIONS = {
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

// 文件类型图标映射
const FileIcon = ({ type }: { type: string }) => {
  const icons: Record<string, React.ReactNode> = {
    image: <Image className="w-6 h-6 text-blue-500" />,
    document: <FileText className="w-6 h-6 text-green-500" />,
    video: <FileVideo className="w-6 h-6 text-purple-500" />,
    audio: <Music className="w-6 h-6 text-yellow-500" />,
    default: <FileText className="w-6 h-6 text-gray-500" />
  };
  
  return icons[type] || icons.default;
};

interface FileInfo {
  name: string;
  size: number;
  type: string;
  category: string;
  file: File;
}

const FileFormatConverter: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [conversionType, setConversionType] = useState<string>('');
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [convertedFiles, setConvertedFiles] = useState<Array<{name: string, url: string}>>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取文件类型分类
  const getFileCategory = (extension: string): string => {
    for (const [category, formats] of Object.entries(SUPPORTED_FORMATS)) {
      if (formats.includes(extension.toLowerCase())) {
        return category;
      }
    }
    return 'other';
  };

  // 处理文件上传
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    const newFiles: FileInfo[] = [];
    
    Array.from(uploadedFiles).forEach(file => {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const category = getFileCategory(extension);
      
      if (category !== 'other') {
        newFiles.push({
          name: file.name,
          size: file.size,
          type: extension,
          category,
          file
        });
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
    if (newFiles.length > 0 && !selectedFile) {
      setSelectedFile(newFiles[0]);
    }
    
    if (event.target) {
      event.target.value = '';
    }
  };

  // 删除文件
  const removeFile = (index: number) => {
    const newFiles = [...files];
    const removedFile = newFiles[index];
    newFiles.splice(index, 1);
    setFiles(newFiles);
    
    if (selectedFile === removedFile) {
      setSelectedFile(newFiles.length > 0 ? newFiles[0] : null);
    }
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

 const handleConvert = async () => {
  if (!selectedFile || !conversionType) return;

  setIsConverting(true);
  setError('');

  try {
    // 读取原始文件为 ArrayBuffer / Uint8Array
    const arrayBuffer = await selectedFile.file.arrayBuffer();
    const inputBytes = Array.from(new Uint8Array(arrayBuffer));

    const [from, to] = conversionType.split('_');

    // 调用后端转换
    const convertedBytes: number[] = await invoke('convert_file', {
      inputBytes,
      fromFormat: from,
      toFormat: to,
      originalName: selectedFile.name
    });

    const uint8Array = new Uint8Array(convertedBytes);
    const blob = new Blob([uint8Array], { type: getMimeType(to) }); // 设置正确 MIME
    const url = URL.createObjectURL(blob);

    const newFileName = selectedFile.name.replace(`.${from}`, `.${to}`);

    setConvertedFiles(prev => [...prev, { name: newFileName, url }]);
  } catch (err) {
    console.error(err);
    setError('转换失败：' + (err as Error).message);
  } finally {
    setIsConverting(false);
  }
};

// 辅助函数：根据扩展名获取 MIME 类型
const getMimeType = (ext: string): string => {
  const map: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'webp': 'image/webp',
    'pdf': 'application/pdf',
    'mp4': 'video/mp4',
    // ... 更多
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
};

  // 下载转换后的文件
const handleDownload = async (url: string, filename: string) => {
  try {
    // 1. 从 blob URL 获取实际内容
    const response = await fetch(url);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // 2. 让用户选择保存路径（默认建议文件名）
    const filePath = await save({
      defaultPath: filename,           // 建议文件名
      filters: [{ name: 'All Files', extensions: ['*'] }],
    });

    if (!filePath) {
      // 用户取消了保存对话框
      return;
    }

    // 3. 写入文件
    await writeFile(filePath, uint8Array);

    // 可选：显示成功提示
    alert(`文件已保存：${filePath}`);
  } catch (err) {
    console.error('下载失败:', err);
    setError('保存文件失败，请重试');
  }
};

  // 获取可用的转换选项
  const getAvailableConversions = () => {
    if (!selectedFile) return [];
    
    const category = selectedFile.category as keyof typeof CONVERSION_OPTIONS;
    const options = CONVERSION_OPTIONS[category] || [];
    
    return options.filter(option => 
      option.from.toLowerCase() === selectedFile.type.toLowerCase()
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            文件格式转换器
          </h1>
          <p className="text-gray-600">
            支持图片、文档、视频、音频等多种格式转换
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：文件上传区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 上传区域 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  点击或拖拽文件上传
                </h3>
                <p className="text-gray-500 text-sm mb-4">
                  支持 {Object.values(SUPPORTED_FORMATS).flat().join(', ')} 等格式
                </p>
                <button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  选择文件
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept={Object.values(SUPPORTED_FORMATS).flat().map(ext => `.${ext}`).join(',')}
                />
              </div>
            </div>

            {/* 已上传文件列表 */}
            {files.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  已上传文件 ({files.length})
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        selectedFile === file 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:bg-gray-50'
                      } cursor-pointer transition-all`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <FileIcon type={file.category} />
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右侧：转换控制区域 */}
          <div className="space-y-6">
            {/* 转换设置 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                转换设置
              </h3>
              
              {selectedFile ? (
                <div className="space-y-4">
                  {/* 当前选中文件 */}
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileIcon type={selectedFile.category} />
                      <div>
                        <p className="font-medium text-gray-800 truncate">
                          {selectedFile.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 转换选项 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      选择转换格式
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {getAvailableConversions().map((option, index) => (
                        <button
                          key={index}
                          className={`p-3 rounded-lg border text-center transition-all ${
                            conversionType === `${option.from}_${option.to}`
                              ? 'border-blue-500 bg-blue-50 text-blue-600'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          onClick={() => setConversionType(`${option.from}_${option.to}`)}
                        >
                          <div className="font-medium">{option.label}</div>
                        </button>
                      ))}
                    </div>
                    
                    {getAvailableConversions().length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        暂无可用转换选项
                      </div>
                    )}
                  </div>

                  {/* 转换按钮 */}
                  <button
                    onClick={handleConvert}
                    disabled={!conversionType || isConverting}
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      !conversionType || isConverting
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white'
                    }`}
                  >
                    {isConverting ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        转换中...
                      </span>
                    ) : (
                      '开始转换'
                    )}
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>请先上传文件</p>
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-red-600 text-sm">{error}</span>
                </div>
              )}
            </div>

            {/* 转换结果 */}
            {convertedFiles.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  转换结果 ({convertedFiles.length})
                </h3>
                <div className="space-y-3">
                  {convertedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-800 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-sm text-green-600">转换成功</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(file.url, file.name)}
                        className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>注意：这是一个前端演示组件，实际文件转换需要后端API支持</p>
          <p className="mt-1">最大支持文件大小：100MB • 支持格式：图片、文档、视频、音频</p>
        </div>
      </div>
    </div>
  );
};

export default FileFormatConverter;
