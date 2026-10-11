/**
 * pages/RedStation.tsx
 * @Detail: 「项目管理」模块 —— 对接局域网 RedStation 后端（默认 http://192.168.101.6:3011）。
 *          UI 与交互由桌面 RedStation 项目的 routes/projects/+page.svelte 移植：
 *          Svelte 5 的 $state/$derived/$effect → React hooks，
 *          svelte-i18n 的 $t(...) → 中文字面量（与 RedWind 其他页面一致）。
 *
 * 与上游的差异：
 * - 登录改为**弹窗小卡片**（原项目是独立 /login 路由页）
 * - 代码托管仅保留「状态 + 下载」；上传需打包 zip（fflate），本项目不引入该依赖
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMsg } from '../components/Msg';
import {
  REDSTATION_BASE,
  TASK_CATEGORIES,
  healthApi,
} from '../apis/redstation';
import type {
  ApiHostingStatus,
  ApiProject,
  ApiProjectMember,
  ApiProjectTask,
  ApiTaskCategory,
} from '../apis/redstation';
import {
  COLOR_LABELS,
  COLOR_OPTIONS,
  STACK_OPTIONS,
  UI_OPTIONS,
  errText,
  useRedStationStore,
  type NewProjectInput,
  type ProjectUI,
} from '../stores/redstation';
import './RedStation.css';

// ===== 小工具 =====

/** 成员头像上的文字：优先 initials，否则取名字首字 */
function memberInitials(m: { initials: string | null; name: string }): string {
  return (m.initials?.trim() || m.name.slice(0, 1)).toUpperCase();
}

/** 用户头像文字（会话名片用） */
function userInitials(name: string, initials: string | null): string {
  return (initials?.trim() || name.slice(0, 1)).toUpperCase();
}

/** 从完整 URL 取主机名用于链接文案；解析失败退回原文 */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

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

/** ISO 时间 -> 相对时间文案 */
function humanAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const min = Math.floor((Date.now() - then) / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day === 1) return '昨天';
  return `${day} 天前`;
}

/** 表单初始值 */
const EMPTY_FORM = {
  label: '',
  tag: '',
  ui: 'GUI' as ProjectUI,
  purpose: '',
  intro: '',
  stack: [] as string[],
  frameworks: [] as string[],
  deployed: false,
  deployPath: '',
  runPort: '',
  projectUrl: '',
  repoUrl: '',
  color: 'red',
};

type FormState = typeof EMPTY_FORM;

