import React, { useState, useRef, ChangeEvent } from 'react';
import { Upload, FileText, Image, FileVideo, Music, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { CONVERSION_OPTIONS, SUPPORTED_FORMATS } from '../config/data/conversion';
import * as XLSX from 'xlsx';


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
  selectedKeys: string[];       // 普通模式选中的原始键
  flattened: boolean;           // 是否开启展平
  flatSelected: string[];       // 展平模式选中的路径（例如 ["body.name", "body.value"]）
}

function flattenValue(value: any, prefix: string = ''): Record<string, any> {
  if (value === null || value === undefined) return {};
  if (Array.isArray(value)) {
    if (value.length === 0) return {};
    const first = value[0];
    if (typeof first === 'object' && first !== null) {
      const fields = new Set<string>();
      value.forEach(item => Object.keys(item).forEach(k => fields.add(k)));
      const result: Record<string, any> = {};
      for (const field of fields) {
        const values = value.map(item => item[field]);
        const key = prefix ? `${prefix}.${field}` : field;
        result[key] = values;
      }
      return result;
    }
    return { [prefix]: JSON.stringify(value) };
  }
  if (typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const childPrefix = prefix ? `${prefix}.${k}` : k;
      Object.assign(result, flattenValue(v, childPrefix));
    }
    return result;
  }
  return { [prefix]: value };
}

function flattenRow(row: Record<string, any>, keys: string[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of keys) {
    Object.assign(result, flattenValue(row[key], key));
  }
  return result;
}

