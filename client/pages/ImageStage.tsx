/**
 * client/pages/ImageStage.tsx
 * @Description: 图片暂存 —— 一键把剪贴板图片存入临时图库，并可 scp 传到远程主机
 *
 * 依赖的后端命令见 src-tauri/src/mods/clipboard_image.rs
 */
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Trash2,
  Upload,
  FolderOpen,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Server,
  Pencil,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import PageBox from '../components/PageBox';
import Modal from '../components/Modal';
import { useMsg } from '../components/Msg';

/* ==================== 类型 ==================== */

interface StagedImage {
  id: number;
  file_name: string;
  path: string;
  title: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  source: string;
  created_at: string;
  uploaded: boolean;
  uploaded_to: string;
}

interface SshHost {
  id: number;
  name: string;
  host: string;
  port: number;
  user: string;
  remote_dir: string;
  key_path: string;
  created_at: string;
}

interface ImageStats {
  count: number;
  bytes: number;
  uploaded: number;
  dir: string;
}

interface TransferResult {
  ok: boolean;
  sent: number;
  failed: number;
  errors: string[];
  target: string;
}

interface TestResult {
  ok: boolean;
  dirExists: boolean;
  stdout: string;
  stderr: string;
  /** 失败时后端给出的可操作中文提示，优先展示 */
  hint: string;
  /** 本次实际使用的私钥路径，便于排查 */
  keyUsed: string;
  target: string;
}

const EMPTY_HOST = {
  name: '',
  host: '',
  port: 22,
  user: '',
  remote_dir: '',
  key_path: '',
};

/* ==================== 工具 ==================== */

/** 字节数转可读体积 */
function humanSize(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** ISO 时间 -> 本地可读时间 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
}

/* ==================== 主页面 ==================== */

