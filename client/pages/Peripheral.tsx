/**
 * client/pages/Peripheral.tsx
 * @Description: 外设调试 —— 由原「本地打印」与「单片机调试」两个模块合并而成
 *
 * 布局为上下两半，每半再分左右两栏：
 *   上半 打印机：左侧操作按钮（竖向）、右侧输入框（IP / 端口 / 打印内容，竖向）
 *   下半 单片机：左侧操作按钮（竖向）、右侧串口日志
 *
 * 两半的功能与原模块保持一致，仅重排布局，未改动任何后端命令。
 */
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMsg } from '../components/Msg';

/* ==================== 类型 ==================== */

interface PrintResult {
  success: boolean;
  message: string;
  preview?: string;
  error?: string;
}

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
  /** 日志来源：rx 接收 / tx 发送 / sys 系统提示；后端可能扩展新值，故用 string 兜底 */
  kind: 'rx' | 'tx' | 'sys' | (string & {});
  text: string;
}

/** 常用波特率 */
const BAUD_RATES = [
  9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600,
];

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

/** 每种日志类型对应的样式 */
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

/** 共用的输入框样式 */
const inputClass =
  'w-full px-3 py-2 rounded border border-red-500/30 bg-neutral-800 text-neutral-200 ' +
  'outline-none focus:ring-1 focus:ring-red-500 text-sm';

/** 共用的左侧按钮样式：整行铺满，便于竖向堆叠 */
const sideBtn =
  'w-full px-4 py-2 rounded text-sm font-medium border-none cursor-pointer ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left';

/* ==================== 主页面 ==================== */

