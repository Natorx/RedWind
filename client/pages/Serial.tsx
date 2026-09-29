/**
 * client/pages/Serial.tsx
 * @Author: Fofow
 * @Date: 2026/9/30
 * @Description: 单片机调试 - ESP32 串口连接与日志查看（MVP）
 * @Copyright: Copyright (©) 2026 Fofow. All rights reserved.
 */
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';

interface SerialPortInfo {
  port_name: string;
  port_type: string;
}

interface SerialStatus {
  connected: boolean;
  port: string | null;
  baud_rate: number | null;
  last_seq: number;
}

interface SerialLine {
  seq: number;
  ts: number;
  kind: 'rx' | 'tx' | 'sys' | string;
  text: string;
}

/** 常用波特率 */
const BAUD_RATES = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600];

/** 轮询间隔（毫秒） */
const POLL_INTERVAL = 250;

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

const formatTime = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
    d.getMilliseconds(),
    3,
  )}`;
};

/** 每个 kind 对应的颜色样式 */
const kindStyle: Record<string, string> = {
  rx: 'text-emerald-300',
  tx: 'text-sky-300',
  sys: 'text-amber-400 italic',
};

const kindLabel: Record<string, string> = {
  rx: 'RX',
  tx: 'TX',
  sys: 'SYS',
};

const Serial: React.FC = () => {
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [portName, setPortName] = useState('');
  const [baudRate, setBaudRate] = useState(115200);
  const [status, setStatus] = useState<SerialStatus>({
    connected: false,
    port: null,
    baud_rate: null,
    last_seq: 0,
  });
  const [lines, setLines] = useState<SerialLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  /** 行尾追加：none / LF / CRLF */
  const [lineEnding, setLineEnding] = useState<'none' | 'lf' | 'crlf'>('lf');
  const [autoPoll, setAutoPoll] = useState(true);

  const cursorRef = useRef(0);
  const terminalRef = useRef<HTMLDivElement>(null);

  /** 刷新串口列表 */
  const refreshPorts = useCallback(async () => {
    try {
      const list = await invoke<SerialPortInfo[]>('serial_list_ports');
      setPorts(list);
      // 首次加载时优先选中疑似 ESP32 的 USB 串口
      if (list.length > 0) {
        setPortName((prev) => {
          if (prev && list.some((p) => p.port_name === prev)) return prev;
          const usb = list.find((p) => p.port_type.toLowerCase().includes('usb'));
          return (usb ?? list[0]).port_name;
        });
      }
    } catch (e) {
      console.error('枚举串口失败:', e);
    }
  }, []);

  /** 拉取新增日志 */
  const pollLogs = useCallback(async () => {
    try {
      const fresh = await invoke<SerialLine[]>('serial_read_logs', {
        sinceSeq: cursorRef.current,
      });
      if (fresh.length > 0) {
        cursorRef.current = fresh[fresh.length - 1].seq;
        setLines((prev) => {
          const merged = [...prev, ...fresh];
          // 前端同样保留上限，防止 DOM 节点无限增长
          return merged.length > 3000 ? merged.slice(merged.length - 3000) : merged;
        });
      }
    } catch (e) {
      console.error('拉取日志失败:', e);
    }
  }, []);

  /** 同步连接状态 */
  const pollStatus = useCallback(async () => {
    try {
      const s = await invoke<SerialStatus>('serial_status');
      setStatus(s);
    } catch (e) {
      console.error('读取串口状态失败:', e);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    refreshPorts();
    pollStatus();
  }, [refreshPorts, pollStatus]);

  // 轮询日志与状态
  useEffect(() => {
    if (!autoPoll) return;
    const timer = setInterval(() => {
      pollLogs();
      if (!status.connected) pollStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [autoPoll, pollLogs, pollStatus, status.connected]);

  // 自动滚动到底部
  useEffect(() => {
    if (!autoScroll) return;
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, autoScroll]);

  /** 连接 */
  const handleConnect = async () => {
    if (!portName) {
      alert('请先选择串口');
      return;
    }
    setBusy(true);
    try {
      const s = await invoke<SerialStatus>('serial_connect', {
        options: { port_name: portName, baud_rate: Number(baudRate) },
      });
      setStatus(s);
      // 连接后从头拉取，拿到"已连接"系统日志
      cursorRef.current = 0;
      await pollLogs();
    } catch (e) {
      alert(`连接失败:\n${e}`);
    } finally {
      setBusy(false);
    }
  };

  /** 断开 */
  const handleDisconnect = async () => {
    setBusy(true);
    try {
      const s = await invoke<SerialStatus>('serial_disconnect');
      setStatus(s);
      await pollLogs();
    } catch (e) {
      alert(`断开失败:\n${e}`);
    } finally {
      setBusy(false);
    }
  };

  /** 发送 */
  const handleSend = async () => {
    if (!input) return;
    const ending = lineEnding === 'lf' ? '\n' : lineEnding === 'crlf' ? '\r\n' : '';
    const payload = input + ending;
    try {
      await invoke('serial_write', { data: payload });
      setInput('');
      await pollLogs();
    } catch (e) {
      alert(`发送失败:\n${e}`);
    }
  };

  /** 复位 ESP32：触发启动 banner 输出 */
  const handleReset = async () => {
    try {
      await invoke('serial_reset');
      await pollLogs();
    } catch (e) {
      alert(`复位失败:\n${e}`);
    }
  };

  /** 清空日志 */
  const handleClear = async () => {
    try {
      await invoke('serial_clear_logs');
      setLines([]);
      // 重新对齐游标，避免清空后再次拉到旧内容
      const s = await invoke<SerialStatus>('serial_status');
      cursorRef.current = s.last_seq;
    } catch (e) {
      console.error('清空日志失败:', e);
    }
  };

  const { connected } = status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-neutral-900 p-4 flex flex-col">
      <div className="max-w-1100px w-full mx-auto px-4 flex-1 flex flex-col">
        {/* 连接配置 */}
        <div className="mb-4">
          <h3 className="text-red-300 mb-3">🔌 串口连接</h3>

          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block mb-1 text-neutral-400 text-sm">端口</label>
              <div className="flex gap-2">
                <select
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  disabled={connected || busy}
                  className="px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
                >
                  {ports.length === 0 && <option value="">未检测到串口</option>}
                  {ports.map((p) => (
                    <option key={p.port_name} value={p.port_name}>
                      {p.port_name} ({p.port_type})
                    </option>
                  ))}
                </select>
                <button
                  onClick={refreshPorts}
                  disabled={connected || busy}
                  className="px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-300 cursor-pointer hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="刷新串口列表"
                >
                  ⟳
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1 text-neutral-400 text-sm">波特率</label>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={connected || busy}
                className="px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              >
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={connected ? handleDisconnect : handleConnect}
              disabled={busy || (!connected && !portName)}
              className={`px-5 py-2 rounded font-600 cursor-pointer border-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                connected
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {busy ? '处理中…' : connected ? '断开' : '连接'}
            </button>

            <button
              onClick={handleReset}
              disabled={!connected || busy}
              className="px-4 py-2 rounded border border-amber-500/40 bg-neutral-800 text-amber-300 cursor-pointer hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="拉低 DTR 触发 ESP32 复位，可看到启动 banner"
            >
              ⟳ 复位
            </button>

            <div className="flex items-center gap-2 pb-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-neutral-500'
                }`}
              />
              <span className="text-sm text-neutral-300">
                {connected ? `已连接 ${status.port} @ ${status.baud_rate}` : '未连接'}
              </span>
            </div>
          </div>
        </div>

        {/* 终端日志 */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-red-300">📋 串口日志</h3>
            <div className="flex items-center gap-3 text-sm text-neutral-400">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                自动滚动
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPoll}
                  onChange={(e) => setAutoPoll(e.target.checked)}
                />
                实时刷新
              </label>
              <span>共 {lines.length} 条</span>
              <button
                onClick={handleClear}
                className="px-3 py-1 rounded border border-red-500/30 bg-neutral-800 text-neutral-300 cursor-pointer hover:bg-neutral-700"
              >
                清空
              </button>
            </div>
          </div>

          <div
            ref={terminalRef}
            className="h-50vh min-h-300px overflow-y-auto rounded border border-red-500/20 bg-black/60 p-3 font-mono text-sm leading-relaxed"
          >
            {lines.length === 0 ? (
              <div className="text-neutral-500">
                暂无日志。连接串口后，ESP32 的串口输出会显示在这里。
              </div>
            ) : (
              lines.map((l) => (
                <div key={l.seq} className="whitespace-pre-wrap break-all">
                  <span className="text-neutral-600 select-none">[{formatTime(l.ts)}] </span>
                  <span
                    className={`select-none ${
                      l.kind === 'rx'
                        ? 'text-emerald-500'
                        : l.kind === 'tx'
                          ? 'text-sky-500'
                          : 'text-amber-600'
                    }`}
                  >
                    {kindLabel[l.kind] ?? l.kind}{' '}
                  </span>
                  <span className={kindStyle[l.kind] ?? 'text-neutral-200'}>{l.text}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 发送区 */}
        <div className="mt-3 flex gap-3 items-end">
          <div className="flex-1">
            <label className="block mb-1 text-neutral-400 text-sm">发送内容</label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!connected}
              placeholder={connected ? '输入要发送的数据，回车发送…' : '请先连接串口'}
              className="w-full px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 font-mono outline-none focus:ring-1 focus:ring-red-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block mb-1 text-neutral-400 text-sm">行尾</label>
            <select
              value={lineEnding}
              onChange={(e) => setLineEnding(e.target.value as 'none' | 'lf' | 'crlf')}
              className="px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="none">无</option>
              <option value="lf">LF (\n)</option>
              <option value="crlf">CRLF (\r\n)</option>
            </select>
          </div>

          <button
            onClick={handleSend}
            disabled={!connected || !input}
            className="px-5 py-2 rounded bg-emerald-600 text-white font-600 cursor-pointer border-none hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
};

export default Serial;
