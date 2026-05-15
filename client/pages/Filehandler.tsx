import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, FileText, Image, FileVideo, Music, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { CONVERSION_OPTIONS, SUPPORTED_FORMATS } from '../config/data/conversion';


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

const FileHandler:React.FC = () => {
  return(
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-4 md:p-8">
      <Conversion/>
      <JsonHandler/>
    </div>
  )
}

interface Group {
  keys: string[];
  rows: Record<string, any>[];
  selectedKeys: string[];
}

const JsonHandler: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const json = JSON.parse(text);
        if (!Array.isArray(json)) {
          alert('请上传一个 JSON 数组文件（例如 [{"a":1}, {"b":2}]）');
          return;
        }
        const rawGroups = groupByStructure(json);
        const processedGroups = rawGroups.map((g) => ({
          ...g,
          selectedKeys: g.keys.slice(0, 3),
        }));
        setGroups(processedGroups);
      } catch {
        alert('JSON 解析失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  };

  const groupByStructure = (arr: any[]): { keys: string[]; rows: Record<string, any>[] }[] => {
    const map = new Map<string, Record<string, any>[]>();
    for (const obj of arr) {
      if (typeof obj !== 'object' || obj === null) continue;
      const sortedKeys = Object.keys(obj).sort();
      const keyStr = sortedKeys.join(',');
      if (!map.has(keyStr)) map.set(keyStr, []);
      map.get(keyStr)!.push(obj);
    }
    const groups: { keys: string[]; rows: Record<string, any>[] }[] = [];
    for (const [keyStr, rows] of map.entries()) {
      groups.push({ keys: keyStr.split(','), rows });
    }
    return groups;
  };

  const handleKeyToggle = (groupIndex: number, key: string) => {
    setGroups((prev) => {
      const newGroups = prev.map((g) => ({ ...g }));
      const group = newGroups[groupIndex];
      const isSelected = group.selectedKeys.includes(key);
      if (isSelected) {
        group.selectedKeys = group.selectedKeys.filter((k) => k !== key);
      } else {
        const newSelected: string[] = [];
        for (const k of group.keys) {
          if (k === key || group.selectedKeys.includes(k)) {
            newSelected.push(k);
          }
        }
        group.selectedKeys = newSelected;
      }
      newGroups[groupIndex] = group;
      return newGroups;
    });
  };

  const handleExport = () => {
    const exportData = groups.map((group) => ({
      keys: group.selectedKeys,
      rows: group.rows.map((row) => {
        const filtered: Record<string, any> = {};
        group.selectedKeys.forEach((key) => {
          filtered[key] = row[key];
        });
        return filtered;
      }),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 上传卡片 */}
      <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
        <div
          className="border-2 border-dashed border-red-500/30 rounded-xl m-6 p-8 text-center cursor-pointer hover:border-red-500/60 hover:bg-red-500/5 transition-all duration-300"
          onClick={() => document.getElementById('json-input')?.click()}
        >
          <h3 className="text-lg font-semibold text-neutral-200 mb-2">
            上传 JSON 文件
          </h3>
          <p className="text-neutral-400 text-sm mb-4">
            支持 .json 格式（JSON 数组）
          </p>
          <button className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25">
            选择文件
          </button>
          <input
            id="json-input"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* 数据展示区 */}
      {groups.length === 0 && (
        <div className="text-center py-12 text-neutral-500">
          <p>请上传一个 JSON 数组文件</p>
        </div>
      )}

      {groups.map((group, groupIdx) => (
        <div key={groupIdx} className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">
              结构 {groupIdx + 1}（共 {group.rows.length} 条记录）
            </h3>

            {/* 列勾选框 */}
            <div className="mb-4 flex flex-wrap gap-2">
              {group.keys.map((key) => (
                <label key={key} className="flex items-center space-x-1 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={group.selectedKeys.includes(key)}
                    onChange={() => handleKeyToggle(groupIdx, key)}
                    className="accent-red-500"
                  />
                  <span className="text-sm">{key}</span>
                </label>
              ))}
            </div>

            {/* 表格容器 */}
            <div className="max-h-48 overflow-y-auto custom-scrollbar border border-red-500/20 rounded-lg">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-neutral-800 z-10">
                  <tr>
                    {group.selectedKeys.map((key) => (
                      <th
                        key={key}
                        className="px-3 py-2 text-left text-sm font-semibold text-neutral-300 border-b border-red-500/20 bg-neutral-800"
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className="transition-colors hover:bg-red-500/5 even:bg-neutral-800/30"
                    >
                      {group.selectedKeys.map((key) => (
                        <td
                          key={key}
                          className="px-3 py-2 text-sm text-neutral-300 border-b border-red-500/10"
                        >
                          {row[key] !== undefined ? String(row[key]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {groups.length > 0 && (
        <div className="text-center">
          <button
            onClick={handleExport}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25 font-medium"
          >
            导出筛选后的数据（JSON）
          </button>
        </div>
      )}
    </div>
  );
};

const Conversion: React.FC = () => {
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
    <div>
      <div className="max-w-6xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：文件上传区域 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 上传区域 */}
            <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
              <div 
                className="border-2 border-dashed border-red-500/30 rounded-xl m-6 p-8 text-center cursor-pointer hover:border-red-500/60 hover:bg-red-500/5 transition-all duration-300"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-neutral-200 mb-2">
                  点击或拖拽文件上传
                </h3>
                <p className="text-neutral-400 text-sm mb-4">
                  支持 {Object.values(SUPPORTED_FORMATS).flat().join(', ')} 等格式
                </p>
                <button className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25">
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
              <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-200 mb-4">
                    已上传文件 ({files.length})
                  </h3>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto px-6 pb-6 custom-scrollbar">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedFile === file 
                          ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-500/25' 
                          : 'border-red-500/30 hover:bg-red-500/5'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center space-x-3">
                        <FileIcon type={file.category} />
                        <div>
                          <p className="font-medium text-neutral-200 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {formatFileSize(file.size)} • {file.type.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="p-1 hover:bg-neutral-700 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-neutral-500" />
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
            <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-neutral-200 mb-4">
                  转换设置
                </h3>
                
                {selectedFile ? (
                  <div className="space-y-4">
                    {/* 当前选中文件 */}
                    <div className="p-3 bg-neutral-800/50 rounded-lg border border-red-500/20">
                      <div className="flex items-center space-x-3">
                        <FileIcon type={selectedFile.category} />
                        <div>
                          <p className="font-medium text-neutral-200 truncate">
                            {selectedFile.name}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {formatFileSize(selectedFile.size)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 转换选项 */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        选择转换格式
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {getAvailableConversions().map((option, index) => (
                          <button
                            key={index}
                            className={`p-3 rounded-lg border text-center transition-all ${
                              conversionType === `${option.from}_${option.to}`
                                ? 'border-red-500 bg-red-500/10 text-red-400 shadow-lg shadow-red-500/25'
                                : 'border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 text-neutral-300'
                            }`}
                            onClick={() => setConversionType(`${option.from}_${option.to}`)}
                          >
                            <div className="font-medium">{option.label}</div>
                          </button>
                        ))}
                      </div>
                      
                      {getAvailableConversions().length === 0 && (
                        <div className="text-center py-4 text-neutral-500">
                          暂无可用转换选项
                        </div>
                      )}
                    </div>

                    {/* 转换按钮 */}
                    <button
                      onClick={handleConvert}
                      disabled={!conversionType || isConverting}
                      className={`w-full py-3 rounded-lg font-medium transition-all ${
                        !conversionType || isConverting
                          ? 'bg-neutral-700 cursor-not-allowed text-neutral-500'
                          : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25'
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
                  <div className="text-center py-8 text-neutral-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-600" />
                    <p>请先上传文件</p>
                  </div>
                )}

                {/* 错误提示 */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <span className="text-red-400 text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 转换结果 */}
            {convertedFiles.length > 0 && (
              <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-neutral-200 mb-4">
                    转换结果 ({convertedFiles.length})
                  </h3>
                </div>
                <div className="space-y-3 px-6 pb-6">
                  {convertedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="font-medium text-neutral-200 truncate max-w-xs">
                            {file.name}
                          </p>
                          <p className="text-sm text-green-400">转换成功</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(file.url, file.name)}
                        className="p-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/25"
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
        <div className="mt-8 text-center">
          <p className="text-neutral-500 text-sm">
            注意：这是一个前端演示组件，实际文件转换需要后端API支持
          </p>
          <p className="text-neutral-500 text-sm mt-1">
            最大支持文件大小：100MB • 支持格式：图片、文档、视频、音频
          </p>
        </div>
      </div>

      <style>{`
        /* 自定义滚动条 */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #3f3f46;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ef4444;
          border-radius: 3px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #dc2626;
        }
      `}</style>
    </div>
  );
};

export default FileHandler;
