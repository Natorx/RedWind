/**
 * client/pages/Release.tsx
 * @Description: 版本发布向导 —— 对一个项目目录执行发布流程
 *
 * 五步各自可选：
 *   1. 修改版本号（可多选具体文件）  2. 构建   3. 提取产物   4. git 提交   5. 推送
 *
 * 对应后端命令见 src-tauri/src/mods/release.rs
 * 构建日志通过 Tauri 事件 release://output 与 release://done 流式推送。
 */
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FolderOpen,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  Circle,
  Loader2,
  GitBranch,
  Package,
  Tag,
  Upload,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Save,
  Download,
  Trash2,
} from 'lucide-react';
import PageBox from '../components/PageBox';
import Drawer from '../components/Drawer';
import { useMsg } from '../components/Msg';

/* ==================== 类型 ==================== */

type ProjectKind = 'tauri' | 'node' | 'rust' | 'unknown';

interface VersionTarget {
  path: string;
  label: string;
  format: string;
  current: string;
  recommended: boolean;
}

interface ProjectInfo {
  root: string;
  name: string;
  kind: ProjectKind;
  languages: string[];
  version_targets: VersionTarget[];
  build_command: string;
  build_dir: string;
  artifact_dir: string;
  artifact_ext: string[];
  git_root: string;
  branch: string;
  upstream: string;
  dirty: boolean;
  note: string;
}

interface GitStatus {
  isRepo: boolean;
  branch?: string;
  upstream?: string;
  dirty?: boolean;
  changed?: number;
  ahead?: number;
}

/** 一份已保存的发布配置 */
interface SavedConfig {
  id: number;
  name: string;
  root: string;
  kind: string;
  do_version: boolean;
  do_build: boolean;
  do_extract: boolean;
  do_commit: boolean;
  do_push: boolean;
  new_version: string;
  version_files: string[];
  build_command: string;
  artifact_dir: string;
  extract_to: string;
  commit_message: string;
  force_push: boolean;
  created_at: string;
  updated_at: string;
}

/** 单步执行状态 */
type StepState = 'idle' | 'running' | 'ok' | 'failed' | 'skipped';

interface StepStatus {
  state: StepState;
  detail: string;
}

const KIND_LABEL: Record<ProjectKind, string> = {
  tauri: 'Tauri 应用',
  node: 'Node 项目',
  rust: 'Rust 项目',
  unknown: '未识别',
};

const EMPTY_STEP: StepStatus = { state: 'idle', detail: '' };

/* ==================== 主页面 ==================== */