const Peripheral: React.FC = () => {
  const { showMsg } = useMsg();

  /* ---------- 打印机状态 ---------- */
  const [text, setText] = useState('');
  const [ip, setIp] = useState('192.168.101.8');
  const [port, setPort] = useState(9100);
  const [printing, setPrinting] = useState(false);
  const [printResult, setPrintResult] = useState<PrintResult | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('');

  /* ---------- 串口状态 ---------- */
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

  const { connected } = status;

  /* ---------- 打印机操作 ---------- */

  const handleTest = async () => {
    setPrinting(true);
    setConnectionStatus('');
    try {
      const res = await invoke<{
        success: boolean;
        message: string;
        ip: string;
        port: number;
      }>('test_connection', { options: { ip: ip.trim(), port: Number(port) } });
      setConnectionStatus(res.message);
      showMsg(res.message, res.success ? 'success' : 'error', 3000);
    } catch (error) {
      const msg = `测试失败: ${String(error)}`;
      setConnectionStatus(msg);
      showMsg(msg, 'error', 3000);
    } finally {
      setPrinting(false);
    }
  };

  const handlePrint = async () => {
    if (!text.trim()) {
      showMsg('请输入要打印的文本内容', 'error');
      return;
    }
    setPrinting(true);
    setPrintResult(null);
    try {
      const res = await invoke<PrintResult>('print_text', {
        options: { text: text.trim(), ip: ip.trim(), port: Number(port) },
      });
      setPrintResult(res);
      if (res.success) {
        showMsg('打印成功', 'success', 2500);
      } else {
        showMsg(
          `打印失败: ${res.message}${res.error ? ' ' + res.error : ''}`,
          'error',
          4000,
        );
      }
    } catch (error) {
      setPrintResult({
        success: false,
        message: '系统调用失败',
        error: String(error),
      });
      showMsg('打印失败：系统错误，请检查后端服务', 'error', 4000);
    } finally {
      setPrinting(false);
    }
  };

  const handleClearPrint = () => {
    setText('');
    setPrintResult(null);
    setConnectionStatus('');
  };

  const setDefaultPrinter = () => {
    setIp('192.168.101.8');
    setPort(9100);
    showMsg('已恢复默认打印机配置', 'info', 2000);
  };

  /* ---------- 串口操作 ---------- */

  const refreshPorts = useCallback(async () => {
    try {
      const list = await invoke<SerialPortInfo[]>('serial_list_ports');
      setPorts(list);
      // 首次加载时优先选中疑似 ESP32 的 USB 串口
      if (list.length > 0) {
        setPortName((prev) => {
          if (prev && list.some((p) => p.port_name === prev)) return prev;
          const usb = list.find((p) =>
            p.port_type.toLowerCase().includes('usb'),
          );
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
          return merged.length > 3000
            ? merged.slice(merged.length - 3000)
            : merged;
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

  useEffect(() => {
    void refreshPorts();
    void pollStatus();
  }, [refreshPorts, pollStatus]);

  // 轮询日志与状态
  useEffect(() => {
    if (!autoPoll) return;
    const timer = setInterval(() => {
      void pollLogs();
      if (!status.connected) void pollStatus();
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [autoPoll, pollLogs, pollStatus, status.connected]);

  // 自动滚动到底部
  useEffect(() => {
    if (!autoScroll) return;
    const el = terminalRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines, autoScroll]);

  const handleConnect = async () => {
    if (!portName) {
      showMsg('请先选择串口', 'error');
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
      showMsg(`连接失败: ${String(e)}`, 'error', 4000);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      const s = await invoke<SerialStatus>('serial_disconnect');
      setStatus(s);
      await pollLogs();
    } catch (e) {
      showMsg(`断开失败: ${String(e)}`, 'error', 4000);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = async () => {
    if (!input) return;
    const ending =
      lineEnding === 'lf' ? '\n' : lineEnding === 'crlf' ? '\r\n' : '';
    try {
      await invoke('serial_write', { data: input + ending });
      setInput('');
      await pollLogs();
    } catch (e) {
      showMsg(`发送失败: ${String(e)}`, 'error', 4000);
    }
  };

  /** 复位 ESP32：触发启动 banner 输出 */
  const handleReset = async () => {
    try {
      await invoke('serial_reset');
      await pollLogs();
    } catch (e) {
      showMsg(`复位失败: ${String(e)}`, 'error', 4000);
    }
  };

  const handleClearLogs = async () => {
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

  /* ---------- 渲染 ---------- */

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-red-950 to-neutral-900 p-4">
      <div className="max-w-1400px mx-auto px-4 flex flex-col gap-5">
        {/* ==================== 上半：打印机 ==================== */}
        <section
          className="rounded-xl border border-red-500/20 bg-neutral-900/40 p-4
              grid gap-4 grid-cols-1 lg:grid-cols-[220px_1fr]"
        >
          {/* 左侧：操作按钮（竖向） */}
          <div className="flex flex-col gap-2">
            <h3 className="text-red-300 text-sm font-medium mb-1">🖨️ 打印机</h3>

            <button
              onClick={() => void handleTest()}
              disabled={printing}
              className={`${sideBtn} ${
                printing
                  ? 'bg-neutral-700 text-neutral-400'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {printing ? '⏳ 处理中…' : '🔌 测试连接'}
            </button>

            <button
              onClick={() => void handlePrint()}
              disabled={printing || !text.trim()}
              className={`${sideBtn} ${
                printing || !text.trim()
                  ? 'bg-neutral-700 text-neutral-400'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {printing ? '⏳ 处理中…' : '🖨️ 打印'}
            </button>

            <button
              onClick={handleClearPrint}
              className={`${sideBtn} bg-neutral-700 text-neutral-200 hover:bg-neutral-600`}
            >
              🗑️ 清空
            </button>

            <button
              onClick={setDefaultPrinter}
              className={`${sideBtn} bg-neutral-700 text-neutral-200 hover:bg-neutral-600`}
            >
              🔄 恢复默认
            </button>
          </div>

          {/* 右侧：输入框（竖向排列） */}
          <div className="flex flex-col gap-3 min-w-0">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-[1fr_140px]">
              <label className="block">
                <span className="block mb-1 text-neutral-400 text-xs">
                  IP 地址
                </span>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="例如: 192.168.101.8"
                  className={inputClass}
                />
              </label>

              <label className="block">
                <span className="block mb-1 text-neutral-400 text-xs">
                  端口号
                </span>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 9100)}
                  placeholder="9100"
                  className={inputClass}
                />
              </label>
            </div>

            <label className="block flex-1">
              <span className="block mb-1 text-neutral-400 text-xs">
                打印内容
              </span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="请输入要打印的文本内容..."
                className={`${inputClass} font-mono resize-y`}
              />
            </label>

            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-neutral-500">
                字符数: {text.length} | 预计打印长度:{' '}
                {Math.ceil(text.length / 32)} 行
              </span>

              {connectionStatus && (
                <span
                  className={
                    connectionStatus.includes('正常')
                      ? 'text-green-400'
                      : 'text-red-400'
                  }
                >
                  {connectionStatus}
                </span>
              )}
            </div>

            {printResult && (
              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  printResult.success
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}
              >
                <div>
                  {printResult.success ? '✅ ' : '❌ '}
                  {printResult.message}
                </div>
                {printResult.preview && (
                  <div className="text-neutral-400 mt-1">
                    预览: {printResult.preview}
                  </div>
                )}
                {printResult.error && (
                  <div className="text-neutral-400 mt-1 break-all">
                    详情: {printResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ==================== 下半：单片机调试 ==================== */}
        <section
          className="rounded-xl border border-red-500/20 bg-neutral-900/40 p-4
              grid gap-4 grid-cols-1 lg:grid-cols-[220px_1fr]"
        >
          {/* 左侧：操作按钮（竖向） */}
          <div className="flex flex-col gap-2">
            <h3 className="text-red-300 text-sm font-medium mb-1">
              🔌 单片机调试
            </h3>

            <label className="block">
              <span className="block mb-1 text-neutral-400 text-xs">端口</span>
              <div className="flex gap-1.5">
                <select
                  value={portName}
                  onChange={(e) => setPortName(e.target.value)}
                  disabled={connected || busy}
                  className={`${inputClass} flex-1 min-w-0 disabled:opacity-50`}
                >
                  {ports.length === 0 && <option value="">未检测到串口</option>}
                  {ports.map((p) => (
                    <option key={p.port_name} value={p.port_name}>
                      {p.port_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => void refreshPorts()}
                  disabled={connected || busy}
                  className="px-2.5 py-2 rounded border border-red-500/30 bg-neutral-800
                      text-neutral-300 cursor-pointer hover:bg-neutral-700
                      disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title="刷新串口列表"
                >
                  ⟳
                </button>
              </div>
            </label>

            <label className="block">
              <span className="block mb-1 text-neutral-400 text-xs">
                波特率
              </span>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={connected || busy}
                className={`${inputClass} disabled:opacity-50`}
              >
                {BAUD_RATES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={() =>
                void (connected ? handleDisconnect() : handleConnect())
              }
              disabled={busy || (!connected && !portName)}
              className={`${sideBtn} ${
                connected
                  ? 'bg-red-600 text-white hover:bg-red-500'
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {busy ? '处理中…' : connected ? '断开' : '连接'}
            </button>

            <button
              onClick={() => void handleReset()}
              disabled={!connected || busy}
              className={`${sideBtn} border border-amber-500/40 bg-neutral-800 text-amber-300 hover:bg-neutral-700`}
              title="拉低 DTR 触发 ESP32 复位，可看到启动 banner"
            >
              ⟳ 复位
            </button>

            <button
              onClick={() => void handleClearLogs()}
              className={`${sideBtn} bg-neutral-700 text-neutral-200 hover:bg-neutral-600`}
            >
              🗑️ 清空日志
            </button>

            {/* 连接状态 */}
            <div className="flex items-center gap-2 mt-1 px-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  connected ? 'bg-emerald-400' : 'bg-neutral-500'
                }`}
              />
              <span className="text-xs text-neutral-300 truncate">
                {connected ? `${status.port} @ ${status.baud_rate}` : '未连接'}
              </span>
            </div>
          </div>

          {/* 右侧：串口日志 */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-red-300 text-sm font-medium">📋 串口日志</h3>
              <div className="flex items-center gap-3 text-xs text-neutral-400">
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
              </div>
            </div>

            <div
              ref={terminalRef}
              className="h-[38vh] min-h-[220px] overflow-y-auto rounded border
                  border-red-500/20 bg-black/60 p-3 font-mono text-xs leading-relaxed"
            >
              {lines.length === 0 ? (
                <div className="text-neutral-500">
                  暂无日志。连接串口后，ESP32 的串口输出会显示在这里。
                </div>
              ) : (
                lines.map((l) => (
                  <div key={l.seq} className="whitespace-pre-wrap break-all">
                    <span className="text-neutral-600 select-none">
                      [{formatTime(l.ts)}]{' '}
                    </span>
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
                    <span className={kindStyle[l.kind] ?? 'text-neutral-200'}>
                      {l.text}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* 发送区 */}
            <div className="mt-2 flex gap-2 items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={!connected}
                placeholder={
                  connected ? '输入要发送的数据，回车发送…' : '请先连接串口'
                }
                className={`${inputClass} flex-1 font-mono disabled:opacity-50`}
              />
              <select
                value={lineEnding}
                onChange={(e) =>
                  setLineEnding(e.target.value as 'none' | 'lf' | 'crlf')
                }
                className={`${inputClass} w-auto`}
                title="行尾"
              >
                <option value="none">无</option>
                <option value="lf">LF</option>
                <option value="crlf">CRLF</option>
              </select>
              <button
                onClick={() => void handleSend()}
                disabled={!connected || !input}
                className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium
                    cursor-pointer border-none hover:bg-emerald-500
                    disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                发送
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Peripheral;
