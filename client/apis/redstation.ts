/**
 * apis/redstation.ts
 * @Detail: RedStation 后端（局域网 192.168.101.6:3011）的接口封装。
 *          由桌面 RedStation 项目（NestJS + Fastify）的 apps/app/src/lib/api/client.ts 移植而来，
 *          去掉 SvelteKit 的 $env 依赖，改用 Vite 环境变量。
 *
 * 约定：
 * - baseURL 由 VITE_REDSTATION_URL 提供，未配置时回落到局域网地址
 * - token 单独存放（redstation.token），与 RedWind 自身的 account-storage 隔离
 * - 请求/响应序列化、错误归一化与上游保持一致
 */

/** 后端基址；末尾不带斜杠 */
const RAW_BASE: string =
  import.meta.env.VITE_REDSTATION_URL || 'http://192.168.101.6:3011';

export const REDSTATION_BASE: string = RAW_BASE.replace(/\/+$/, '');

const TOKEN_KEY = 'redstation.token';

/** 后端错误统一结构 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ===== token 管理 =====

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof localStorage !== 'undefined')
    localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

// ===== 请求封装 =====

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** 查询参数，值会自动 URL 编码（中文角色名等必须编码） */
  query?: Record<string, string | number | boolean | undefined>;
  /** 是否跳过 Authorization 头 */
  skipAuth?: boolean;
  /** 超时（毫秒），默认 15s */
  timeout?: number;
};

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    skipAuth = false,
    timeout = 15000,
  } = options;

  const url = new URL(path, REDSTATION_BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (!skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // fetch 本身没有超时，用 AbortController 兜底，避免后端不可达时一直挂着
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  let res: Response;
  try {
    res = await fetch(url.href, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError('无法连接 RedStation 后端，请确认服务已启动', 0);
  } finally {
    clearTimeout(timer);
  }

  // 204 或空响应体
  const text = await res.text();
  const data = text ? safeParse(text) : null;

  if (!res.ok) {
    const message =
      (data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : null) ?? `请求失败（${res.status}）`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ===== 类型定义（对齐后端 UserView）=====

export type ApiPermission = {
  name: string;
  desc: string;
  granted: boolean;
};

export type ApiUser = {
  id: number;
  uid: string;
  name: string;
  initials: string | null;
  email: string;
  role: string;
  title: string | null;
  color: string;
  teams: string[];
  active: boolean;
  permissions: ApiPermission[];
  createdAt: string;
  updatedAt: string;
};

export type ApiMember = {
  id: number;
  name: string;
  role: string;
  color: string;
};

// ===== 业务接口 =====

export const authApi = {
  /** 登录，成功后 token 由调用方写入 */
  login(uid: string, password: string) {
    return request<{ token: string; user: ApiUser }>('/api/auth/login', {
      method: 'POST',
      body: { uid, password },
      skipAuth: true,
    });
  },

  /** 用当前 token 换取用户资料；token 失效会抛 401 */
  me() {
    return request<ApiUser>('/api/auth/me');
  },

  logout() {
    return request<{ ok: boolean }>('/api/auth/logout', {
      method: 'POST',
    }).catch(() => ({
      ok: true,
    }));
  },
};

export const usersApi = {
  /** 全站启用用户列表 */
  members() {
    return request<ApiMember[]>('/api/users/members');
  },

  /** 与我同团队的用户，供项目邀请下拉使用 */
  teammates() {
    return request<ApiMember[]>('/api/users/teammates');
  },
};

export const healthApi = {
  check() {
    return request<{ status: string; database: string; time: string }>(
      '/api/health',
      {
        skipAuth: true,
        timeout: 6000,
      },
    );
  },
};

// ===== 项目模块 =====

export type ApiProjectTask = {
  id: number;
  projectId: number;
  title: string;
  done: boolean;
  /** 类别：功能 / 新模块 / 优化 / UI / 运维 / 设计 */
  category: ApiTaskCategory;
  author: string;
  /** 后端算好的日期文案，如 2026-9-10 */
  date: string;
  /** 后端算好的相对时间，如「12 分钟前」 */
  ago: string;
  createdAt: string;
};

/** 项目任务的类别，与后端 TASK_CATEGORIES 保持一致 */
export const TASK_CATEGORIES = [
  '功能',
  '新模块',
  '优化',
  'UI',
  '运维',
  '设计',
] as const;
export type ApiTaskCategory = (typeof TASK_CATEGORIES)[number];

/** 项目内身份：发起人 / 成员 */
export type ApiProjectRole = 'owner' | 'member';

/** 项目成员 */
export type ApiProjectMember = {
  userId: number;
  uid: string;
  name: string;
  initials: string | null;
  title: string | null;
  role: string;
  color: string;
  projectRole: ApiProjectRole;
  joinedAt: string;
};

export type ApiProject = {
  id: number;
  label: string;
  tag: string;
  color: string;
  unread: boolean;
  ui: string;
  purpose: string;
  intro: string;
  stack: string[];
  frameworks: string[];
  deployed: boolean;
  /** 项目在服务器上的部署路径；未填为空串 */
  deployPath: string;
  /** 运行端口，如 "3010"；多个用逗号分隔，未填为空串 */
  runPort: string;
  /** 项目线上地址；未填为空串 */
  projectUrl: string;
  /** 代码仓库地址；未填为空串 */
  repoUrl: string;
  /** 项目发起人名字；未记录时为空串 */
  owner: string;
  tasks: ApiProjectTask[];
  taskTotal: number;
  taskDone: number;
  /** 项目成员（发起人在前） */
  members: ApiProjectMember[];
  /** 成员总数 */
  memberCount: number;
  /** 当前登录用户在该项目里的身份；非成员为 null */
  myRole: ApiProjectRole | null;
  createdAt: string;
  updatedAt: string;
};

/** 项目邀请状态 */
export type ApiProjectInviteStatus = 'pending' | 'approved' | 'rejected';

/** 项目邀请 */
export type ApiProjectInvite = {
  id: number;
  projectId: number;
  projectLabel: string;
  userId: number;
  uid: string;
  name: string;
  initials: string | null;
  color: string;
  inviterName: string;
  message: string;
  status: ApiProjectInviteStatus;
  createdAt: string;
  handledAt: string | null;
};

/** 托管状态（对齐后端 HostingStatus） */
export type ApiHostingStatus = {
  hosted: boolean;
  firstUploadedAt: string | null;
  lastUploadedAt: string | null;
  lastUploader: string;
  uploadCount: number;
  fileCount: number;
  totalBytes: number;
  rootPath: string;
};

export type ProjectPayload = {
  label: string;
  tag?: string;
  color?: string;
  ui?: string;
  purpose?: string;
  intro?: string;
  stack?: string[];
  frameworks?: string[];
  deployed?: boolean;
  deployPath?: string;
  runPort?: string;
  projectUrl?: string;
  repoUrl?: string;
  owner?: string;
};

export const projectsApi = {
  list(
    query: {
      q?: string;
      tag?: string;
      unread?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    return request<{ total: number; items: ApiProject[] }>('/api/projects', {
      query,
    });
  },

  findById(id: number) {
    return request<ApiProject>(`/api/projects/${id}`);
  },

  create(payload: ProjectPayload) {
    return request<ApiProject>('/api/projects', {
      method: 'POST',
      body: payload,
    });
  },

  update(id: number, payload: Partial<ProjectPayload>) {
    return request<ApiProject>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: payload,
    });
  },

  remove(id: number) {
    return request<{ id: number; deleted: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  /** 清除未读角标 */
  markRead(id: number) {
    return request<ApiProject>(`/api/projects/${id}/read`, { method: 'POST' });
  },

  // ===== 项目下的任务 =====

  listTasks(projectId: number) {
    return request<ApiProjectTask[]>(`/api/projects/${projectId}/tasks`);
  },

  addTask(projectId: number, title: string, category?: ApiTaskCategory) {
    return request<ApiProjectTask>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: { title, category },
    });
  },

  updateTask(
    taskId: number,
    patch: { title?: string; done?: boolean; category?: ApiTaskCategory },
  ) {
    return request<ApiProjectTask>(`/api/projects/tasks/${taskId}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  toggleTask(taskId: number) {
    return request<ApiProjectTask>(`/api/projects/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
  },

  removeTask(taskId: number) {
    return request<{ id: number; deleted: boolean }>(
      `/api/projects/tasks/${taskId}`,
      {
        method: 'DELETE',
      },
    );
  },

  // ===== 项目成员与邀请 =====

  /** 项目成员列表（仅项目成员可调） */
  members(projectId: number) {
    return request<{
      projectId: number;
      items: ApiProjectMember[];
      myRole: ApiProjectRole | null;
    }>(`/api/projects/${projectId}/members`);
  },

  /** 我收到的项目邀请（待回应在前） */
  myInvites() {
    return request<{ items: ApiProjectInvite[] }>('/api/projects/invites/my');
  },

  /** 发起人邀请成员；userId 与 uid 二选一 */
  invite(
    projectId: number,
    payload: { userId?: number; uid?: string; message?: string },
  ) {
    return request<ApiProjectInvite>(`/api/projects/${projectId}/invites`, {
      method: 'POST',
      body: payload,
    });
  },

  /** 该项目已发出的邀请（仅发起人） */
  invites(projectId: number) {
    return request<{ items: ApiProjectInvite[] }>(
      `/api/projects/${projectId}/invites`,
    );
  },

  /** 回应邀请：accept 同意 / reject 拒绝 */
  reviewInvite(inviteId: number, action: 'accept' | 'reject') {
    return request<ApiProjectInvite>(
      `/api/projects/invites/${inviteId}/review`,
      {
        method: 'POST',
        body: { action },
      },
    );
  },

  /** 发起人撤回邀请 */
  cancelInvite(inviteId: number) {
    return request<{ id: number; deleted: boolean }>(
      `/api/projects/invites/${inviteId}`,
      {
        method: 'DELETE',
      },
    );
  },

  /** 发起人移除成员 */
  removeMember(projectId: number, userId: number) {
    return request<{ projectId: number; userId: number; removed: boolean }>(
      `/api/projects/${projectId}/members/${userId}`,
      { method: 'DELETE' },
    );
  },

  // ===== 代码托管（只读：状态 + 下载）=====

  /** 托管状态：是否托管过、上次上传时间与上传者、文件数/体积 */
  hostingStatus(projectId: number) {
    return request<ApiHostingStatus>(`/api/projects/${projectId}/hosting`);
  },

  /** 托管代码下载地址（浏览器直接点击下载，带 token 走 query） */
  hostingDownloadUrl(projectId: number): string {
    const token = getToken();
    const base = `${REDSTATION_BASE}/api/projects/${projectId}/hosting/download`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },
};