const RedStation: React.FC = () => {
  const { showMsg } = useMsg();
  const showMsgRef = useRef(showMsg);
  showMsgRef.current = showMsg;

  // ===== store =====
  const loggedIn = useRedStationStore((s) => s.loggedIn);
  const sessionLoading = useRedStationStore((s) => s.sessionLoading);
  const me = useRedStationStore((s) => s.me);
  const projects = useRedStationStore((s) => s.projects);
  const invites = useRedStationStore((s) => s.invites);
  const teammates = useRedStationStore((s) => s.teammates);

  const login = useRedStationStore((s) => s.login);
  const logout = useRedStationStore((s) => s.logout);
  const restoreSession = useRedStationStore((s) => s.restoreSession);
  const loadWorkspace = useRedStationStore((s) => s.loadWorkspace);
  const addProject = useRedStationStore((s) => s.addProject);
  const updateProject = useRedStationStore((s) => s.updateProject);
  const removeProject = useRedStationStore((s) => s.removeProject);
  const markProjectRead = useRedStationStore((s) => s.markProjectRead);
  const addProjectTask = useRedStationStore((s) => s.addProjectTask);
  const toggleProjectTask = useRedStationStore((s) => s.toggleProjectTask);
  const updateProjectTask = useRedStationStore((s) => s.updateProjectTask);
  const removeProjectTask = useRedStationStore((s) => s.removeProjectTask);
  const reviewProjectInvite = useRedStationStore((s) => s.reviewProjectInvite);
  const inviteProjectMember = useRedStationStore((s) => s.inviteProjectMember);
  const removeProjectMember = useRedStationStore((s) => s.removeProjectMember);
  const loadHostingStatus = useRedStationStore((s) => s.loadHostingStatus);

  // ===== 后端连通性 =====
  const [conn, setConn] = useState<'checking' | 'on' | 'off'>('checking');

  useEffect(() => {
    let alive = true;
    healthApi
      .check()
      .then(() => alive && setConn('on'))
      .catch(() => alive && setConn('off'));
    return () => {
      alive = false;
    };
  }, []);

  // ===== 会话恢复 + 数据加载 =====
  // 启动时用本地 token 校验一次；仅首挂载执行，避免与登录态互相触发
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void restoreSession();
  }, [restoreSession]);

  // 登录后加载项目 / 邀请 / 同团队成员
  const loadedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!me) return;
    if (loadedForRef.current === me.id) return;
    loadedForRef.current = me.id;
    void loadWorkspace();
  }, [me, loadWorkspace]);

  // 退出登录时允许下次登录重新加载
  useEffect(() => {
    if (!loggedIn) loadedForRef.current = null;
  }, [loggedIn]);

  // ===== 登录卡片（弹窗）=====
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUid, setLoginUid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  // 未登录且会话恢复完毕：自动弹出登录卡片
  useEffect(() => {
    if (!sessionLoading && !loggedIn) setLoginOpen(true);
  }, [sessionLoading, loggedIn]);

  const openLogin = () => {
    setLoginError('');
    setLoginOpen(true);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginBusy) return;
    if (!loginUid.trim()) {
      setLoginError('请填写用户 ID');
      return;
    }
    if (!loginPassword) {
      setLoginError('请填写密码');
      return;
    }
    setLoginBusy(true);
    setLoginError('');
    try {
      await login(loginUid, loginPassword);
      setLoginOpen(false);
      setLoginUid('');
      setLoginPassword('');
      showMsgRef.current('已登录 RedStation', 'success', 2000);
    } catch (err) {
      setLoginError(errText(err, '登录失败，请检查账号密码'));
    } finally {
      setLoginBusy(false);
    }
  };

  const doLogout = async () => {
    await logout();
    showMsgRef.current('已退出登录', 'info', 2000);
  };

  // ===== 项目列表 =====
  // 用 id 定位：改名后仍能正确跟随，也不会与其它项目混淆
  const [activeId, setActiveId] = useState<number | null>(null);

  /** 当前项目：优先用选中的 id，未选中时回落到第一个 */
  const active = useMemo(
    () => projects.find((p) => p.id === activeId) ?? projects[0] ?? null,
    [projects, activeId],
  );

  const totalTasks = useMemo(
    () => projects.reduce((n, p) => n + p.tasks.length, 0),
    [projects],
  );
  const doneTasks = useMemo(
    () =>
      projects.reduce((n, p) => n + p.tasks.filter((t) => t.done).length, 0),
    [projects],
  );

  // ===== 详情抽屉 =====
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = useMemo(
    () => projects.find((p) => p.id === detailId) ?? null,
    [projects, detailId],
  );

  // 详情已展开时，左下角选中项跟随切换，避免右侧停留旧项目。
  // 条件里已判断 detailId !== active.id，纳入依赖不会造成循环。
  useEffect(() => {
    if (detailOpen && active && detailId !== active.id) setDetailId(active.id);
  }, [active, detailOpen, detailId]);

  const [hosting, setHosting] = useState<ApiHostingStatus | null>(null);
  const [hostingLoading, setHostingLoading] = useState(false);

  const openDetail = useCallback(
    (p: ApiProject) => {
      void markProjectRead(p.id);
      setDetailId(p.id);
      setDetailOpen(true);
    },
    [markProjectRead],
  );

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailId(null);
    setHosting(null);
  };

  // 拉取当前详情项目的托管状态
  useEffect(() => {
    if (!detailOpen || !detailId) return;
    let alive = true;
    setHostingLoading(true);
    loadHostingStatus(detailId)
      .then((s) => alive && setHosting(s))
      .catch(() => alive && setHosting(null))
      .finally(() => alive && setHostingLoading(false));
    return () => {
      alive = false;
    };
  }, [detailOpen, detailId, loadHostingStatus]);

  const selectProject = (p: ApiProject) => {
    // 打开即清除未读角标（同步到后端）
    void markProjectRead(p.id);
    setActiveId(p.id);
  };

  // ===== 任务筛选（两级：先按完成状态，再按时间）=====
  const [filterDone, setFilterDone] = useState<'all' | 'open' | 'done'>('all');
  const [filterTime, setFilterTime] = useState<'all' | 'today' | '7d' | '30d'>(
    'all',
  );

  /** 相对今天的起始时间戳，null 表示不限；滑动窗口，不处理自然日切分 */
  const timeFrom = useMemo(() => {
    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    if (filterTime === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    if (filterTime === '7d') return now - 7 * DAY;
    if (filterTime === '30d') return now - 30 * DAY;
    return null;
  }, [filterTime]);

  const activeTasks = useMemo(() => {
    if (!active) return [];
    return active.tasks.filter((t) => {
      if (filterDone === 'open' && t.done) return false;
      if (filterDone === 'done' && !t.done) return false;
      if (timeFrom !== null && new Date(t.createdAt).getTime() < timeFrom)
        return false;
      return true;
    });
  }, [active, filterDone, timeFrom]);

  const taskFiltered = filterDone !== 'all' || filterTime !== 'all';

  const clearTaskFilters = () => {
    setFilterDone('all');
    setFilterTime('all');
  };

  // ===== 新增任务 =====
  const [newTask, setNewTask] = useState('');
  const [newCategory, setNewCategory] = useState<ApiTaskCategory>('功能');
  const [taskError, setTaskError] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const taskInputRef = useRef<HTMLInputElement | null>(null);

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!active || addingTask) return;
    if (!newTask.trim()) return;
    setAddingTask(true);
    setTaskError('');
    try {
      await addProjectTask(active.id, newTask, newCategory);
      setNewTask('');
      setNewCategory('功能');
      taskInputRef.current?.focus();
    } catch (err) {
      setTaskError(errText(err));
    } finally {
      setAddingTask(false);
    }
  };

  // ===== 任务行内编辑 =====
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<ApiTaskCategory>('功能');
  const [editError, setEditError] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const startEditTask = (task: ApiProjectTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditCategory(task.category);
    setEditError('');
  };

  const cancelEditTask = () => {
    setEditingTaskId(null);
    setEditError('');
  };

  /** 保存标题与类别；发布时间由后端保留，不会被改动 */
  const saveEditTask = async (taskId: number) => {
    const title = editTitle.trim();
    if (!title) {
      setEditError('任务标题不能为空');
      return;
    }
    setSavingTask(true);
    setEditError('');
    try {
      await updateProjectTask(taskId, { title, category: editCategory });
      setEditingTaskId(null);
    } catch (err) {
      setEditError(errText(err));
    } finally {
      setSavingTask(false);
    }
  };

  const onToggleTask = async (taskId: number) => {
    try {
      await toggleProjectTask(taskId);
    } catch (err) {
      showMsgRef.current(errText(err), 'error');
    }
  };

  const onRemoveTask = async (taskId: number) => {
    try {
      await removeProjectTask(taskId);
    } catch (err) {
      showMsgRef.current(errText(err), 'error');
    }
  };

  // ===== 项目表单（新建 / 编辑共用）=====
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [frameworkDraft, setFrameworkDraft] = useState('');

  const patchForm = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFrameworkDraft('');
    setFormError('');
  };

  const openForm = () => {
    resetForm();
    setEditingId(null);
    setFormOpen(true);
  };

  const openEdit = (p: ApiProject) => {
    setForm({
      label: p.label,
      tag: p.tag,
      ui: (p.ui as ProjectUI) || 'GUI',
      purpose: p.purpose,
      intro: p.intro,
      stack: [...p.stack],
      frameworks: [...p.frameworks],
      deployed: p.deployed,
      deployPath: p.deployPath ?? '',
      runPort: p.runPort ?? '',
      projectUrl: p.projectUrl ?? '',
      repoUrl: p.repoUrl ?? '',
      color: p.color,
    });
    setFrameworkDraft('');
    setFormError('');
    setEditingId(p.id);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    resetForm();
  };

  const toggleStack = (lang: string) => {
    setForm((f) => ({
      ...f,
      stack: f.stack.includes(lang)
        ? f.stack.filter((s) => s !== lang)
        : [...f.stack, lang],
    }));
  };

  const commitFramework = () => {
    const v = frameworkDraft.trim();
    if (!v || form.frameworks.includes(v)) {
      setFrameworkDraft('');
      return;
    }
    setForm((f) => ({ ...f, frameworks: [...f.frameworks, v] }));
    setFrameworkDraft('');
  };

  const onFrameworkKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commitFramework();
    } else if (
      e.key === 'Backspace' &&
      !frameworkDraft &&
      form.frameworks.length
    ) {
      setForm((f) => ({ ...f, frameworks: f.frameworks.slice(0, -1) }));
    }
  };

  /** 新建或保存项目；重名等业务错误由后端返回中文文案 */
  const submitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const label = form.label.trim();
    if (!label) {
      setFormError('请填写项目名');
      return;
    }
    // 输入框里还没回车的框架一并收进来
    const frameworks = [...form.frameworks];
    const pending = frameworkDraft.trim();
    if (pending && !frameworks.includes(pending)) frameworks.push(pending);

    const payload: NewProjectInput = {
      label,
      tag: form.tag,
      color: form.color,
      ui: form.ui,
      purpose: form.purpose,
      intro: form.intro,
      stack: form.stack,
      frameworks,
      deployed: form.deployed,
      deployPath: form.deployPath.trim(),
      runPort: form.runPort.trim(),
      projectUrl: form.projectUrl.trim(),
      repoUrl: form.repoUrl.trim(),
      // 编辑时沿用原发起人；新建时留空，由后端记为当前登录用户
      owner:
        editingId !== null
          ? (projects.find((p) => p.id === editingId)?.owner ?? '')
          : '',
    };

    setSaving(true);
    setFormError('');
    try {
      if (editingId !== null) {
        const updated = await updateProject(editingId, payload);
        // 改名后仍按 id 选中，不会因为名字变化而跳走
        setActiveId(updated.id);
      } else {
        const created = await addProject(payload);
        setActiveId(created.id);
      }
      closeForm();
      showMsgRef.current(
        editingId !== null ? '项目已保存' : '项目已创建',
        'success',
        2000,
      );
    } catch (err) {
      setFormError(errText(err));
    } finally {
      setSaving(false);
    }
  };

  // ===== 删除项目 =====
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  /** 删除确认弹窗要展示的项目；null 表示弹窗关闭 */
  const deleteTarget = useMemo(
    () => projects.find((p) => p.id === confirmDeleteId) ?? null,
    [projects, confirmDeleteId],
  );

  const askDelete = (id: number) => {
    // 左列表点删除时同步打开该项目的详情抽屉，确认条统一在抽屉内展示
    const p = projects.find((x) => x.id === id);
    if (p && (!detailOpen || detailId !== id)) openDetail(p);
    setConfirmDeleteId(id);
    setDeleteError('');
  };

  const cancelDelete = () => {
    setConfirmDeleteId(null);
    setDeleteError('');
  };

  const doDelete = async (id: number) => {
    setDeleting(true);
    setDeleteError('');
    try {
      await removeProject(id);
      setConfirmDeleteId(null);
      // 删的是当前详情项时关掉抽屉；选中项失效则清空，由 active 回落到第一个
      if (detailId === id) closeDetail();
      if (activeId === id) setActiveId(null);
      showMsgRef.current('项目已删除', 'success', 2000);
    } catch (err) {
      setDeleteError(errText(err));
    } finally {
      setDeleting(false);
    }
  };

  // ===== 项目邀请 =====
  const pendingInvites = useMemo(
    () => invites.filter((i) => i.status === 'pending'),
    [invites],
  );
  const [inviteBusy, setInviteBusy] = useState<number | null>(null);
  const [inviteError, setInviteError] = useState('');

  const respondInvite = async (id: number, action: 'accept' | 'reject') => {
    setInviteBusy(id);
    setInviteError('');
    try {
      await reviewProjectInvite(id, action);
      showMsgRef.current(
        action === 'accept' ? '已加入项目' : '已拒绝邀请',
        'success',
        2000,
      );
    } catch (err) {
      setInviteError(errText(err));
    } finally {
      setInviteBusy(null);
    }
  };

  // ===== 邀请成员（仅发起人）=====
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteTargetId, setInviteTargetId] = useState<number | null>(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteFormError, setInviteFormError] = useState('');
  const [inviteOk, setInviteOk] = useState('');

  /** 已在该项目里的成员 id，邀请下拉里排除 */
  const inProjectIds = useMemo(
    () => new Set((detail?.members ?? []).map((m) => m.userId)),
    [detail],
  );

  /** 邀请下拉的候选：只能邀请与我同团队的人，并排除已在项目内的 */
  const inviteCandidates = useMemo(
    () => teammates.filter((m) => !inProjectIds.has(m.id)),
    [teammates, inProjectIds],
  );

  /** 我是否是当前详情项目的发起人 */
  const amOwner = detail?.myRole === 'owner';

  const openInvite = () => {
    setInviteFormError('');
    setInviteOk('');
    setInviteTargetId(inviteCandidates[0]?.id ?? null);
    setInviteMessage('');
    setInviteOpen(true);
  };

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || inviteSending) return;
    if (!inviteTargetId) {
      setInviteFormError('请选择要邀请的成员');
      return;
    }
    setInviteSending(true);
    setInviteFormError('');
    try {
      await inviteProjectMember(detail.id, {
        userId: inviteTargetId,
        message: inviteMessage.trim(),
      });
      setInviteOk('邀请已发送，等待对方同意');
      setInviteMessage('');
      // 已邀请的人从候选里去掉
      setInviteTargetId(
        inviteCandidates.find((m) => m.id !== inviteTargetId)?.id ?? null,
      );
    } catch (err) {
      setInviteFormError(errText(err));
    } finally {
      setInviteSending(false);
    }
  };

  const kickMember = async (userId: number) => {
    if (!detail) return;
    setInviteError('');
    try {
      await removeProjectMember(detail.id, userId);
      showMsgRef.current('已移出成员', 'success', 2000);
    } catch (err) {
      setInviteError(errText(err));
    }
  };

  /** 当前项目仍在等待对方回应的邀请 */
  const activeInvites = useMemo(
    () =>
      invites.filter(
        (i) => i.projectId === detail?.id && i.status === 'pending',
      ),
    [invites, detail],
  );

  // ===== 代码托管（下载）=====
  const downloadHosting = (projectId: number) => {
    // 用 location.assign 直接走浏览器下载：比 window.open 新标签更可靠
    window.location.assign(
      `${REDSTATION_BASE}/api/projects/${projectId}/hosting/download?token=${encodeURIComponent(
        localStorage.getItem('redstation.token') ?? '',
      )}`,
    );
  };

  /** 详情卡右侧那句话：已托管显示上次上传时间，否则提示未托管 */
  const hostingText = useMemo(() => {
    if (!hosting?.hosted || !hosting.lastUploadedAt) return '未托管代码';
    const when = humanAgo(hosting.lastUploadedAt);
    return hosting.lastUploader
      ? `上次上传：${when} · ${hosting.lastUploader}`
      : `上次上传：${when}`;
  }, [hosting]);

  // ===== 渲染：登录卡片 =====
  // 未登录时页面主体不渲染，只展示登录弹窗 + 引导文案
  const loginCard = loginOpen ? (
    <>
      <div
        className="rs-modal-backdrop"
        onClick={() => !loginBusy && setLoginOpen(false)}
      />
      <div
        className="rs-modal rs-login-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rs-login-title"
      >
        <div className="rs-login-brand">
          <span className="rs-login-mark">R</span>
          <div>
            <h2 id="rs-login-title" className="rs-login-title">
              登录 RedStation
            </h2>
            <p className="rs-login-sub">登录后可管理项目、任务与项目成员</p>
          </div>
        </div>

        <form className="rs-login-form" onSubmit={(e) => void submitLogin(e)}>
          <label className="rs-label">
            <span className="rs-field-label">用户 ID</span>
            <input
              className="rs-input"
              type="text"
              value={loginUid}
              onChange={(e) => setLoginUid(e.target.value)}
              placeholder="请输入用户 ID"
              autoFocus
            />
          </label>
          <label className="rs-label">
            <span className="rs-field-label">密码</span>
            <input
              className="rs-input"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="请输入密码"
            />
          </label>

          {loginError && <p className="rs-form-error">{loginError}</p>}

          <button
            className="rs-btn rs-btn-primary"
            type="submit"
            disabled={loginBusy}
          >
            {loginBusy && <span className="rs-spinner" aria-hidden="true" />}
            {loginBusy ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="rs-login-hint">
          后端：<code>{REDSTATION_BASE}</code>
          <br />
          测试账号：<code>10248571</code> / <code>redstation</code>
        </div>
      </div>
    </>
  ) : null;

  if (!loggedIn) {
    return (
      <div className="rs-root">
        <div className="rs-guest-hint">
          {sessionLoading ? (
            <div className="rs-loading">
              <span className="rs-loading-ring" />
              正在恢复登录状态…
            </div>
          ) : (
            <>
              <p>
                <strong>项目管理</strong> 需要登录 RedStation 后端才能使用。
              </p>
              <p style={{ marginTop: 12 }}>
                <button className="rs-btn rs-btn-primary" onClick={openLogin}>
                  登录
                </button>
              </p>
            </>
          )}
        </div>
        {loginCard}
      </div>
    );
  }

  // ===== 渲染：主界面 =====
  return (
    <div className="rs-root">
      <div className="rs-page">
        {/* 顶栏 */}
        <header className="rs-topbar">
          <div>
            <h1>项目管理</h1>
            <p className="rs-topbar-sub">
              对接 RedStation 后端 · {projects.length} 个项目 · {totalTasks}{' '}
              项任务
            </p>
          </div>
          <div className="rs-topbar-actions">
            <span
              className={`rs-conn ${conn === 'on' ? 'on' : conn === 'off' ? 'off' : ''}`}
            >
              <span className="rs-conn-dot" />
              {conn === 'checking'
                ? '检测中…'
                : conn === 'on'
                  ? '已连接'
                  : '连接失败'}
            </span>
            <span className="rs-user-chip">
              <span
                className="rs-user-avatar"
                style={{ background: me?.color ?? '#33333c' }}
              >
                {me ? userInitials(me.name, me.initials) : '--'}
              </span>
              {me?.name ?? '未登录'}
            </span>
            <button
              className="rs-btn rs-btn-ghost rs-btn-mini"
              onClick={() => void doLogout()}
            >
              退出
            </button>
          </div>
        </header>

        {/* 左侧：项目列表 */}
        <aside className="rs-card rs-side">
          <div className="rs-side-head">
            <div className="rs-side-title-row">
              <h2>项目</h2>
              <button
                className="rs-btn rs-btn-mini"
                onClick={openForm}
                title="新建项目"
              >
                + 新建
              </button>
            </div>
            <p className="rs-side-sub">
              {projects.length} 个项目 · {totalTasks} 项任务
            </p>
          </div>

          {pendingInvites.length > 0 && (
            <div className="rs-invite-box">
              <p className="rs-invite-title">待我回应的项目邀请</p>
              {pendingInvites.map((iv) => (
                <div className="rs-invite-row" key={iv.id}>
                  <div className="rs-invite-info">
                    <span className="rs-invite-proj">{iv.projectLabel}</span>
                    <span className="rs-invite-from">
                      {iv.inviterName} 邀请你加入
                    </span>
                  </div>
                  <div className="rs-invite-acts">
                    <button
                      type="button"
                      className="rs-btn rs-btn-mini"
                      disabled={inviteBusy === iv.id}
                      onClick={() => void respondInvite(iv.id, 'accept')}
                    >
                      同意
                    </button>
                    <button
                      type="button"
                      className="rs-btn rs-btn-ghost rs-btn-mini"
                      disabled={inviteBusy === iv.id}
                      onClick={() => void respondInvite(iv.id, 'reject')}
                    >
                      拒绝
                    </button>
                  </div>
                </div>
              ))}
              {inviteError && <p className="rs-invite-err">{inviteError}</p>}
            </div>
          )}

          <ul className="rs-list">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className={`rs-proj-row ${active?.id === p.id ? 'active' : ''}`}
                  onClick={() => selectProject(p)}
                >
                  <span className="rs-proj-row-top">
                    <span className="rs-proj-name">{p.label}</span>
                    {p.unread && p.tasks.length > 0 && (
                      <span className="rs-dot-new" title="有新任务" />
                    )}
                    {p.myRole && (
                      <span
                        className={`rs-proj-role ${p.myRole === 'owner' ? 'owner' : ''}`}
                      >
                        {p.myRole === 'owner' ? '发起人' : '成员'}
                      </span>
                    )}
                  </span>
                  <span
                    className="rs-row-del"
                    role="button"
                    tabIndex={0}
                    title="删除项目"
                    aria-label={`删除项目 ${p.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      askDelete(p.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        askDelete(p.id);
                      }
                    }}
                  >
                    ×
                  </span>
                  <span className="rs-proj-row-bottom">
                    <span className={`rs-tag ${p.color}`}>
                      {p.tag || '未分类'}
                    </span>
                    <span className="rs-proj-count">
                      {p.tasks.filter((t) => !t.done).length} / {p.tasks.length}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {projects.length === 0 && (
              <li className="rs-empty">暂无项目，点击「+ 新建」创建。</li>
            )}
          </ul>
        </aside>

        {/* 右侧：任务面板 + 详情卡 */}
        <div
          className={`rs-main-split ${detailOpen && detail ? 'detail-open' : ''}`}
        >
          <section className="rs-card">
            {active ? (
              <>
                <header className="rs-main-head">
                  <div>
                    <span className={`rs-tag ${active.color}`}>
                      {active.tag || '未分类'}
                    </span>
                    <h2>{active.label}</h2>
                    <p className="rs-main-sub">
                      {active.tasks.length === 0
                        ? '该项目还没有任务，用下方输入框添加。'
                        : taskFiltered
                          ? `筛选出 ${activeTasks.length} / ${active.tasks.length} 项任务`
                          : `共 ${active.tasks.length} 项任务，已完成 ${
                              active.tasks.filter((x) => x.done).length
                            } 项`}
                    </p>
                  </div>
                  <button
                    className="rs-link-btn"
                    onClick={() =>
                      detailOpen ? closeDetail() : openDetail(active)
                    }
                  >
                    {detailOpen ? '收起详情 ←' : '查看项目详情 →'}
                  </button>
                </header>

                <form
                  className="rs-add-row"
                  onSubmit={(e) => void submitTask(e)}
                >
                  <input
                    ref={taskInputRef}
                    className="rs-input"
                    type="text"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    placeholder="添加任务，回车确认…"
                    aria-label="新任务名称"
                  />
                  <select
                    className="rs-select rs-cat-select"
                    value={newCategory}
                    onChange={(e) =>
                      setNewCategory(e.target.value as ApiTaskCategory)
                    }
                    aria-label="任务类别"
                    title="任务类别"
                  >
                    {TASK_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    className="rs-btn rs-btn-primary"
                    type="submit"
                    disabled={addingTask}
                  >
                    {addingTask ? '添加中…' : '添加任务'}
                  </button>
                </form>
                {taskError && <p className="rs-form-error">{taskError}</p>}

                {active.tasks.length > 0 ? (
                  <>
                    {/* 任务筛选：一级完成状态，二级时间范围 */}
                    <div className="rs-filters">
                      <div className="rs-fgroup">
                        <span className="rs-flabel">完成状态</span>
                        <div className="rs-seg">
                          {(
                            [
                              ['all', '全部'],
                              ['open', '进行中'],
                              ['done', '已完成'],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              className={`rs-seg-btn ${filterDone === v ? 'on' : ''}`}
                              onClick={() => setFilterDone(v)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rs-fgroup">
                        <span className="rs-flabel">创建时间</span>
                        <div className="rs-seg">
                          {(
                            [
                              ['all', '全部'],
                              ['today', '今天'],
                              ['7d', '近 7 天'],
                              ['30d', '近 30 天'],
                            ] as const
                          ).map(([v, label]) => (
                            <button
                              key={v}
                              type="button"
                              className={`rs-seg-btn ${filterTime === v ? 'on' : ''}`}
                              onClick={() => setFilterTime(v)}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {taskFiltered && (
                        <button
                          type="button"
                          className="rs-clear-filters"
                          onClick={clearTaskFilters}
                        >
                          清除筛选
                        </button>
                      )}
                    </div>

                    {activeTasks.length === 0 ? (
                      <p className="rs-empty">当前筛选条件下没有任务。</p>
                    ) : (
                      <ul className="rs-todo-list">
                        {activeTasks.map((task) => (
                          <li
                            key={task.id}
                            className={`rs-todo-item ${task.done ? 'done' : ''}`}
                          >
                            <label className="rs-check">
                              <input
                                type="checkbox"
                                checked={task.done}
                                onChange={() => void onToggleTask(task.id)}
                                aria-label={task.title}
                              />
                              <span
                                className="rs-check-box"
                                aria-hidden="true"
                              />
                            </label>

                            {editingTaskId === task.id ? (
                              /* 编辑态：改标题与类别，发布时间只读保留 */
                              <div className="rs-task-edit">
                                <input
                                  className="rs-input"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  placeholder="任务标题"
                                  aria-label="任务标题"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter')
                                      void saveEditTask(task.id);
                                    if (e.key === 'Escape') cancelEditTask();
                                  }}
                                />
                                <select
                                  className="rs-select rs-cat-select"
                                  value={editCategory}
                                  onChange={(e) =>
                                    setEditCategory(
                                      e.target.value as ApiTaskCategory,
                                    )
                                  }
                                  aria-label="任务类别"
                                  title="任务类别"
                                >
                                  {TASK_CATEGORIES.map((c) => (
                                    <option key={c} value={c}>
                                      {c}
                                    </option>
                                  ))}
                                </select>
                                <span className="rs-act-time">
                                  发布于 {task.date} · {task.ago}
                                </span>
                                {editError && (
                                  <span className="rs-task-edit-err">
                                    {editError}
                                  </span>
                                )}
                                <div className="rs-task-edit-actions">
                                  <button
                                    type="button"
                                    className="rs-btn rs-btn-mini"
                                    onClick={cancelEditTask}
                                    disabled={savingTask}
                                  >
                                    取消
                                  </button>
                                  <button
                                    type="button"
                                    className="rs-btn rs-btn-primary rs-btn-mini"
                                    onClick={() => void saveEditTask(task.id)}
                                    disabled={savingTask}
                                  >
                                    {savingTask ? '保存中…' : '保存'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* 展示态：点标题或类别即可进入编辑 */
                              <>
                                <button
                                  type="button"
                                  className="rs-task-main"
                                  title="点击编辑标题与类别"
                                  onClick={() => startEditTask(task)}
                                >
                                  <span className="rs-todo-text">
                                    {task.title}
                                  </span>
                                  <span className="rs-cat-tag">
                                    {task.category}
                                  </span>
                                </button>
                                <span className="rs-act-time">
                                  发布于 {task.date} · {task.ago}
                                </span>
                                <span className="rs-todo-author">
                                  {task.author}
                                </span>
                                <button
                                  type="button"
                                  className="rs-del"
                                  title="删除任务"
                                  aria-label="删除任务"
                                  onClick={() => void onRemoveTask(task.id)}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="rs-empty">
                    该项目还没有任务，用上方输入框添加。
                  </p>
                )}

                <footer className="rs-main-foot">
                  共 {totalTasks} 项任务，已完成 {doneTasks} 项 · 数据来自
                  RedStation 后端
                </footer>
              </>
            ) : (
              <p className="rs-empty">
                暂无项目，点击左上角「+ 新建」创建第一个项目。
              </p>
            )}
          </section>

          {/* 右栏详情卡片 */}
          {detailOpen && detail && (
            <aside className="rs-card">
              <header className="rs-detail-head">
                <div>
                  <span className={`rs-tag ${detail.color}`}>
                    {detail.tag || '未分类'}
                  </span>
                  <h2>{detail.label}</h2>
                  <p className="rs-detail-sub">
                    {detail.purpose || '未填写用途'}
                  </p>
                </div>
                <button
                  className="rs-detail-close"
                  onClick={closeDetail}
                  aria-label="收起详情"
                >
                  ✕
                </button>
              </header>

              <div className="rs-detail-actions">
                <button className="rs-btn" onClick={() => openEdit(detail)}>
                  编辑项目
                </button>
                <button
                  className="rs-btn rs-btn-danger"
                  onClick={() => askDelete(detail.id)}
                >
                  删除
                </button>
              </div>

              {confirmDeleteId === detail.id && (
                <div className="rs-confirm-bar">
                  <p>
                    确定删除「{detail.label}」？该项目的 {detail.tasks.length}{' '}
                    条任务会一并删除，且不可恢复。
                  </p>
                  {deleteError && (
                    <span className="rs-form-error">{deleteError}</span>
                  )}
                  <button
                    className="rs-btn rs-btn-mini"
                    onClick={cancelDelete}
                    disabled={deleting}
                  >
                    取消
                  </button>
                  <button
                    className="rs-btn rs-btn-danger rs-btn-mini"
                    onClick={() => void doDelete(detail.id)}
                    disabled={deleting}
                  >
                    {deleting ? '删除中…' : '确认删除'}
                  </button>
                </div>
              )}

              <div className="rs-meta-grid">
                <div className="rs-meta">
                  <span className="rs-meta-k">UI 形式</span>
                  <span className="rs-meta-v">{detail.ui || '—'}</span>
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">服务器部署</span>
                  <span className={`rs-meta-v ${detail.deployed ? 'yes' : ''}`}>
                    {detail.deployed ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">部署路径</span>
                  <span
                    className={`rs-meta-v ${detail.deployPath ? 'yes' : ''}`}
                  >
                    {detail.deployPath || '—'}
                  </span>
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">运行端口</span>
                  <span className={`rs-meta-v ${detail.runPort ? 'yes' : ''}`}>
                    {detail.runPort || '—'}
                  </span>
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">项目地址</span>
                  {detail.projectUrl ? (
                    <a
                      className="rs-meta-link"
                      href={detail.projectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {hostOf(detail.projectUrl)}
                    </a>
                  ) : (
                    <span className="rs-meta-v">—</span>
                  )}
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">GitHub 地址</span>
                  {detail.repoUrl ? (
                    <a
                      className="rs-meta-link"
                      href={detail.repoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {hostOf(detail.repoUrl)}
                    </a>
                  ) : (
                    <span className="rs-meta-v">—</span>
                  )}
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">发起人</span>
                  <span className="rs-meta-v">{detail.owner || '—'}</span>
                </div>
                <div className="rs-meta">
                  <span className="rs-meta-k">任务数</span>
                  <span className="rs-meta-v">
                    {detail.tasks.filter((t) => t.done).length}/
                    {detail.tasks.length}
                  </span>
                </div>
              </div>

              {/* 代码托管：状态 + 下载（上传需打包依赖，本项目未引入） */}
              <div className="rs-host-row">
                <div className="rs-host-acts">
                  <button
                    type="button"
                    className="rs-btn rs-btn-mini"
                    disabled={hostingLoading || !hosting?.hosted}
                    onClick={() => downloadHosting(detail.id)}
                    title={
                      hosting?.hosted ? '下载托管代码' : '该项目还没有托管代码'
                    }
                  >
                    下载代码
                  </button>
                </div>
                <p className={`rs-host-hint ${hosting?.hosted ? '' : 'never'}`}>
                  {hostingText}
                </p>
              </div>
              {hosting?.hosted && (
                <p className="rs-member-note">
                  {hosting.fileCount} 个文件 · {humanSize(hosting.totalBytes)}
                </p>
              )}

              <div className="rs-field">
                <span className="rs-field-label">用途</span>
                <p className="rs-detail-text">{detail.purpose || '—'}</p>
              </div>

              <div className="rs-field">
                <span className="rs-field-label">介绍</span>
                <p className="rs-detail-text">{detail.intro || '—'}</p>
              </div>

              <div className="rs-field">
                <span className="rs-field-label">技术栈</span>
                <div className="rs-chips">
                  {detail.stack.length ? (
                    detail.stack.map((s) => (
                      <span className="rs-chip on" key={s}>
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="rs-detail-text">—</span>
                  )}
                </div>
              </div>

              <div className="rs-field">
                <span className="rs-field-label">框架</span>
                <div className="rs-chips">
                  {detail.frameworks.length ? (
                    detail.frameworks.map((f) => (
                      <span className="rs-chip on" key={f}>
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className="rs-detail-text">—</span>
                  )}
                </div>
              </div>

              {/* 项目成员：头像列表 + 发起人可邀请 / 移除 */}
              <div className="rs-field">
                <div className="rs-member-head">
                  <span className="rs-field-label" style={{ marginBottom: 0 }}>
                    项目成员{' '}
                    <span className="rs-member-num">
                      {detail.members.length}
                    </span>
                  </span>
                  {amOwner && (
                    <button
                      type="button"
                      className="rs-btn rs-btn-mini"
                      onClick={openInvite}
                    >
                      邀请成员
                    </button>
                  )}
                </div>
                <ul className="rs-member-list">
                  {detail.members.length ? (
                    detail.members.map((m: ApiProjectMember) => (
                      <li className="rs-member-item" key={m.userId}>
                        <span
                          className="rs-member-avatar"
                          style={{ background: m.color }}
                        >
                          {memberInitials(m)}
                        </span>
                        <div className="rs-member-info">
                          <span className="rs-member-name">
                            {m.name}
                            {m.userId === me?.id && (
                              <span className="rs-me-badge">我</span>
                            )}
                          </span>
                          <span className="rs-member-sub">
                            ID: {m.uid || '—'}
                            {m.title || m.role ? ` · ${m.title || m.role}` : ''}
                          </span>
                        </div>
                        <span
                          className={`rs-member-role ${m.projectRole === 'owner' ? 'owner' : ''}`}
                        >
                          {m.projectRole === 'owner' ? '发起人' : '成员'}
                        </span>
                        {amOwner && m.projectRole !== 'owner' && (
                          <button
                            type="button"
                            className="rs-member-kick"
                            title="移出项目"
                            onClick={() => void kickMember(m.userId)}
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))
                  ) : (
                    <li className="rs-member-note">
                      暂无其他成员，发起人可邀请成员加入。
                    </li>
                  )}
                </ul>
                {inviteError && (
                  <p className="rs-member-note err">{inviteError}</p>
                )}
                {activeInvites.length > 0 && (
                  <p className="rs-member-note">
                    {activeInvites.length} 条邀请等待对方回应
                  </p>
                )}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* 邀请成员抽屉（仅项目发起人） */}
      {inviteOpen && detail && (
        <>
          <div className="rs-backdrop" onClick={() => setInviteOpen(false)} />
          <aside className="rs-drawer" role="dialog" aria-modal="true">
            <header className="rs-drawer-head">
              <div>
                <h2>邀请成员</h2>
                <p className="rs-drawer-sub">
                  邀请成员加入「{detail.label}」，对方同意后即可看到该项目
                </p>
              </div>
              <button
                className="rs-drawer-close"
                onClick={() => setInviteOpen(false)}
                aria-label="关闭"
              >
                ×
              </button>
            </header>
            <form
              className="rs-drawer-body"
              onSubmit={(e) => void submitInvite(e)}
            >
              {inviteOk && <p className="rs-form-ok">{inviteOk}</p>}
              {inviteFormError && (
                <p className="rs-form-error">{inviteFormError}</p>
              )}

              <label className="rs-label">
                <span className="rs-field-label">选择成员</span>
                <select
                  className="rs-select"
                  value={inviteTargetId ?? ''}
                  onChange={(e) =>
                    setInviteTargetId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  disabled={!inviteCandidates.length}
                >
                  {inviteCandidates.length ? (
                    inviteCandidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}（{m.role}）
                      </option>
                    ))
                  ) : (
                    <option value="">暂无可邀请的成员</option>
                  )}
                </select>
              </label>

              <label className="rs-label">
                <span className="rs-field-label">邀请留言（可选）</span>
                <textarea
                  className="rs-textarea"
                  rows={3}
                  maxLength={255}
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="例如：一起来维护这个项目的任务清单"
                />
              </label>

              <footer className="rs-drawer-foot">
                <button
                  type="button"
                  className="rs-btn rs-btn-ghost"
                  onClick={() => setInviteOpen(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rs-btn rs-btn-primary"
                  disabled={inviteSending || !inviteCandidates.length}
                >
                  {inviteSending && (
                    <span className="rs-spinner" aria-hidden="true" />
                  )}
                  {inviteSending ? '发送中…' : '发送邀请'}
                </button>
              </footer>
            </form>
          </aside>
        </>
      )}

      {/* 新建 / 编辑项目抽屉 */}
      {formOpen && (
        <>
          <div className="rs-backdrop" onClick={closeForm} />
          <aside className="rs-drawer" role="dialog" aria-modal="true">
            <header className="rs-drawer-head">
              <div>
                <h2>{editingId !== null ? '编辑项目' : '新建项目'}</h2>
                <p className="rs-drawer-sub">
                  {editingId !== null
                    ? '修改项目信息，保存后立即生效'
                    : '填写项目基本信息，创建后即可添加任务'}
                </p>
              </div>
              <button
                className="rs-drawer-close"
                onClick={closeForm}
                aria-label="关闭"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <form
              className="rs-drawer-body"
              onSubmit={(e) => void submitProject(e)}
            >
              <div className="rs-grid-2">
                <label className="rs-label">
                  <span className="rs-field-label">项目名</span>
                  <input
                    className="rs-input"
                    type="text"
                    value={form.label}
                    onChange={(e) => patchForm({ label: e.target.value })}
                    placeholder="例如 RedStation"
                  />
                </label>
                <label className="rs-label">
                  <span className="rs-field-label">标签</span>
                  <input
                    className="rs-input"
                    type="text"
                    value={form.tag}
                    onChange={(e) => patchForm({ tag: e.target.value })}
                    placeholder="例如 桌面应用"
                  />
                </label>
              </div>

              <label className="rs-label">
                <span className="rs-field-label">UI 形式</span>
                <select
                  className="rs-select"
                  value={form.ui}
                  onChange={(e) =>
                    patchForm({ ui: e.target.value as ProjectUI })
                  }
                >
                  {UI_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              <label className="rs-label">
                <span className="rs-field-label">用途</span>
                <input
                  className="rs-input"
                  type="text"
                  value={form.purpose}
                  onChange={(e) => patchForm({ purpose: e.target.value })}
                  placeholder="一句话说明这个项目做什么"
                />
              </label>

              <label className="rs-label">
                <span className="rs-field-label">介绍</span>
                <textarea
                  className="rs-textarea"
                  rows={4}
                  value={form.intro}
                  onChange={(e) => patchForm({ intro: e.target.value })}
                  placeholder="项目背景、目标与范围…"
                />
              </label>

              <div className="rs-field" style={{ marginTop: 0 }}>
                <span className="rs-field-label">技术栈</span>
                <div className="rs-chips">
                  {STACK_OPTIONS.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      className={`rs-chip ${form.stack.includes(lang) ? 'on' : ''}`}
                      onClick={() => toggleStack(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rs-field" style={{ marginTop: 0 }}>
                <span className="rs-field-label">框架</span>
                <input
                  className="rs-input"
                  type="text"
                  value={frameworkDraft}
                  onChange={(e) => setFrameworkDraft(e.target.value)}
                  onKeyDown={onFrameworkKey}
                  onBlur={commitFramework}
                  placeholder="输入框架后回车"
                />
                {form.frameworks.length > 0 && (
                  <div className="rs-chips" style={{ marginTop: 8 }}>
                    {form.frameworks.map((fw) => (
                      <span className="rs-chip on tag-chip" key={fw}>
                        {fw}
                        <button
                          type="button"
                          className="rs-chip-x"
                          aria-label={`移除 ${fw}`}
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              frameworks: f.frameworks.filter((x) => x !== fw),
                            }))
                          }
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="rs-grid-2">
                <label className="rs-label">
                  <span className="rs-field-label">服务器部署</span>
                  <select
                    className="rs-select"
                    value={form.deployed ? 'yes' : 'no'}
                    onChange={(e) =>
                      patchForm({ deployed: e.target.value === 'yes' })
                    }
                  >
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </label>
                <label className="rs-label">
                  <span className="rs-field-label">标签配色</span>
                  <select
                    className={`rs-select rs-color-select ${form.color}`}
                    value={form.color}
                    onChange={(e) => patchForm({ color: e.target.value })}
                  >
                    {COLOR_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {COLOR_LABELS[c] ?? c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rs-grid-2">
                <label className="rs-label">
                  <span className="rs-field-label">运行端口</span>
                  <input
                    className="rs-input"
                    type="text"
                    value={form.runPort}
                    onChange={(e) => patchForm({ runPort: e.target.value })}
                    placeholder="例如 3010"
                  />
                </label>
                <label className="rs-label">
                  <span className="rs-field-label">部署路径</span>
                  <input
                    className="rs-input"
                    type="text"
                    value={form.deployPath}
                    onChange={(e) => patchForm({ deployPath: e.target.value })}
                    placeholder="例如 /home/teabos/redlind-apis"
                  />
                </label>
              </div>

              <div className="rs-grid-2">
                <label className="rs-label">
                  <span className="rs-field-label">项目地址</span>
                  <input
                    className="rs-input"
                    type="url"
                    value={form.projectUrl}
                    onChange={(e) => patchForm({ projectUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                </label>
                <label className="rs-label">
                  <span className="rs-field-label">GitHub 地址</span>
                  <input
                    className="rs-input"
                    type="url"
                    value={form.repoUrl}
                    onChange={(e) => patchForm({ repoUrl: e.target.value })}
                    placeholder="https://github.com/user/repo"
                  />
                </label>
              </div>

              {formError && <p className="rs-form-error">{formError}</p>}

              <footer className="rs-drawer-foot">
                <button
                  type="button"
                  className="rs-btn rs-btn-ghost"
                  onClick={closeForm}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rs-btn rs-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? '保存中…'
                    : editingId !== null
                      ? '保存修改'
                      : '创建项目'}
                </button>
              </footer>
            </form>
          </aside>
        </>
      )}

      {/* 删除确认弹窗 */}
      {confirmDeleteId !== null && deleteTarget && !detailOpen && (
        <>
          <div
            className="rs-modal-backdrop"
            role="presentation"
            onClick={() => !deleting && cancelDelete()}
          />
          <div
            className="rs-modal-backdrop"
            style={{ background: 'transparent', backdropFilter: 'none' }}
          >
            <div className="rs-modal" role="alertdialog" aria-modal="true">
              <h3 className="rs-modal-title">删除项目？</h3>
              <p className="rs-modal-text">
                确定删除「{deleteTarget.label}」？该项目的{' '}
                {deleteTarget.tasks.length} 条任务会一并删除，且不可恢复。
              </p>
              {deleteError && <p className="rs-form-error">{deleteError}</p>}
              <div className="rs-modal-actions">
                <button
                  className="rs-btn rs-btn-ghost"
                  onClick={cancelDelete}
                  disabled={deleting}
                >
                  取消
                </button>
                <button
                  className="rs-btn rs-btn-danger"
                  onClick={() => void doDelete(deleteTarget.id)}
                  disabled={deleting}
                >
                  {deleting ? '删除中…' : '确认删除'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {loginCard}
    </div>
  );
};

export default RedStation;