const Release: React.FC = () => {
  const { showMsg } = useMsg();

  /* ---------- 项目 ---------- */
  const [root, setRoot] = useState('');
  const [info, setInfo] = useState<ProjectInfo | null>(null);
  const [scanning, setScanning] = useState(false);
  const [git, setGit] = useState<GitStatus | null>(null);

  /* ---------- 步骤开关 ---------- */
  const [doVersion, setDoVersion] = useState(true);
  const [doBuild, setDoBuild] = useState(true);
  const [doExtract, setDoExtract] = useState(true);
  const [doCommit, setDoCommit] = useState(true);
  const [doPush, setDoPush] = useState(true);

  /* ---------- 各步骤参数 ---------- */
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [newVersion, setNewVersion] = useState('');
  const [buildCommand, setBuildCommand] = useState('');
  const [artifactDir, setArtifactDir] = useState('');
  const [extractTo, setExtractTo] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [forcePush, setForcePush] = useState(false);

  /* ---------- 执行状态 ---------- */
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Record<number, StepStatus>>({});
  /** 左侧当前选中的步骤（1-4），右侧只渲染该项的详情 */
  const [activeStep, setActiveStep] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  /* ---------- 配置保存 / 导入 ---------- */
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => {
      const next = [...prev, line];
      return next.length > 4000 ? next.slice(next.length - 4000) : next;
    });
  }, []);

  /* ---------- 构建事件的流式输出 ---------- */
  useEffect(() => {
    const unlisten: Array<() => void> = [];
    void (async () => {
      unlisten.push(
        await listen<{ line: string }>('release://output', (e) => {
          appendLog(e.payload.line);
        }),
      );
      unlisten.push(
        await listen<{ ok: boolean; cancelled: boolean; code: number | null }>(
          'release://done',
          (e) => {
            const { ok, cancelled, code } = e.payload;
            appendLog(
              cancelled
                ? '构建已取消'
                : ok
                  ? '构建成功'
                  : `构建失败（退出码 ${code ?? '未知'}）`,
            );
          },
        ),
      );
    })();
    return () => unlisten.forEach((f) => f());
  }, [appendLog]);

  // 日志自动滚到底
  useEffect(() => {
    if (!autoScroll) return;
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log, autoScroll]);

  const setStep = (n: number, s: Partial<StepStatus>) =>
    setSteps((prev) => ({
      ...prev,
      [n]: { ...(prev[n] ?? EMPTY_STEP), ...s },
    }));

  /* ---------- 选择目录并扫描 ---------- */
  const chooseFolder = async () => {
    try {
      const picked = await open({
        directory: true,
        multiple: false,
        title: '选择项目目录',
      });
      if (typeof picked !== 'string') return;
      setRoot(picked);
      await scan(picked);
    } catch (e) {
      showMsg(`选择目录失败：${String(e)}`, 'error');
    }
  };

  const scan = async (dir: string) => {
    if (!dir.trim()) return;
    setScanning(true);
    try {
      const p = await invoke<ProjectInfo>('scan_project', { root: dir.trim() });
      setInfo(p);

      // 用扫描结果初始化各步骤参数
      setBuildCommand(p.build_command);
      setArtifactDir(p.artifact_dir);
      setExtractTo(p.kind === 'unknown' ? '' : `${p.root}\\release`);
      setSelectedFiles(
        new Set(
          p.version_targets.filter((t) => t.recommended).map((t) => t.path),
        ),
      );
      // 默认版本号：在当前版本基础上 patch +1
      const cur = p.version_targets.find((t) => t.current)?.current ?? '';
      setNewVersion(bumpPatch(cur));

      const g = await invoke<GitStatus>('git_status', { root: p.root });
      setGit(g);

      setSteps({});
      appendLog(`── 已加载项目：${p.name}（${KIND_LABEL[p.kind]}）──`);
      appendLog(p.note);
      if (p.kind === 'unknown') {
        showMsg('未能识别项目类型，请确认所选目录', 'error', 3500);
      }
    } catch (e) {
      showMsg(String(e), 'error', 4000);
    } finally {
      setScanning(false);
    }
  };

  /* ---------- 执行 ---------- */
  const anyEnabled = doVersion || doBuild || doExtract || doCommit || doPush;
  const enabledCount = [doVersion, doBuild, doCommit, doPush].filter(
    Boolean,
  ).length;
  const doneCount = useMemo(
    () => Object.values(steps).filter((s) => s.state === 'ok').length,
    [steps],
  );

  /** 当前版本号：取第一个能读到的文件的值 */
  const currentVersion = useMemo(
    () => info?.version_targets.find((t) => t.current)?.current ?? '',
    [info],
  );

  const run = async () => {
    if (!info || !root.trim()) {
      showMsg('请先选择项目目录', 'error');
      return;
    }
    if (!anyEnabled) {
      showMsg('至少勾选一个步骤', 'error');
      return;
    }

    setRunning(true);
    setSteps({});
    setLog([]);
    let stepNo = 0;

    /** 执行一步；抛错则中断后续 */
    const step = async (name: string, fn: () => Promise<string> | string) => {
      stepNo += 1;
      const n = stepNo;
      setStep(n, { state: 'running', detail: name });
      appendLog(`\n═══ ${n}. ${name} ═══`);
      try {
        const detail = await fn();
        setStep(n, { state: 'ok', detail });
        appendLog(`✔ ${name}：${detail}`);
        return true;
      } catch (e) {
        const msg = String(e);
        setStep(n, { state: 'failed', detail: msg });
        appendLog(`✖ ${name} 失败：${msg}`);
        return false;
      }
    };

    // 1. 版本号
    if (doVersion) {
      const ok = await step('修改版本号', async () => {
        const logs = await invoke<string[]>('apply_version', {
          root: info.root,
          files: [...selectedFiles],
          newVersion: newVersion.trim(),
        });
        logs.forEach((l) => appendLog('  ' + l));
        const bad = logs.filter((l) => l.startsWith('✖'));
        if (bad.length) throw new Error(bad.join('；'));
        return logs.join('；') || '已更新';
      });
      if (!ok) {
        setRunning(false);
        return;
      }
    } else {
      stepNo += 1;
      setStep(stepNo, { state: 'skipped', detail: '未启用' });
    }

    // 2. 构建项目（提取产物作为其子步骤，共用同一个步骤号）
    if (doBuild) {
      const ok = await step('构建项目', async () => {
        await invoke('run_build', {
          root: info.root,
          command: buildCommand.trim(),
          workDir: info.build_dir,
        });

        // 构建成功后再提取产物
        if (doExtract) {
          appendLog('\n── 提取产物 ──');
          const logs = await invoke<string[]>('extract_artifacts', {
            root: info.root,
            artifactDir: artifactDir.trim(),
            dest: extractTo.trim(),
            exts: info.artifact_ext,
          });
          logs.forEach((l) => appendLog('  ' + l));
          if (logs.some((l) => l.startsWith('⚠')))
            throw new Error(logs.join('；'));
        }
        return buildCommand.trim();
      });
      if (!ok) {
        setRunning(false);
        return;
      }
    } else {
      stepNo += 1;
      setStep(stepNo, { state: 'skipped', detail: '未启用' });
    }

    // 3. 提交
    if (doCommit) {
      const ok = await step('git 提交', async () => {
        const out = await invoke<string>('git_commit', {
          root: info.root,
          message:
            commitMessage.trim() || `chore(release): ${newVersion.trim()}`,
        });
        appendLog('  ' + out);
        return out.split('\n')[0] ?? '已提交';
      });
      if (!ok) {
        setRunning(false);
        return;
      }
    } else {
      stepNo += 1;
      setStep(stepNo, { state: 'skipped', detail: '未启用' });
    }

    // 4. 推送
    if (doPush) {
      const ok = await step('github 推送', async () => {
        const out = await invoke<string>('git_push', {
          root: info.root,
          force: forcePush,
        });
        appendLog('  ' + out);
        return out || '已推送';
      });
      if (!ok) {
        setRunning(false);
        return;
      }
    } else {
      stepNo += 1;
      setStep(stepNo, { state: 'skipped', detail: '未启用' });
    }

    setRunning(false);
    showMsg('发布流程完成', 'success', 3000);
    // 刷新 git 状态
    try {
      setGit(await invoke<GitStatus>('git_status', { root: info.root }));
    } catch {
      /* 忽略 */
    }
  };

  const cancel = async () => {
    try {
      const killed = await invoke<boolean>('cancel_build');
      showMsg(
        killed ? '已请求取消构建' : '当前没有正在运行的构建',
        'info',
        2500,
      );
    } catch (e) {
      showMsg(`取消失败：${String(e)}`, 'error');
    }
  };

  /** 单独选择「提取产物」的目标目录 */
  const chooseExtractDir = async () => {
    try {
      const picked = await open({
        directory: true,
        multiple: false,
        title: '选择目标目录',
      });
      if (typeof picked === 'string') setExtractTo(picked);
    } catch (e) {
      showMsg(`选择目录失败：${String(e)}`, 'error');
    }
  };

  /* ---------- 配置保存与导入 ---------- */

  /**
   * 保存当前配置。
   *
   * 同一个项目目录已有配置时后端会直接覆盖，所以这里不必先查重，
   * 用户可以反复点保存来更新同一份配置。
   */
  const saveConfig = async () => {
    if (!root.trim()) {
      showMsg('请先选择项目目录', 'error');
      return;
    }
    setSavingConfig(true);
    try {
      const saved = await invoke<SavedConfig>('save_release_config', {
        // 字段名遵循后端 ConfigInput 的 snake_case 命名
        config: {
          id: null,
          name: info?.name ?? '',
          root: root.trim(),
          kind: info?.kind ?? '',
          do_version: doVersion,
          do_build: doBuild,
          do_extract: doExtract,
          do_commit: doCommit,
          do_push: doPush,
          new_version: newVersion,
          version_files: [...selectedFiles],
          build_command: buildCommand,
          artifact_dir: artifactDir,
          extract_to: extractTo,
          commit_message: commitMessage,
          force_push: forcePush,
        },
      });
      showMsg(`配置已保存：${saved.name}`, 'success', 2500);
    } catch (e) {
      showMsg(`保存配置失败：${String(e)}`, 'error', 4000);
    } finally {
      setSavingConfig(false);
    }
  };

  /** 打开导入抽屉时拉取列表 */
  const openDrawer = async () => {
    try {
      setConfigs(await invoke<SavedConfig[]>('list_release_configs'));
    } catch (e) {
      showMsg(`读取配置列表失败：${String(e)}`, 'error');
      return;
    }
    setDrawerOpen(true);
  };

  /**
   * 导入一份配置：回填所有字段，并重新扫描该项目目录。
   *
   * 保存的 version_files 是上次勾选的路径；重新扫描后目录结构可能变了，
   * 因此只保留仍然存在的那些项，避免选到已不存在的文件。
   */
  const applyConfig = async (cfg: SavedConfig) => {
    setDrawerOpen(false);
    setRoot(cfg.root);
    setDoVersion(cfg.do_version);
    setDoBuild(cfg.do_build);
    setDoExtract(cfg.do_extract);
    setDoCommit(cfg.do_commit);
    setDoPush(cfg.do_push);
    setNewVersion(cfg.new_version);
    setBuildCommand(cfg.build_command);
    setArtifactDir(cfg.artifact_dir);
    setExtractTo(cfg.extract_to);
    setCommitMessage(cfg.commit_message);
    setForcePush(cfg.force_push);

    try {
      const p = await invoke<ProjectInfo>('scan_project', { root: cfg.root });
      setInfo(p);
      // 只保留仍然存在的版本号文件；若全都不存在则回落到推荐项
      const alive = new Set(p.version_targets.map((t) => t.path));
      const kept = cfg.version_files.filter((f) => alive.has(f));
      setSelectedFiles(
        new Set(
          kept.length > 0
            ? kept
            : p.version_targets.filter((t) => t.recommended).map((t) => t.path),
        ),
      );
      // 构建/产物目录若配置里为空，用扫描结果的默认值补齐
      if (!cfg.build_command) setBuildCommand(p.build_command);
      if (!cfg.artifact_dir) setArtifactDir(p.artifact_dir);

      const g = await invoke<GitStatus>('git_status', { root: p.root });
      setGit(g);

      setSteps({});
      appendLog(`── 已导入配置：${cfg.name} ──`);
      appendLog(cfg.root);
      showMsg(`已导入配置：${cfg.name}`, 'success', 2500);
    } catch (e) {
      showMsg(`导入后扫描失败：${String(e)}`, 'error', 4000);
    }
  };

  /** 删除一份配置 */
  const removeConfig = async (cfg: SavedConfig) => {
    if (!window.confirm(`确定删除配置「${cfg.name}」？`)) return;
    try {
      await invoke('delete_release_config', { id: cfg.id });
      setConfigs((prev) => prev.filter((c) => c.id !== cfg.id));
      showMsg('配置已删除', 'success', 2000);
    } catch (e) {
      showMsg(`删除失败：${String(e)}`, 'error');
    }
  };

  /** ISO 时间 → 简短本地时间 */
  const shortTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  return (
    <PageBox>
      <div className="px-6 pb-6 pt-5 max-w-[1400px] mx-auto">
        {/* ---- 项目选择：紧凑单行，未选目录时收在页面中上方 ---- */}
        <div
          className={`max-w-[900px] mx-auto ${info ? 'mb-4' : 'mt-[14vh] mb-0'}`}
        >
          <div className="bg-neutral-900/80 border border-red-500/15 rounded-xl px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => void chooseFolder()}
                disabled={running || scanning}
                className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium cursor-pointer
                    bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {scanning ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <FolderOpen size={15} />
                )}
                {scanning ? '分析中…' : '选择文件夹'}
              </button>

              <input
                type="text"
                value={root}
                onChange={(e) => setRoot(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void scan(root);
                }}
                placeholder="或粘贴项目路径后回车"
                className="flex-1 min-w-[200px] px-3 py-1.5 text-xs bg-neutral-800 border
                    border-red-500/20 rounded-lg text-neutral-200 placeholder-gray-600
                    outline-none focus:border-red-500/60 font-mono"
              />
              <button
                onClick={() => void scan(root)}
                disabled={running || scanning || !root.trim()}
                className="p-1.5 rounded-lg bg-neutral-700 text-neutral-200
                    cursor-pointer border-none hover:bg-neutral-600 transition-colors
                    disabled:opacity-50 shrink-0"
                title="重新分析"
              >
                <RefreshCw size={14} />
              </button>

              {/* 导入配置 */}
              <button
                onClick={() => void openDrawer()}
                disabled={running}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    rounded-lg bg-neutral-700 text-neutral-200 cursor-pointer border-none
                    hover:bg-neutral-600 transition-colors disabled:opacity-50 shrink-0"
                title="从已保存的配置中导入"
              >
                <Download size={14} />
                导入配置
              </button>
            </div>

            {/* 识别结果：单行紧凑 */}
            {info && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.688rem]">
                <span className="flex items-center gap-1.5">
                  <Package size={12} className="text-red-400" />
                  <span className="text-white font-medium">{info.name}</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded ${
                    info.kind === 'unknown'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {KIND_LABEL[info.kind]}
                </span>
                <span className="text-neutral-500">
                  {info.languages.join(' / ')}
                </span>
                {git?.isRepo && (
                  <span className="flex items-center gap-1 text-neutral-500">
                    <GitBranch size={11} />
                    {git.branch}
                    {git.upstream ? ` → ${git.upstream}` : ''}
                    {git.dirty && (
                      <span className="text-amber-400 flex items-center gap-1 ml-1">
                        <AlertTriangle size={11} />
                        {git.changed} 处未提交
                      </span>
                    )}
                  </span>
                )}
                {git && !git.isRepo && (
                  <span className="text-amber-400">不是 git 仓库</span>
                )}
              </div>
            )}
          </div>
        </div>

        {info && (
          <>
            {/* ---- 上：左列表 + 右单项详情 ---- */}
            <div className="flex gap-4 items-start flex-col lg:flex-row">
              {/* 左侧：步骤列表（点击切换右侧详情） */}
              <nav className="w-full lg:w-52 shrink-0">
                <ul className="flex flex-col gap-1">
                  <AnchorRow
                    active={activeStep === 1}
                    onClick={() => setActiveStep(1)}
                    enabled={doVersion}
                    status={steps[1]}
                    title="版本号"
                    extra={
                      newVersion
                        ? `${currentVersion} → ${newVersion}`
                        : currentVersion
                    }
                  />
                  <AnchorRow
                    active={activeStep === 2}
                    onClick={() => setActiveStep(2)}
                    enabled={doBuild}
                    status={steps[2]}
                    title="构建项目"
                    extra={
                      doBuild
                        ? `${buildCommand || '未填命令'}${doExtract ? ' + 提取' : ''}`
                        : ''
                    }
                  />
                  <AnchorRow
                    active={activeStep === 3}
                    onClick={() => setActiveStep(3)}
                    enabled={doCommit}
                    status={steps[3]}
                    title="git 提交"
                  />
                  <AnchorRow
                    active={activeStep === 4}
                    onClick={() => setActiveStep(4)}
                    enabled={doPush}
                    status={steps[4]}
                    title="github 推送"
                  />
                </ul>
              </nav>

              {/* 右侧：只渲染当前选中项的详情 */}
              <div className="flex-1 min-w-0 w-full">
                {activeStep === 1 && (
                  <StepCard
                    no={1}
                    title="版本号"
                    icon={<Tag size={15} />}
                    enabled={doVersion}
                    onToggle={setDoVersion}
                    disabled={running}
                    status={steps[1]}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-neutral-500">新版本号</span>
                      <input
                        value={newVersion}
                        onChange={(e) => setNewVersion(e.target.value)}
                        disabled={running}
                        placeholder="1.2.3"
                        className="w-40 px-3 py-1.5 text-sm bg-neutral-800 border border-red-500/20
                          rounded-lg text-neutral-200 outline-none focus:border-red-500/60 font-mono"
                      />
                    </div>
                    {info.version_targets.length === 0 ? (
                      <p className="text-xs text-neutral-500">
                        该项目未找到可修改的版本号文件
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {info.version_targets.map((t) => (
                          <li key={t.path}>
                            <label className="flex items-center gap-2 cursor-pointer text-xs py-1">
                              <input
                                type="checkbox"
                                checked={selectedFiles.has(t.path)}
                                disabled={running || t.format === 'cargo_lock'}
                                onChange={() => {
                                  setSelectedFiles((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(t.path)) next.delete(t.path);
                                    else next.add(t.path);
                                    return next;
                                  });
                                }}
                              />
                              <span className="text-neutral-300 font-mono">
                                {t.label}
                              </span>
                              {t.current && (
                                <span className="text-neutral-500">
                                  当前 {t.current}
                                </span>
                              )}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </StepCard>
                )}

                {activeStep === 2 && (
                  <StepCard
                    no={2}
                    title="构建项目"
                    icon={<Terminal size={15} />}
                    enabled={doBuild}
                    onToggle={setDoBuild}
                    disabled={running}
                    status={steps[2]}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-500 shrink-0">
                        命令
                      </span>
                      <input
                        value={buildCommand}
                        onChange={(e) => setBuildCommand(e.target.value)}
                        disabled={running}
                        placeholder="例如 npx tauri build"
                        className="flex-1 px-3 py-1.5 text-sm bg-neutral-800 border border-red-500/20
                          rounded-lg text-neutral-200 outline-none focus:border-red-500/60 font-mono"
                      />
                    </div>
                    {!buildCommand.trim() && doBuild && (
                      <p className="text-xs text-amber-400 mt-1.5">
                        未填写构建命令
                      </p>
                    )}

                    {/* 提取产物：作为构建的子选项 */}
                    <div className="mt-3 pt-3 border-t border-white/[0.07]">
                      <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={doExtract}
                          disabled={running || !doBuild}
                          onChange={(e) => setDoExtract(e.target.checked)}
                        />
                        构建后提取产物到指定路径
                      </label>

                      {doExtract && (
                        <div
                          className={`flex flex-col gap-2 mt-2.5 ${
                            doBuild ? '' : 'opacity-40 pointer-events-none'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 shrink-0 w-16">
                              产物目录
                            </span>
                            <input
                              value={artifactDir}
                              onChange={(e) => setArtifactDir(e.target.value)}
                              disabled={running}
                              placeholder="相对项目根，如 src-tauri/target/release/bundle/nsis"
                              className="flex-1 px-3 py-1.5 text-xs bg-neutral-800 border border-red-500/20
                                rounded-lg text-neutral-200 outline-none focus:border-red-500/60 font-mono"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 shrink-0 w-16">
                              目标路径
                            </span>
                            <input
                              value={extractTo}
                              onChange={(e) => setExtractTo(e.target.value)}
                              disabled={running}
                              placeholder="绝对路径"
                              className="flex-1 px-3 py-1.5 text-xs bg-neutral-800 border border-red-500/20
                                rounded-lg text-neutral-200 outline-none focus:border-red-500/60 font-mono"
                            />
                            <button
                              onClick={() => void chooseExtractDir()}
                              disabled={running}
                              className="p-1.5 rounded-lg bg-neutral-700 text-neutral-200
                                cursor-pointer border-none hover:bg-neutral-600 disabled:opacity-50"
                              title="选择目标目录"
                            >
                              <FolderOpen size={14} />
                            </button>
                          </div>
                          {info.artifact_ext.length > 0 && (
                            <p className="text-[0.688rem] text-neutral-500">
                              只复制以下扩展名：{info.artifact_ext.join(' ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </StepCard>
                )}

                {activeStep === 3 && (
                  <StepCard
                    no={3}
                    title="git 提交"
                    icon={<GitBranch size={15} />}
                    enabled={doCommit}
                    onToggle={setDoCommit}
                    disabled={running}
                    status={steps[3]}
                  >
                    <textarea
                      value={commitMessage}
                      onChange={(e) => setCommitMessage(e.target.value)}
                      disabled={running}
                      rows={2}
                      placeholder={`留空则用默认：chore(release): ${newVersion || '版本号'}`}
                      className="w-full px-3 py-2 text-sm bg-neutral-800 border border-red-500/20
                        rounded-lg text-neutral-200 outline-none focus:border-red-500/60 resize-y"
                    />
                    <p className="text-[0.688rem] text-neutral-500 mt-1">
                      多行备注会拆成多个 -m；执行 git add -A 后提交
                    </p>
                  </StepCard>
                )}

                {activeStep === 4 && (
                  <StepCard
                    no={4}
                    title="github 推送"
                    icon={<Upload size={15} />}
                    enabled={doPush}
                    onToggle={setDoPush}
                    disabled={running}
                    status={steps[4]}
                  >
                    <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forcePush}
                        disabled={running}
                        onChange={(e) => setForcePush(e.target.checked)}
                      />
                      使用 --force-with-lease（仅在上游被重写时需要）
                    </label>
                    <p className="text-[0.688rem] text-neutral-500 mt-1">
                      推送到当前分支的上游
                      {git?.upstream ? `（${git.upstream}）` : ''}
                    </p>
                  </StepCard>
                )}
              </div>
            </div>

            {/* ---- 下：开始执行卡片（通栏） ---- */}
            <section className="mt-4">
              <div className="bg-neutral-900/80 border border-red-500/15 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="text-sm text-neutral-300">
                    已启用{' '}
                    <span className="text-white font-medium">
                      {enabledCount}
                    </span>{' '}
                    步
                    {doneCount > 0 && (
                      <span className="text-neutral-500">
                        {' '}
                        · 已完成 {doneCount}
                      </span>
                    )}
                  </div>
                  {running ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void saveConfig()}
                        disabled={savingConfig || !root.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                            bg-neutral-700 text-neutral-200 cursor-pointer border-none
                            hover:bg-neutral-600 transition-colors disabled:opacity-50"
                        title="保存当前配置"
                      >
                        <Save size={12} />
                        保存配置
                      </button>
                      <button
                        onClick={() => void cancel()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
                            bg-red-500/20 text-red-300 border border-red-500/40 cursor-pointer
                            hover:bg-red-500/30 transition-colors"
                      >
                        <Square size={12} />
                        取消构建
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => void saveConfig()}
                        disabled={savingConfig || !root.trim()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg
                            bg-neutral-700 text-neutral-200 cursor-pointer border-none
                            hover:bg-neutral-600 transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        title="保存当前配置，下次可直接导入"
                      >
                        {savingConfig ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Save size={14} />
                        )}
                        保存配置
                      </button>
                      <button
                        onClick={() => void run()}
                        disabled={!anyEnabled}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg
                            bg-red-500 text-white cursor-pointer border-none
                            hover:bg-red-600 transition-colors
                            disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={14} />
                        开始执行
                      </button>
                    </div>
                  )}
                </div>

                {/* 步骤进度 */}
                <ul className="flex flex-col gap-1.5 mb-3">
                  {[1, 2, 3, 4].map((n) => {
                    const s = steps[n];
                    const enabled = [doVersion, doBuild, doCommit, doPush][
                      n - 1
                    ];
                    return (
                      <li key={n} className="flex items-start gap-2 text-xs">
                        <StepIcon
                          state={s?.state ?? 'idle'}
                          enabled={enabled}
                        />
                        <span className="min-w-0">
                          <span
                            className={
                              enabled ? 'text-neutral-300' : 'text-neutral-600'
                            }
                          >
                            {n}.{' '}
                            {
                              ['版本号', '构建项目', 'git 提交', 'github 推送'][
                                n - 1
                              ]
                            }
                          </span>
                          {s?.detail && (
                            <span className="block text-neutral-500 break-all">
                              {s.detail}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* 日志 */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-neutral-400">输出日志</span>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[0.688rem] text-neutral-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoScroll}
                        onChange={(e) => setAutoScroll(e.target.checked)}
                      />
                      自动滚动
                    </label>
                    <button
                      onClick={() => setLog([])}
                      className="text-[0.688rem] text-neutral-500 hover:text-neutral-300
                          bg-transparent border-none cursor-pointer"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div
                  ref={logRef}
                  className="h-[50vh] min-h-[240px] overflow-y-auto rounded-lg
                      border border-red-500/20 bg-black/60 p-3 font-mono text-xs
                      leading-relaxed whitespace-pre-wrap break-all"
                >
                  {log.length === 0 ? (
                    <span className="text-neutral-600">
                      选择项目并点击「开始执行」，构建输出会实时显示在这里。
                    </span>
                  ) : (
                    log.map((l, i) => (
                      <div
                        key={i}
                        className={
                          l.startsWith('✖') || l.includes('失败')
                            ? 'text-red-400'
                            : l.startsWith('✔') ||
                                l.includes('完成') ||
                                l.includes('成功')
                              ? 'text-emerald-400'
                              : l.startsWith('═══')
                                ? 'text-cyan-400'
                                : 'text-neutral-300'
                        }
                      >
                        {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </>
        )}

        {!info && !scanning && (
          <div className="text-center mt-6 text-xs text-gray-500">
            支持识别 Tauri / Node / Rust
            项目，自动分析版本号位置、构建命令与产物目录
          </div>
        )}
      </div>

      {/* 导入配置抽屉 */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={`导入配置 (${configs.length})`}
        position="right"
        width="w-96"
      >
        {configs.length === 0 ? (
          <p className="text-neutral-500 text-sm p-2">
            还没有保存过配置。填好各步骤后点「保存配置」即可存下。
          </p>
        ) : (
          <div className="space-y-2">
            {configs.map((c) => (
              <div
                key={c.id}
                onClick={() => void applyConfig(c)}
                className="group flex items-start gap-3 p-3 rounded-lg border border-neutral-800
                    bg-neutral-900/40 cursor-pointer transition-all
                    hover:border-red-500/50 hover:bg-red-500/5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-neutral-200 truncate">
                      {c.name}
                    </span>
                    {c.kind && (
                      <span className="text-[0.625rem] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">
                        {c.kind}
                      </span>
                    )}
                  </div>
                  <p className="text-[0.688rem] text-neutral-500 font-mono truncate">
                    {c.root}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[0.625rem] text-neutral-600">
                    <span>{shortTime(c.updated_at)}</span>
                    <span>
                      {[
                        c.do_version && '版本号',
                        c.do_build && '构建',
                        c.do_commit && '提交',
                        c.do_push && '推送',
                      ]
                        .filter(Boolean)
                        .join(' · ') || '未启用任何步骤'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeConfig(c);
                  }}
                  title="删除该配置"
                  className="shrink-0 w-6 h-6 flex items-center justify-center rounded
                      text-neutral-600 hover:text-red-400 hover:bg-red-500/10
                      transition-colors opacity-0 group-hover:opacity-100
                      bg-transparent border-none cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </PageBox>
  );
};

/* ==================== 子组件 ==================== */

/** 左侧步骤行：点击切换右侧详情 */
const AnchorRow: React.FC<{
  active: boolean;
  onClick: () => void;
  enabled: boolean;
  status?: StepStatus;
  title: string;
  /** 副标题，如版本号变化、构建命令 */
  extra?: string;
}> = ({ active, onClick, enabled, status, title, extra }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2 px-3 py-2 rounded-lg text-xs text-left
          border-none cursor-pointer transition-colors ${
            active
              ? 'bg-red-500/15 text-white'
              : enabled
                ? 'bg-transparent text-neutral-300 hover:bg-white/[0.05]'
                : 'bg-transparent text-neutral-600 hover:bg-white/[0.03]'
          }`}
    >
      <StepIcon state={status?.state ?? 'idle'} enabled={enabled} />
      <span className="min-w-0 flex-1">
        <span className="block">{title}</span>
        {extra && (
          <span className="block text-[0.625rem] text-neutral-500 font-mono truncate mt-0.5">
            {extra}
          </span>
        )}
      </span>
    </button>
  </li>
);

/** 步骤卡片：带启用开关 */
const StepCard: React.FC<{
  no: number;
  title: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  disabled: boolean;
  status?: StepStatus;
  children: React.ReactNode;
}> = ({ no, title, icon, enabled, onToggle, disabled, status, children }) => (
  <section
    className={`rounded-xl border p-3.5 transition-colors ${
      enabled
        ? 'bg-neutral-900/80 border-red-500/15'
        : 'bg-neutral-900/40 border-white/[0.06]'
    }`}
  >
    <header className="flex items-center gap-2 mb-2.5">
      <input
        type="checkbox"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="cursor-pointer"
      />
      <span className={enabled ? 'text-red-400' : 'text-neutral-600'}>
        {icon}
      </span>
      <h3
        className={`text-sm font-medium ${enabled ? 'text-white' : 'text-neutral-500'}`}
      >
        {no}. {title}
      </h3>
      {status && <StepIcon state={status.state} enabled={enabled} />}
    </header>
    <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
      {children}
    </div>
  </section>
);

/** 步骤状态图标 */
const StepIcon: React.FC<{ state: StepState; enabled: boolean }> = ({
  state,
  enabled,
}) => {
  if (!enabled)
    return <Circle size={13} className="text-neutral-700 shrink-0 mt-0.5" />;
  switch (state) {
    case 'running':
      return (
        <Loader2
          size={13}
          className="text-cyan-400 animate-spin shrink-0 mt-0.5"
        />
      );
    case 'ok':
      return (
        <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
      );
    case 'failed':
      return <XCircle size={13} className="text-red-400 shrink-0 mt-0.5" />;
    case 'skipped':
      return <Circle size={13} className="text-neutral-600 shrink-0 mt-0.5" />;
    default:
      return <Circle size={13} className="text-neutral-500 shrink-0 mt-0.5" />;
  }
};

/** 版本号 patch +1，解析失败则返回空串 */
function bumpPatch(v: string): string {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(v.trim());
  if (!m) return '';
  return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
}

export default Release;