const JsonHandler: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);

  const formatCell = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      const s = JSON.stringify(val, null, 2);
      return s.length > 200 ? s.slice(0, 200) + '...' : s;
    }
    return String(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const json = JSON.parse(text);
        if (!Array.isArray(json)) {
          alert('请上传 JSON 数组');
          return;
        }
        const rawGroups = groupByStructure(json);
        const processed: Group[] = rawGroups.map(g => ({
          ...g,
          selectedKeys: g.keys.slice(0, 3),
          flattened: false,
          flatSelected: [],
        }));
        setGroups(processed);
      } catch {
        alert('JSON 解析失败');
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
    return Array.from(map.entries()).map(([keyStr, rows]) => ({
      keys: keyStr.split(','),
      rows,
    }));
  };

  const toggleKey = (groupIdx: number, key: string) => {
    setGroups(prev => {
      const g = { ...prev[groupIdx] };
      if (g.selectedKeys.includes(key)) {
        g.selectedKeys = g.selectedKeys.filter(k => k !== key);
      } else {
        g.selectedKeys = [...g.selectedKeys, key];
      }
      const next = [...prev];
      next[groupIdx] = g;
      return next;
    });
  };

  const toggleFlatKey = (groupIdx: number, path: string) => {
    setGroups(prev => {
      const g = { ...prev[groupIdx], flatSelected: [...prev[groupIdx].flatSelected] };
      if (g.flatSelected.includes(path)) {
        g.flatSelected = g.flatSelected.filter(p => p !== path);
      } else {
        g.flatSelected = [...g.flatSelected, path];
      }
      const next = [...prev];
      next[groupIdx] = g;
      return next;
    });
  };

  const toggleFlatten = (groupIdx: number) => {
    setGroups(prev => {
      const g = { ...prev[groupIdx] };
      if (g.flattened) {
        g.flattened = false;
        g.flatSelected = [];
      } else {
        g.flattened = true;
        const allPaths = new Set<string>();
        for (const row of g.rows) {
          const flat = flattenRow(row, g.keys);
          Object.keys(flat).forEach(p => allPaths.add(p));
        }
        g.flatSelected = Array.from(allPaths).sort();
      }
      const next = [...prev];
      next[groupIdx] = g;
      return next;
    });
  };

  const buildExportRows = (group: Group): Record<string, any>[] => {
    if (group.flattened) {
      const cols = group.flatSelected;
      return group.rows.map(row => {
        const flat = flattenRow(row, group.keys);
        const obj: Record<string, any> = {};
        for (const col of cols) obj[col] = flat[col];
        return obj;
      });
    } else {
      const cols = group.selectedKeys;
      return group.rows.map(row => {
        const obj: Record<string, any> = {};
        for (const col of cols) obj[col] = row[col];
        return obj;
      });
    }
  };

  // ---------- 导出函数 ----------
  const handleExportGroup = async (groupIdx: number) => {
    const group = groups[groupIdx];
    if (!group || (group.flattened && group.flatSelected.length === 0) || (!group.flattened && group.selectedKeys.length === 0)) return;
    const rows = buildExportRows(group);
    try {
      await invoke('export_json', {
        content: JSON.stringify(rows, null, 2),
        defaultName: `group_${groupIdx + 1}.json`,
      });
    } catch (e) {
      console.error('JSON 导出失败', e);
    }
  };

  const handleExportGroupXlsx = async (groupIdx: number) => {
    const group = groups[groupIdx];
    if (!group || (group.flattened && group.flatSelected.length === 0) || (!group.flattened && group.selectedKeys.length === 0)) return;
    const rows = buildExportRows(group);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `结构${groupIdx + 1}`);
    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    try {
      await invoke('save_file_bytes', {
        data: Array.from(new Uint8Array(wbArray)),
        defaultName: `group_${groupIdx + 1}.xlsx`,
      });
    } catch (e) {
      console.error('Excel 导出失败', e);
    }
  };

  const handleExportAll = async () => {
    const allData = groups.map((group, idx) => ({
      group: idx + 1,
      rows: buildExportRows(group),
    }));
    try {
      await invoke('export_json', {
        content: JSON.stringify(allData, null, 2),
        defaultName: 'all_groups.json',
      });
    } catch (e) {
      console.error('JSON 导出失败', e);
    }
  };

  const handleExportAllXlsx = async () => {
    if (groups.length === 0) return;
    const wb = XLSX.utils.book_new();
    groups.forEach((group, idx) => {
      const rows = buildExportRows(group);
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, `结构${idx + 1}`);
    });
    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    try {
      await invoke('save_file_bytes', {
        data: Array.from(new Uint8Array(wbArray)),
        defaultName: 'all_groups.xlsx',
      });
    } catch (e) {
      console.error('Excel 导出失败', e);
    }
  };

  // ---------- 渲染 ----------
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* 上传卡片 */}
      <div className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden">
        <div
          className="border-2 border-dashed border-red-500/30 rounded-xl m-6 p-8 text-center cursor-pointer hover:border-red-500/60 hover:bg-red-500/5 transition-all duration-300"
          onClick={() => document.getElementById('json-input')?.click()}
        >
          <h3 className="text-lg font-semibold text-neutral-200 mb-2">上传 JSON 文件</h3>
          <button className="px-6 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg">选择文件</button>
          <input id="json-input" type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
        </div>
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-neutral-500">请上传一个 JSON 数组文件</div>
      )}

      {groups.map((group, groupIdx) => {
        const columns = group.flattened ? group.flatSelected : group.selectedKeys;

        return (
          <div key={groupIdx} className="bg-neutral-900/80 backdrop-blur-sm rounded-2xl shadow-lg border border-red-500/20 overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-neutral-200">
                结构 {groupIdx + 1}（共 {group.rows.length} 条记录）
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportGroup(groupIdx)}
                  className="px-4 py-1.5 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExportGroupXlsx(groupIdx)}
                  className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-green-700 text-white text-sm rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/25"
                >
                  Excel
                </button>
              </div>
            </div>

            {/* 展平开关 */}
            <label className="flex items-center space-x-2 text-neutral-300 mb-3">
              <input type="checkbox" checked={group.flattened} onChange={() => toggleFlatten(groupIdx)} className="accent-red-500" />
              <span>展开嵌套对象/数组</span>
            </label>

            {/* 列选择 */}
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1">
              {!group.flattened ? (
                group.keys.map(key => (
                  <label key={key} className="flex items-center space-x-1 text-sm text-neutral-300">
                    <input type="checkbox" checked={group.selectedKeys.includes(key)} onChange={() => toggleKey(groupIdx, key)} className="accent-red-500" />
                    <span>{key}</span>
                  </label>
                ))
              ) : (
                (() => {
                  const allPaths = new Set<string>();
                  for (const row of group.rows) {
                    const flat = flattenRow(row, group.keys);
                    Object.keys(flat).forEach(p => allPaths.add(p));
                  }
                  return Array.from(allPaths).sort().map(path => (
                    <label key={path} className="flex items-center space-x-1 text-sm text-neutral-300">
                      <input type="checkbox" checked={group.flatSelected.includes(path)} onChange={() => toggleFlatKey(groupIdx, path)} className="accent-red-500" />
                      <span>{path}</span>
                    </label>
                  ));
                })()
              )}
            </div>

            {/* 表格 */}
            <div className="max-h-96 overflow-auto border border-red-500/20 rounded-lg">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-neutral-800 z-10">
                  <tr>
                    {columns.map(col => (
                      <th key={col} className="px-3 py-2 text-left text-sm font-semibold text-neutral-300 border-b border-red-500/20">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-red-500/5 even:bg-neutral-800/30">
                      {columns.map(col => {
                        let val: any;
                        if (group.flattened) {
                          const flat = flattenRow(row, group.keys);
                          val = flat[col];
                        } else {
                          val = row[col];
                        }
                        return (
                          <td key={col} className="px-3 py-2 text-sm text-neutral-300 border-b border-red-500/10 whitespace-pre-wrap">
                            {formatCell(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* 底部全局导出 */}
      {groups.length > 0 && (
        <div className="text-center flex justify-center gap-4">
          <button
            onClick={handleExportAll}
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25 font-medium"
          >
            导出全部 JSON
          </button>
          <button
            onClick={handleExportAllXlsx}
            className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/25 font-medium"
          >
            导出全部 Excel
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
