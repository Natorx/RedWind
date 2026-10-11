/**
 * stores/redstation.ts
 * @Detail: RedStation 项目管理模块的共享状态。
 *          由桌面 RedStation 项目的 apps/app/src/lib/stores/workspace.svelte.ts 移植而来：
 *          Svelte 5 的 $state / getter 函数 → Zustand store 的字段与 actions。
 *
 * 只覆盖「项目管理」所需的范围：会话、项目（含任务）、项目成员与邀请、同团队成员。
 * 待办 / 动态 / 规划 / 团队页暂不纳入本模块。
 */
import { create } from 'zustand';

import {
  ApiError,
  authApi,
  clearToken,
  getToken,
  projectsApi,
  setToken,
  usersApi,
  type ApiHostingStatus,
  type ApiMember,
  type ApiProject,
  type ApiProjectInvite,
  type ApiTaskCategory,
  type ApiUser,
} from '../apis/redstation';

/** 项目形态 */
export type ProjectUI = 'GUI' | 'TUI' | 'CLI';

/** 新建 / 编辑项目时的表单数据 */
export type NewProjectInput = {
  label: string;
  tag: string;
  color: string;
  ui: ProjectUI;
  purpose: string;
  intro: string;
  stack: string[];
  frameworks: string[];
  deployed: boolean;
  /** 项目在服务器上的部署路径 */
  deployPath: string;
  /** 运行端口，如 "3010"；多个用逗号分隔 */
  runPort: string;
  /** 项目线上地址 */
  projectUrl: string;
  /** 代码仓库地址 */
  repoUrl: string;
  /** 项目发起人名字（编辑时沿用原值，新建留空由后端记当前用户） */
  owner: string;
};

/** 可选的技术栈语言 */
export const STACK_OPTIONS = [
  'Typescript',
  'Node',
  'Rust',
  'Go',
  'Python',
  'PostgreSQL',
  'SQLite',
  'Mysql',
  'MongoDB',
];

/** 可选的 UI 形态 */
export const UI_OPTIONS: ProjectUI[] = ['GUI', 'TUI', 'CLI'];

/** 新建项目时可选的标签配色 */
export const COLOR_OPTIONS = [
  'red',
  'violet',
  'amber',
  'green',
  'cyan',
  'pink',
];

/** 配色 -> 中文名，用于表单下拉展示 */
export const COLOR_LABELS: Record<string, string> = {
  red: '红色',
  violet: '紫色',
  amber: '琥珀',
  green: '绿色',
  cyan: '青色',
  pink: '粉色',
};

interface RedStationState {
  // ===== 会话 =====
  /** 是否已登录 */
  loggedIn: boolean;
  /** 会话恢复中（启动时用本地 token 校验） */
  sessionLoading: boolean;
  /** 当前登录用户资料；未登录为 null */
  me: ApiUser | null;
  /** 全站启用用户列表 */
  members: ApiMember[];
  /** 与我同团队的用户，项目邀请下拉只能从这里选 */
  teammates: ApiMember[];

  // ===== 工作区数据 =====
  projects: ApiProject[];
  /** 我收到的项目邀请（待回应在前） */
  invites: ApiProjectInvite[];
  /** 项目/任务加载中 */
  loading: boolean;
  /** 最近一次加载的错误信息，null 表示无错误 */
  error: string | null;

