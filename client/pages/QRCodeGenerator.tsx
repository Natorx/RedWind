import React, { useState, useRef } from 'react';
import * as QRCode from 'qrcode.react';

interface QRCodeGeneratorProps {
  defaultText?: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  includeMargin?: boolean;
  level?: 'L' | 'M' | 'Q' | 'H';
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  defaultText = 'https://example.com',
  size = 200,
  fgColor = '#000000',
  bgColor = '#ffffff',
  includeMargin = true,
  level = 'M'
}) => {
  const [text, setText] = useState<string>(defaultText);
  const [qrSize, setQrSize] = useState<number>(size);
  const [qrFgColor, setQrFgColor] = useState<string>(fgColor);
  const [qrBgColor, setQrBgColor] = useState<string>(bgColor);
  const qrRef = useRef<HTMLDivElement>(null);

  // 下载二维码为PNG
  const downloadQRCode = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // 复制二维码数据URL
  const copyQRCode = async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      await navigator.clipboard.writeText(dataUrl);
      alert('二维码已复制到剪贴板！');
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 重置为默认值
  const resetToDefaults = () => {
    setText(defaultText);
    setQrSize(size);
    setQrFgColor(fgColor);
    setQrBgColor(bgColor);
  };

  // 预设颜色方案
  const colorPresets = [
    { name: '经典黑', fg: '#000000', bg: '#ffffff' },
    { name: '深色模式', fg: '#ffffff', bg: '#1f2937' },
    { name: 'GitHub绿', fg: '#238636', bg: '#f6f8fa' },
    { name: 'Twitter蓝', fg: '#1da1f2', bg: '#ffffff' },
    { name: '微信绿', fg: '#07c160', bg: '#ffffff' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
        二维码生成器
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：控制面板 */}
        <div className="space-y-6">
          {/* 文本输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              二维码内容
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="输入文本、URL或任何内容..."
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              当前长度: {text.length} 字符
            </p>
          </div>

          {/* 尺寸控制 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              尺寸: {qrSize}px
            </label>
            <input
              type="range"
              min="100"
              max="500"
              step="10"
              value={qrSize}
              onChange={(e) => setQrSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>100px</span>
              <span>300px</span>
              <span>500px</span>
            </div>
          </div>

          {/* 颜色控制 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                前景色
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={qrFgColor}
                  onChange={(e) => setQrFgColor(e.target.value)}
                  className="w-12 h-12 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={qrFgColor}
                  onChange={(e) => setQrFgColor(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                背景色
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="w-12 h-12 cursor-pointer rounded border border-gray-300"
                />
                <input
                  type="text"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* 颜色预设 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              颜色预设
            </label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => {
                    setQrFgColor(preset.fg);
                    setQrBgColor(preset.bg);
                  }}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 
                           hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{
                    backgroundColor: preset.bg,
                    color: preset.fg,
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载PNG
            </button>

            <button
              onClick={copyQRCode}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       transition-colors flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制图片
            </button>

            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                       transition-colors"
            >
              重置
            </button>
          </div>
        </div>

        {/* 右侧：二维码预览 */}
        <div className="flex flex-col items-center justify-center">
          <div 
            ref={qrRef}
            className="p-6 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
          >
            <QRCode.QRCodeSVG
              value={text}
              size={qrSize}
              fgColor={qrFgColor}
              bgColor={qrBgColor}
              includeMargin={includeMargin}
              level={level}
            />
          </div>

          {/* 二维码信息 */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg w-full">
            <h3 className="font-medium text-gray-800 dark:text-white mb-2">二维码信息</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">容错级别</span>
                <span className="font-medium dark:text-white">{level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">尺寸</span>
                <span className="font-medium dark:text-white">{qrSize} × {qrSize}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">边距</span>
                <span className="font-medium dark:text-white">{includeMargin ? '有' : '无'}</span>
              </div>
            </div>
          </div>

          {/* 预览提示 */}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
            使用手机扫描测试二维码
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
