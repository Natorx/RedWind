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
  level = 'M',
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

  // 预设颜色方案（深色模式适配）
  const colorPresets = [
    { name: '经典黑', fg: '#000000', bg: '#ffffff' },
    { name: '深色模式', fg: '#ffffff', bg: '#1f2937' },
    { name: 'GitHub绿', fg: '#238636', bg: '#f6f8fa' },
    { name: 'Twitter蓝', fg: '#1da1f2', bg: '#ffffff' },
    { name: '微信绿', fg: '#07c160', bg: '#ffffff' },
    { name: '红风主题', fg: '#ef4444', bg: '#1a1a1a' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-red-500 to-red-700 bg-clip-text text-transparent mb-6">
          二维码生成器
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：控制面板 */}
          <div className="space-y-6">
            {/* 文本输入 */}
            <div className="bg-neutral-900/80 rounded-lg shadow-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
              <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20">
                <label className="block text-sm font-medium text-neutral-200">
                  二维码内容
                </label>
              </div>
              <div className="p-4">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full h-32 p-3 bg-neutral-800 border border-red-500/30 rounded-lg 
                           text-neutral-200 placeholder:text-neutral-500
                           focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none
                           resize-none"
                  placeholder="输入文本、URL或任何内容..."
                />
                <p className="mt-2 text-sm text-neutral-400">
                  当前长度: {text.length} 字符
                </p>
              </div>
            </div>

            {/* 尺寸控制 */}
            <div className="bg-neutral-900/80 rounded-lg shadow-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
              <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20">
                <label className="block text-sm font-medium text-neutral-200">
                  尺寸: {qrSize}px
                </label>
              </div>
              <div className="p-4">
                <input
                  type="range"
                  min="100"
                  max="500"
                  step="10"
                  value={qrSize}
                  onChange={(e) => setQrSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer
                           [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4"
                />
                <div className="flex justify-between text-xs text-neutral-500 mt-2">
                  <span>100px</span>
                  <span>300px</span>
                  <span>500px</span>
                </div>
              </div>
            </div>

            {/* 颜色控制 */}
            <div className="bg-neutral-900/80 rounded-lg shadow-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
              <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20">
                <label className="block text-sm font-medium text-neutral-200">
                  颜色设置
                </label>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">
                      前景色
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={qrFgColor}
                        onChange={(e) => setQrFgColor(e.target.value)}
                        className="w-12 h-12 cursor-pointer rounded border border-red-500/30 bg-neutral-800"
                      />
                      <input
                        type="text"
                        value={qrFgColor}
                        onChange={(e) => setQrFgColor(e.target.value)}
                        className="flex-1 p-2 border border-red-500/30 rounded 
                                 bg-neutral-800 text-neutral-200 outline-none
                                 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-2">
                      背景色
                    </label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={qrBgColor}
                        onChange={(e) => setQrBgColor(e.target.value)}
                        className="w-12 h-12 cursor-pointer rounded border border-red-500/30 bg-neutral-800"
                      />
                      <input
                        type="text"
                        value={qrBgColor}
                        onChange={(e) => setQrBgColor(e.target.value)}
                        className="flex-1 p-2 border border-red-500/30 rounded 
                                 bg-neutral-800 text-neutral-200 outline-none
                                 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 颜色预设 */}
            <div className="bg-neutral-900/80 rounded-lg shadow-lg border border-red-500/20 overflow-hidden backdrop-blur-sm">
              <div className="bg-red-500/10 px-4 py-3 border-b border-red-500/20">
                <label className="block text-sm font-medium text-neutral-200">
                  颜色预设
                </label>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setQrFgColor(preset.fg);
                        setQrBgColor(preset.bg);
                      }}
                      className="px-3 py-2 text-sm rounded-lg border border-red-500/30 
                               hover:bg-red-500/10 transition-all duration-200"
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
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={downloadQRCode}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                         hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25
                         flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                下载PNG
              </button>

              <button
                onClick={copyQRCode}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg 
                         hover:from-green-700 hover:to-green-800 transition-all shadow-lg shadow-green-500/25
                         flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                复制图片
              </button>

              <button
                onClick={resetToDefaults}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg 
                         hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-500/25"
              >
                重置
              </button>
            </div>
          </div>

          {/* 右侧：二维码预览 */}
          <div className="flex flex-col items-center justify-start space-y-6">
            <div className="bg-neutral-900/80 rounded-lg shadow-lg border border-red-500/20 p-6 backdrop-blur-sm">
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
            <div className="w-full bg-neutral-900/80 rounded-lg border border-red-500/20 p-4 backdrop-blur-sm">
              <h3 className="font-medium text-neutral-200 mb-3 flex items-center gap-2">
                <span className="text-red-400">📊</span> 二维码信息
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-red-500/10 pb-2">
                  <span className="text-neutral-400">容错级别</span>
                  <span className="font-mono text-neutral-200">{level}</span>
                </div>
                <div className="flex justify-between border-b border-red-500/10 pb-2">
                  <span className="text-neutral-400">尺寸</span>
                  <span className="font-mono text-neutral-200">
                    {qrSize} × {qrSize}px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">边距</span>
                  <span className="font-mono text-neutral-200">
                    {includeMargin ? '有' : '无'}
                  </span>
                </div>
              </div>
            </div>

            {/* 预览提示 */}
            <div className="text-center">
              <p className="text-sm text-neutral-400">
                💡 使用手机扫描测试二维码
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;