  // ===== 会话动作 =====
  login: (uid: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  loadMembers: () => Promise<void>;
  loadTeammates: () => Promise<void>;

  // ===== 加载 =====
  loadProjects: () => Promise<void>;
  loadInvites: () => Promise<void>;
  loadWorkspace: () => Promise<void>;

  // ===== 项目动作 =====
  addProject: (input: NewProjectInput) => Promise<ApiProject>;
  updateProject: (
    originalId: number,
    input: NewProjectInput,
  ) => Promise<ApiProject>;
  removeProject: (id: number) => Promise<void>;
  markProjectRead: (id: number) => Promise<void>;

  // ===== 项目任务动作 =====
  addProjectTask: (
    projectId: number,
    title: string,
    category?: ApiTaskCategory,
  ) => Promise<void>;
  toggleProjectTask: (taskId: number) => Promise<void>;
  updateProjectTask: (
    taskId: number,
    patch: { title?: string; category?: ApiTaskCategory },
  ) => Promise<void>;
  removeProjectTask: (taskId: number) => Promise<void>;

  // ===== 项目邀请与成员 =====
  reviewProjectInvite: (
    inviteId: number,
    action: 'accept' | 'reject',
  ) => Promise<void>;
  inviteProjectMember: (
    projectId: number,
    payload: { userId?: number; uid?: string; message?: string },
  ) => Promise<ApiProjectInvite>;
  cancelProjectInvite: (inviteId: number) => Promise<void>;
  removeProjectMember: (projectId: number, userId: number) => Promise<void>;

  // ===== 代码托管 =====
  loadHostingStatus: (projectId: number) => Promise<ApiHostingStatus>;
}

/** 统一的错误文案提取 */
export function errText(
  err: unknown,
  fallback = '操作失败，请稍后重试',
): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/** 团队加载去重：页面挂载与会话恢复可能并发触发同一次加载 */
let teamsInFlight: Promise<void> | null = null;

export const useRedStationStore = create<RedStationState>()((set, get) => ({
  loggedIn: false,
  sessionLoading: true,
  me: null,
  members: [],
  teammates: [],
  projects: [],
  invites: [],
  loading: false,
  error: null,

  // ===== 会话 =====

  login: async (uid, password) => {
    const { token, user } = await authApi.login(uid.trim(), password);
    setToken(token);
    set({ me: user, loggedIn: true, sessionLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      set({
        me: null,
        members: [],
        teammates: [],
        projects: [],
        invites: [],
        loggedIn: false,
        sessionLoading: false,
      });
    }
  },

  /**
   * 启动时恢复会话：有 token 就拉 /api/auth/me 验证。
   * token 失效（401）则静默清掉，页面回到登录卡片。
   */
  restoreSession: async () => {
    if (!getToken()) {
      set({ loggedIn: false, sessionLoading: false });
      return;
    }
    try {
      const me = await authApi.me();
      set({ me, loggedIn: true });
    } catch {
      clearToken();
      set({ me: null, loggedIn: false });
    } finally {
      set({ sessionLoading: false });
    }
  },

  loadMembers: async () => {
    try {
      set({ members: await usersApi.members() });
    } catch {
      set({ members: [] });
    }
  },

  /** 拉取同团队成员；未加入团队时为空数组。页面挂载与会话恢复并发时去重 */
  loadTeammates: async () => {
    if (teamsInFlight) return teamsInFlight;
    teamsInFlight = (async () => {
      try {
        set({ teammates: await usersApi.teammates() });
      } catch {
        // 拉取失败时不阻断页面
        set({ teammates: [] });
      } finally {
        teamsInFlight = null;
      }
    })();
    return teamsInFlight;
  },

  // ===== 加载 =====

  loadProjects: async () => {
    try {
      const res = await projectsApi.list();
      set({ projects: res.items, error: null });
    } catch (err) {
      set({ error: errText(err, '项目加载失败') });
    }
  },

  loadInvites: async () => {
    try {
      const res = await projectsApi.myInvites();
      set({ invites: res.items });
    } catch (err) {
      set({ error: errText(err, '项目邀请加载失败') });
    }
  },

  /** 一次性加载项目页需要的全部数据 */
  loadWorkspace: async () => {
    // 防重入：登录态变化可能触发多次，避免并发重复请求
    if (get().loading) return;
    set({ loading: true });
    try {
      await Promise.all([
        get().loadProjects(),
        get().loadInvites(),
        get().loadTeammates(),
      ]);
    } finally {
      set({ loading: false });
    }
  },

  // ===== 项目 =====

  addProject: async (input) => {
    const created = await projectsApi.create({
      label: input.label.trim(),
      tag: input.tag,
      color: input.color,
      ui: input.ui,
      purpose: input.purpose,
      intro: input.intro,
      stack: input.stack,
      frameworks: input.frameworks,
      deployed: input.deployed,
      deployPath: input.deployPath,
      runPort: input.runPort,
      projectUrl: input.projectUrl,
      repoUrl: input.repoUrl,
    });
    set({ projects: [...get().projects, created] });
    return created;
  },

  updateProject: async (originalId, input) => {
    const updated = await projectsApi.update(originalId, {
      label: input.label.trim(),
      tag: input.tag,
      color: input.color,
      ui: input.ui,
      purpose: input.purpose,
      intro: input.intro,
      stack: input.stack,
      frameworks: input.frameworks,
      deployed: input.deployed,
      deployPath: input.deployPath,
      runPort: input.runPort,
      projectUrl: input.projectUrl,
      repoUrl: input.repoUrl,
    });
    set({
      projects: get().projects.map((p) => (p.id === originalId ? updated : p)),
    });
    return updated;
  },

  /** 删除项目；项目下的任务由后端级联删除 */
  removeProject: async (id) => {
    await projectsApi.remove(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },

  /** 清除项目的未读角标（打开详情/选中时调用） */
  markProjectRead: async (id) => {
    const item = get().projects.find((p) => p.id === id);
    // 已是已读就不必再打一次请求
    if (!item || !item.unread) return;
    try {
      const updated = await projectsApi.markRead(id);
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
    } catch {
      // 角标清除失败不影响主流程，静默忽略
    }
  },

  // ===== 项目任务 =====

  addProjectTask: async (projectId, title, category) => {
    const text = title.trim();
    if (!text) return;
    const created = await projectsApi.addTask(projectId, text, category);
    set({
      projects: get().projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: [...p.tasks, created],
              taskTotal: p.taskTotal + 1,
              unread: true,
            }
          : p,
      ),
    });
  },

  /** 切换项目任务完成状态（按任务 id，不依赖数组下标） */
  toggleProjectTask: async (taskId) => {
    const updated = await projectsApi.toggleTask(taskId);
    set({
      projects: get().projects.map((p) => {
        if (!p.tasks.some((t) => t.id === taskId)) return p;
        const tasks = p.tasks.map((t) => (t.id === taskId ? updated : t));
        return { ...p, tasks, taskDone: tasks.filter((t) => t.done).length };
      }),
    });
  },

  /**
   * 更新项目任务的标题 / 类别。
   * 只改传入的字段，createdAt（发布时间）由后端保留，不受影响。
   */
  updateProjectTask: async (taskId, patch) => {
    const updated = await projectsApi.updateTask(taskId, patch);
    set({
      projects: get().projects.map((p) => {
        if (!p.tasks.some((t) => t.id === taskId)) return p;
        return {
          ...p,
          tasks: p.tasks.map((t) => (t.id === taskId ? updated : t)),
        };
      }),
    });
  },

  removeProjectTask: async (taskId) => {
    await projectsApi.removeTask(taskId);
    set({
      projects: get().projects.map((p) => {
        if (!p.tasks.some((t) => t.id === taskId)) return p;
        const tasks = p.tasks.filter((t) => t.id !== taskId);
        return {
          ...p,
          tasks,
          taskTotal: tasks.length,
          taskDone: tasks.filter((t) => t.done).length,
        };
      }),
    });
  },

  // ===== 项目邀请与成员 =====

  /**
   * 回应项目邀请。
   * 同意后我成为项目成员，需要刷新项目列表才能看到该项目。
   */
  reviewProjectInvite: async (inviteId, action) => {
    const updated = await projectsApi.reviewInvite(inviteId, action);
    set({
      invites: get().invites.map((i) => (i.id === inviteId ? updated : i)),
    });
    if (action === 'accept') await get().loadProjects();
  },

  inviteProjectMember: (projectId, payload) =>
    projectsApi.invite(projectId, payload),

  cancelProjectInvite: async (inviteId) => {
    await projectsApi.cancelInvite(inviteId);
    set({ invites: get().invites.filter((i) => i.id !== inviteId) });
  },

  removeProjectMember: async (projectId, userId) => {
    await projectsApi.removeMember(projectId, userId);
    await get().loadProjects();
  },

  // ===== 代码托管 =====

  loadHostingStatus: (projectId) => projectsApi.hostingStatus(projectId),
}));

export default useRedStationStore;