const ImageStage: React.FC = () => {
  const { showMsg } = useMsg();

  const [images, setImages] = useState<StagedImage[]>([]);
  const [stats, setStats] = useState<ImageStats | null>(null);
  const [hosts, setHosts] = useState<SshHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 正在抓取剪贴板 */
  const [capturing, setCapturing] = useState(false);
  /** 选中要传输的图片 id */
  const [selected, setSelected] = useState<Set<number>>(new Set());
  /** 当前选中的主机 id */
  const [hostId, setHostId] = useState<number | null>(null);
  /** 传输中 */
  const [transferring, setTransferring] = useState(false);
  /** 连通性测试中 */
  const [testing, setTesting] = useState(false);
  /** 上次测试结果 */
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  /** 主机编辑弹窗 */
  const [hostFormOpen, setHostFormOpen] = useState(false);
  const [hostForm, setHostForm] = useState({ ...EMPTY_HOST });
  const [editingHostId, setEditingHostId] = useState<number | null>(null);
  const [savingHost, setSavingHost] = useState(false);
  const [hostError, setHostError] = useState('');

  /** 大图预览 */
  const [preview, setPreview] = useState<StagedImage | null>(null);

  /** 传输成功后询问是否删除图库内容 */
  const [askDelete, setAskDelete] = useState<{
    ids: number[];
    target: string;
  } | null>(null);

  const selectedHost = useMemo(
    () => hosts.find((h) => h.id === hostId) ?? null,
    [hosts, hostId],
  );

  /* ---------- 数据加载 ---------- */

  const refresh = useCallback(async () => {
    try {
      const [list, st] = await Promise.all([
        invoke<StagedImage[]>('list_images'),
        invoke<ImageStats>('image_stats'),
      ]);
      setImages(list);
      setStats(st);
      setError(null);
      // 选中的项若已被删除，同步剔除
      setSelected((prev) => {
        const alive = new Set(list.map((i) => i.id));
        const next = new Set([...prev].filter((id) => alive.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch (err) {
      setError(String(err));
      console.error('加载图库失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHosts = useCallback(async () => {
    try {
      const list = await invoke<SshHost[]>('list_ssh_hosts');
      setHosts(list);
      setHostId((prev) => {
        if (prev && list.some((h) => h.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      console.error('加载主机失败:', err);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void loadHosts();
  }, [refresh, loadHosts]);

  /* ---------- 一键暂存剪贴板 ---------- */

  const capture = useCallback(async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      // 剪贴板可能同时含多张图（多选图片文件复制），后端返回数组
      const imgs = await invoke<StagedImage[]>('capture_clipboard_image');
      if (imgs.length === 1) {
        const img = imgs[0];
        showMsg(`已暂存 ${img.width}×${img.height} 图片`, 'success', 2000);
      } else {
        showMsg(`已暂存 ${imgs.length} 张图片`, 'success', 2500);
      }
      await refresh();
    } catch (err) {
      showMsg(String(err), 'error', 3000);
    } finally {
      setCapturing(false);
    }
  }, [capturing, refresh, showMsg]);

  // 全局快捷键 Ctrl+Shift+V：截图后不用切回本页也能直接存
  const captureRef = useRef(capture);
  captureRef.current = capture;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        void captureRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ---------- 选择 ---------- */

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = images.length > 0 && selected.size === images.length;

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(images.map((i) => i.id)));
  };

  /* ---------- 删除 ---------- */

  const removeOne = async (img: StagedImage) => {
    if (!window.confirm(`确定删除「${img.title || img.file_name}」？`)) return;
    try {
      await invoke('delete_image', { id: img.id });
      showMsg('已删除', 'success', 1500);
      await refresh();
    } catch (err) {
      showMsg(`删除失败：${String(err)}`, 'error');
    }
  };

  const removeSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`确定删除选中的 ${selected.size} 张图片？`)) return;
    try {
      const n = await invoke<number>('delete_images', { ids: [...selected] });
      showMsg(`已删除 ${n} 张`, 'success', 1500);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      showMsg(`删除失败：${String(err)}`, 'error');
    }
  };

  const clearAll = async () => {
    if (images.length === 0) return;
    if (
      !window.confirm(
        `确定清空图库中的全部 ${images.length} 张图片？此操作不可恢复。`,
      )
    )
      return;
    try {
      const n = await invoke<number>('clear_images');
      showMsg(`已清空 ${n} 张`, 'success', 1500);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      showMsg(`清空失败：${String(err)}`, 'error');
    }
  };

  const openImageDir = async () => {
    try {
      const dir = await invoke<string>('images_directory');
      await invoke('open_path', { path: dir });
    } catch (err) {
      showMsg(`打开目录失败：${String(err)}`, 'error');
    }
  };

  /* ---------- 传输 ---------- */

  const testHost = async () => {
    if (!selectedHost) {
      showMsg('请先添加并选择目标主机', 'error');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await invoke<TestResult>('test_ssh_host', {
        hostId: selectedHost.id,
      });
      setTestResult(res);
      if (res.ok) {
        showMsg(
          res.dirExists
            ? '连接成功，目标目录存在'
            : '连接成功，但目标目录不存在',
          res.dirExists ? 'success' : 'info',
          3000,
        );
      } else {
        showMsg('连接失败', 'error', 3000);
      }
    } catch (err) {
      showMsg(`测试失败：${String(err)}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const doTransfer = async () => {
    if (!selectedHost) {
      showMsg('请先添加并选择目标主机', 'error');
      return;
    }
    if (selected.size === 0) {
      showMsg('请先选择要传输的图片', 'error');
      return;
    }

    setTransferring(true);
    try {
      const res = await invoke<TransferResult>('transfer_images', {
        hostId: selectedHost.id,
        ids: [...selected],
      });

      if (res.sent > 0) {
        showMsg(`成功传输 ${res.sent} 张到 ${res.target}`, 'success', 3500);
      }
      if (res.failed > 0) {
        showMsg(`${res.failed} 张传输失败：${res.errors[0]}`, 'error', 5000);
      }

      await refresh();

      // 全部成功才询问是否清理，部分失败时保留以便重传
      if (res.sent > 0 && res.failed === 0) {
        setAskDelete({ ids: [...selected], target: res.target });
      }
    } catch (err) {
      showMsg(`传输失败：${String(err)}`, 'error', 4000);
    } finally {
      setTransferring(false);
    }
  };

  /** 传输成功后的清理询问：确认删除已传走的图片 */
  const confirmCleanup = async () => {
    if (!askDelete) return;
    try {
      const n = await invoke<number>('delete_images', { ids: askDelete.ids });
      showMsg(`已从图库删除 ${n} 张`, 'success', 2000);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      showMsg(`删除失败：${String(err)}`, 'error');
    } finally {
      setAskDelete(null);
    }
  };

  /* ---------- 主机表单 ---------- */

  const openHostForm = (h?: SshHost) => {
    if (h) {
      setEditingHostId(h.id);
      setHostForm({
        name: h.name,
        host: h.host,
        port: h.port,
        user: h.user,
        remote_dir: h.remote_dir,
        key_path: h.key_path,
      });
    } else {
      setEditingHostId(null);
      setHostForm({ ...EMPTY_HOST });
    }
    setHostError('');
    setHostFormOpen(true);
  };

  const saveHost = async () => {
    setSavingHost(true);
    setHostError('');
    try {
      await invoke('save_ssh_host', {
        id: editingHostId,
        hostInput: hostForm,
      });
      showMsg(editingHostId ? '主机已更新' : '主机已添加', 'success', 2000);
      setHostFormOpen(false);
      await loadHosts();
    } catch (err) {
      setHostError(String(err));
    } finally {
      setSavingHost(false);
    }
  };

  const removeHost = async () => {
    if (!selectedHost) return;
    if (!window.confirm(`确定删除主机「${selectedHost.name}」？`)) return;
    try {
      await invoke('delete_ssh_host', { id: selectedHost.id });
      showMsg('主机已删除', 'success', 1500);
      setTestResult(null);
      await loadHosts();
    } catch (err) {
      showMsg(`删除失败：${String(err)}`, 'error');
    }
  };

  /* ---------- 渲染 ---------- */

  return (
    <PageBox>
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* 顶部操作条 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => void capture()}
              disabled={capturing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer
                  bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {capturing ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Clipboard size={16} />
              )}
              {capturing ? '读取中…' : '暂存剪贴板图片'}
            </button>
            <span className="text-[0.688rem] text-gray-500">
              或按 Ctrl+Shift+V
            </span>
          </div>

          <div className="flex items-center gap-2">
            {stats && (
              <span className="text-xs text-gray-400 mr-1">
                {stats.count} 张 · {humanSize(stats.bytes)}
              </span>
            )}
            <button
              onClick={() => void openImageDir()}
              title="打开图库文件夹"
              className="p-2 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                  border-none hover:bg-red-500 hover:text-white transition-colors"
            >
              <FolderOpen size={15} />
            </button>
            <button
              onClick={() => void refresh()}
              title="刷新"
              className="p-2 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                  border-none hover:bg-red-500 hover:text-white transition-colors"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4 text-xs text-red-500">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-5 items-start flex-col lg:flex-row">
          {/* 左：图库 */}
          <section className="flex-1 min-w-0 w-full">
            {/* 批量操作条 */}
            {images.length > 0 && (
              <div
                className="flex flex-wrap items-center gap-3 mb-3 px-3 py-2
                  bg-neutral-900/80 rounded-xl border border-red-500/15"
              >
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer
                      bg-transparent border-none hover:text-white transition-colors"
                >
                  {allSelected ? (
                    <CheckSquare size={14} />
                  ) : (
                    <Square size={14} />
                  )}
                  {allSelected ? '取消全选' : '全选'}
                </button>
                <span className="text-xs text-gray-500">
                  已选 {selected.size} 张
                </span>
                {selected.size > 0 && (
                  <button
                    onClick={() => void removeSelected()}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md
                        bg-red-500/20 text-red-400 cursor-pointer border-none
                        hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 size={12} />
                    删除选中
                  </button>
                )}
                <button
                  onClick={() => void clearAll()}
                  className="ml-auto text-xs px-2.5 py-1 rounded-md bg-gray-700/60 text-gray-300
                      cursor-pointer border-none hover:bg-red-500 hover:text-white transition-colors"
                >
                  清空图库
                </button>
              </div>
            )}

            {loading ? (
              <div className="text-center py-16 text-sm text-gray-500">
                加载中…
              </div>
            ) : images.length === 0 ? (
              <div className="text-center py-16 px-5 bg-neutral-900/80 rounded-xl border border-red-500/15">
                <Clipboard size={36} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm text-gray-400">图库还是空的</p>
                <p className="text-xs text-gray-500 mt-1">
                  复制一张图片（截图后 Ctrl+C），再点上方「暂存剪贴板图片」
                </p>
              </div>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                {images.map((img) => {
                  const isSel = selected.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`group relative rounded-xl overflow-hidden border transition-colors
                          bg-neutral-900/80 ${
                            isSel
                              ? 'border-red-500'
                              : 'border-red-500/15 hover:border-red-500/40'
                          }`}
                    >
                      {/* 缩略图 */}
                      <button
                        onClick={() => setPreview(img)}
                        title="点击预览"
                        className="block w-full aspect-video bg-neutral-950 cursor-pointer border-none p-0"
                      >
                        <img
                          src={convertFileSrc(img.path)}
                          alt={img.title || img.file_name}
                          loading="lazy"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                          }}
                        />
                      </button>

                      {/* 选中框 */}
                      <button
                        onClick={() => toggleSelect(img.id)}
                        title={isSel ? '取消选择' : '选择'}
                        className={`absolute top-2 left-2 w-6 h-6 rounded-md flex items-center
                            justify-center cursor-pointer border transition-all ${
                              isSel
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-black/50 border-white/30 text-transparent opacity-0 group-hover:opacity-100'
                            }`}
                      >
                        <Check size={14} />
                      </button>

                      {/* 已上传标记 */}
                      {img.uploaded && (
                        <span
                          title={`已传输到 ${img.uploaded_to}`}
                          className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[0.625rem]
                              bg-emerald-500/90 text-white"
                        >
                          已传
                        </span>
                      )}

                      {/* 信息 + 操作 */}
                      <div className="p-2.5">
                        <div
                          className="text-[0.75rem] text-white truncate"
                          title={img.title || img.file_name}
                        >
                          {img.title || img.file_name}
                        </div>
                        <div className="text-[0.625rem] text-gray-500 mt-0.5 truncate">
                          {img.width}×{img.height} · {humanSize(img.bytes)}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[0.625rem] text-gray-600">
                            {formatTime(img.created_at)}
                          </span>
                          <button
                            onClick={() => void removeOne(img)}
                            title="删除"
                            className="p-1 rounded bg-gray-700/60 text-gray-300 cursor-pointer
                                border-none hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 右：传输面板 */}
          <aside
            className="w-full lg:w-80 shrink-0 bg-neutral-900/80 rounded-xl
              border border-red-500/15 overflow-hidden lg:sticky lg:top-6"
          >
            <div
              className="px-4 pt-3.5 pb-3 border-b border-red-500/15
                flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Server size={15} className="text-red-400" />
                <h2 className="text-[0.813rem] font-semibold text-white">
                  文件传输
                </h2>
              </div>
              <button
                onClick={() => openHostForm()}
                title="添加主机"
                className="p-1.5 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                    border-none hover:bg-red-500 hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              {hosts.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-400">还没有可传输的主机</p>
                  <button
                    onClick={() => openHostForm()}
                    className="mt-3 px-3 py-1.5 text-xs rounded-md bg-red-500 text-white
                        cursor-pointer border-none hover:bg-red-600 transition-colors"
                  >
                    添加主机
                  </button>
                </div>
              ) : (
                <>
                  {/* 主机选择 */}
                  <div>
                    <label className="block text-[0.688rem] text-gray-400 mb-1.5">
                      目标主机
                    </label>
                    <select
                      value={hostId ?? ''}
                      onChange={(e) => {
                        setHostId(
                          e.target.value ? Number(e.target.value) : null,
                        );
                        setTestResult(null);
                      }}
                      className="w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20
                          rounded-lg text-white outline-none focus:border-red-500/60 transition-colors"
                    >
                      {hosts.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedHost && (
                    <>
                      <div
                        className="text-[0.688rem] text-gray-500 leading-relaxed
                          bg-neutral-800/50 rounded-lg p-2.5 border border-red-500/10"
                      >
                        <div className="text-gray-300">
                          {selectedHost.user}@{selectedHost.host}:
                          {selectedHost.port}
                        </div>
                        <div className="mt-1 break-all">
                          目标：{selectedHost.remote_dir}
                        </div>
                        {selectedHost.key_path && (
                          <div className="mt-1 break-all">
                            密钥：{selectedHost.key_path}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => void testHost()}
                          disabled={testing}
                          className="flex-1 px-3 py-1.5 text-xs rounded-md bg-gray-700/60 text-gray-200
                              cursor-pointer border-none hover:bg-gray-600 transition-colors
                              disabled:opacity-50"
                        >
                          {testing ? '测试中…' : '测试连接'}
                        </button>
                        <button
                          onClick={() => openHostForm(selectedHost)}
                          title="编辑主机"
                          className="p-1.5 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                              border-none hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => void removeHost()}
                          title="删除主机"
                          className="p-1.5 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                              border-none hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* 测试结果 */}
                      {testResult && (
                        <div
                          className={`text-[0.688rem] rounded-lg p-2.5 border leading-relaxed ${
                            testResult.ok
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {testResult.ok ? (
                              <Check size={12} />
                            ) : (
                              <AlertCircle size={12} />
                            )}
                            {testResult.ok ? '连接成功' : '连接失败'}
                          </div>
                          {testResult.ok && !testResult.dirExists && (
                            <div className="mt-1 text-amber-400">
                              目标目录不存在，传输将失败
                            </div>
                          )}
                          {!testResult.ok && (
                            <div className="mt-1 leading-relaxed">
                              {/* 后端已把 SSH 英文报错翻译成可操作提示，优先展示 */}
                              {testResult.hint || testResult.stderr}
                            </div>
                          )}
                          {!testResult.ok && testResult.keyUsed && (
                            <div className="mt-1 break-all opacity-70">
                              使用的私钥：{testResult.keyUsed}
                            </div>
                          )}
                          {testResult.ok && testResult.keyUsed && (
                            <div className="mt-1 break-all opacity-70">
                              私钥：{testResult.keyUsed}
                            </div>
                          )}
                        </div>
                      )}

                      {/* 传输 */}
                      <button
                        onClick={() => void doTransfer()}
                        disabled={transferring || selected.size === 0}
                        className="flex items-center justify-center gap-2 w-full px-4 py-2 text-sm
                            font-medium rounded-lg cursor-pointer border-none transition-colors
                            bg-red-500 hover:bg-red-600 text-white
                            disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {transferring ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <Upload size={15} />
                        )}
                        {transferring
                          ? '传输中…'
                          : `传输 ${selected.size > 0 ? `${selected.size} 张` : '选中图片'}`}
                      </button>

                      {selected.size === 0 && (
                        <p className="text-[0.688rem] text-gray-500 text-center -mt-2">
                          在上方图库中勾选要传输的图片
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* 主机编辑弹窗 */}
      <Modal
        isOpen={hostFormOpen}
        onClose={() => setHostFormOpen(false)}
        title={editingHostId ? '编辑主机' : '添加主机'}
        size="lg"
      >
        <div className="flex flex-col gap-4">
          {[
            {
              key: 'name',
              label: '名称',
              ph: '便于识别的名字，如 服务器A（可留空）',
            },
            { key: 'host', label: '主机地址', ph: '如 192.168.101.6' },
            { key: 'user', label: '用户名', ph: '如 teabos' },
            {
              key: 'remote_dir',
              label: '目标路径',
              ph: '如 /home/teabos/pics',
            },
            {
              key: 'key_path',
              label: '私钥路径（选填）',
              ph: '留空则用默认密钥或 ssh-agent',
            },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-gray-400 mb-1.5">
                {f.label}
              </label>
              <input
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20 rounded-lg
                    text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition-colors"
                placeholder={f.ph}
                value={String(hostForm[f.key as keyof typeof hostForm] ?? '')}
                onChange={(e) =>
                  setHostForm({ ...hostForm, [f.key]: e.target.value })
                }
              />
            </div>
          ))}

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">端口</label>
            <input
              type="number"
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20 rounded-lg
                  text-white outline-none focus:border-red-500/60 transition-colors"
              value={hostForm.port}
              onChange={(e) =>
                setHostForm({ ...hostForm, port: Number(e.target.value) || 22 })
              }
            />
          </div>

          <p className="text-[0.688rem] text-gray-500 leading-relaxed">
            传输使用系统自带的 OpenSSH（scp）。请确保已配置免密登录：
            把公钥加入目标主机的
            ~/.ssh/authorized_keys，否则传输会因需要密码而失败。
          </p>

          {hostError && <p className="text-xs text-red-500">{hostError}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setHostFormOpen(false)}
              className="px-4 py-2 text-sm rounded-lg bg-gray-700/70 text-gray-300
                  cursor-pointer border-none hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => void saveHost()}
              disabled={savingHost}
              className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white cursor-pointer
                  border-none hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {savingHost ? '保存中…' : '保存'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 大图预览 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-[90vw] max-h-[90vh] bg-neutral-900 rounded-xl
                border border-red-500/30 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={convertFileSrc(preview.path)}
              alt={preview.title || preview.file_name}
              className="max-w-[90vw] max-h-[80vh] object-contain"
            />
            <div
              className="flex items-center justify-between gap-4 px-4 py-2.5
                border-t border-red-500/20 bg-neutral-900"
            >
              <div className="min-w-0">
                <div className="text-xs text-white truncate">
                  {preview.title || preview.file_name}
                </div>
                <div className="text-[0.625rem] text-gray-500">
                  {preview.width}×{preview.height} · {humanSize(preview.bytes)}{' '}
                  · {formatTime(preview.created_at)}
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="p-1.5 rounded-md bg-gray-700/60 text-gray-300 cursor-pointer
                    border-none hover:bg-red-500 hover:text-white transition-colors shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 传输成功后的清理询问 */}
      {askDelete && (
        <Modal
          isOpen
          onClose={() => setAskDelete(null)}
          title="传输完成"
          size="md"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/15 shrink-0">
                <Check size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white">
                  已成功传输 {askDelete.ids.length} 张图片
                </p>
                <p className="text-xs text-gray-400 mt-1 break-all">
                  目标：{askDelete.target}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-300">
              是否从图库中删除这些已传输的图片？
            </p>
            <p className="text-[0.688rem] text-gray-500 -mt-2">
              选择「保留」可继续在图库中查看，之后也能手动删除。
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setAskDelete(null);
                  setSelected(new Set());
                }}
                className="px-4 py-2 text-sm rounded-lg bg-gray-700/70 text-gray-300
                    cursor-pointer border-none hover:bg-gray-600 transition-colors"
              >
                保留
              </button>
              <button
                onClick={() => void confirmCleanup()}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white cursor-pointer
                    border-none hover:bg-red-600 transition-colors"
              >
                删除图库内容
              </button>
            </div>
          </div>
        </Modal>
      )}
    </PageBox>
  );
};

export default ImageStage;
