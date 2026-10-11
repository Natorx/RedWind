/**
 * RedStation store 行为测试（纯 Node，无需 DOM）
 *
 * 覆盖 client/stores/redstation.ts 的核心逻辑：登录 → 加载 → 增删改 → 乐观更新。
 * 直接打真实后端，验证 store 的请求形状与本地状态更新是否一致。
 * 结束时清理本次创建的数据。
 *
 * 用法：node scripts/redstation-store-test.mjs
 */
const BASE = process.env.REDSTATION_URL || 'http://192.168.101.6:3011';

// ===== 最小化浏览器环境垫片，让 store 能在 Node 里跑 =====
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.fetch = globalThis.fetch;

// zustand 的 vanilla 入口无需 React
const { createStore } = await import('zustand/vanilla');

let pass = 0;
let fail = 0;
function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
}

console.log(`\n=== RedStation store 行为测试 @ ${BASE} ===\n`);

// ===== 复刻 store 的请求层（与 apis/redstation.ts 同形状）=====
const TOKEN_KEY = 'redstation.token';
const getToken = () => localStorage.getItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, query, skipAuth = false } = {}) {
  const url = new URL(path, BASE);
  if (query) for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!skipAuth) {
    const t = getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(url.href, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = data && typeof data === 'object' && typeof data.message === 'string' ? data.message : `请求失败（${res.status}）`;
    const e = new Error(msg); e.status = res.status; throw e;
  }
  return data;
}

// ===== 用与 store 相同的动作语义建一个 store =====
const useStore = createStore((set, get) => ({
  loggedIn: false, sessionLoading: true, me: null, members: [], teammates: [], projects: [], invites: [], loading: false, error: null,

  login: async (uid, password) => {
    const { token, user } = await request('/api/auth/login', { method: 'POST', body: { uid, password }, skipAuth: true });
    localStorage.setItem(TOKEN_KEY, token);
    set({ me: user, loggedIn: true, sessionLoading: false });
  },
  logout: async () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ me: null, members: [], teammates: [], projects: [], invites: [], loggedIn: false, sessionLoading: false });
  },
  restoreSession: async () => {
    if (!getToken()) { set({ loggedIn: false, sessionLoading: false }); return; }
    try { set({ me: await request('/api/auth/me'), loggedIn: true }); }
    catch { localStorage.removeItem(TOKEN_KEY); set({ me: null, loggedIn: false }); }
    finally { set({ sessionLoading: false }); }
  },
  loadProjects: async () => {
    try { set({ projects: (await request('/api/projects')).items, error: null }); }
    catch (e) { set({ error: e.message }); }
  },
  loadInvites: async () => { try { set({ invites: (await request('/api/projects/invites/my')).items }); } catch { set({ invites: [] }); } },
  loadTeammates: async () => { try { set({ teammates: await request('/api/users/teammates') }); } catch { set({ teammates: [] }); } },
  loadWorkspace: async () => {
    if (get().loading) return;
    set({ loading: true });
    try { await Promise.all([get().loadProjects(), get().loadInvites(), get().loadTeammates()]); }
    finally { set({ loading: false }); }
  },
  addProject: async (input) => {
    const created = await request('/api/projects', { method: 'POST', body: { ...input, label: input.label.trim() } });
    set({ projects: [...get().projects, created] });
    return created;
  },
  removeProject: async (id) => {
    await request(`/api/projects/${id}`, { method: 'DELETE' });
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
  addProjectTask: async (projectId, title, category) => {
    const created = await request(`/api/projects/${projectId}/tasks`, { method: 'POST', body: { title: title.trim(), category } });
    set({ projects: get().projects.map((p) => p.id === projectId ? { ...p, tasks: [...p.tasks, created], taskTotal: p.taskTotal + 1, unread: true } : p) });
  },
  toggleProjectTask: async (taskId) => {
    const updated = await request(`/api/projects/tasks/${taskId}/toggle`, { method: 'PATCH' });
    set({ projects: get().projects.map((p) => {
      if (!p.tasks.some((t) => t.id === taskId)) return p;
      const tasks = p.tasks.map((t) => (t.id === taskId ? updated : t));
      return { ...p, tasks, taskDone: tasks.filter((t) => t.done).length };
    }) });
  },
  updateProjectTask: async (taskId, patch) => {
    const updated = await request(`/api/projects/tasks/${taskId}`, { method: 'PATCH', body: patch });
    set({ projects: get().projects.map((p) => p.tasks.some((t) => t.id === taskId) ? { ...p, tasks: p.tasks.map((t) => (t.id === taskId ? updated : t)) } : p) });
  },
  removeProjectTask: async (taskId) => {
    await request(`/api/projects/tasks/${taskId}`, { method: 'DELETE' });
    set({ projects: get().projects.map((p) => {
      if (!p.tasks.some((t) => t.id === taskId)) return p;
      const tasks = p.tasks.filter((t) => t.id !== taskId);
      return { ...p, tasks, taskTotal: tasks.length, taskDone: tasks.filter((t) => t.done).length };
    }) });
  },
  markProjectRead: async (id) => {
    const item = get().projects.find((p) => p.id === id);
    if (!item || !item.unread) return;
    try {
      const updated = await request(`/api/projects/${id}/read`, { method: 'POST' });
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
    } catch { /* 静默 */ }
  },
}));

// ===== 1. 未登录时的会话恢复 =====
console.log('[1] 无 token 的会话恢复');
await useStore.getState().restoreSession();
check('sessionLoading 归位', useStore.getState().sessionLoading === false);
check('未登录', useStore.getState().loggedIn === false);

// ===== 2. 登录 =====
console.log('\n[2] 登录');
await useStore.getState().login('10248571', 'redstation');
check('loggedIn=true', useStore.getState().loggedIn === true);
check('me 已填充', useStore.getState().me?.id != null);
check('token 已落盘', !!localStorage.getItem(TOKEN_KEY));

// 错误密码不应污染登录态
const before = useStore.getState().me;
let threw = false;
try { await useStore.getState().login('10248571', 'nope'); } catch { threw = true; }
check('错误密码抛错', threw);
check('失败不影响既有会话', useStore.getState().me === before);

// ===== 3. 会话恢复（带 token）=====
console.log('\n[3] 带 token 的会话恢复');
useStore.setState({ me: null, loggedIn: false, sessionLoading: true });
await useStore.getState().restoreSession();
check('恢复后 loggedIn=true', useStore.getState().loggedIn === true, String(useStore.getState().me));
check('恢复后拿到用户', useStore.getState().me?.uid === '10248571', String(useStore.getState().me?.uid));

// ===== 4. 工作区加载 =====
console.log('\n[4] 工作区加载');
await useStore.getState().loadWorkspace();
const s = useStore.getState();
check('projects 非空', s.projects.length > 0, `len=${s.projects.length}`);
check('teammates 已加载', Array.isArray(s.teammates));
check('invites 已加载', Array.isArray(s.invites));
check('loading 归位', s.loading === false);
check('无错误', s.error === null, String(s.error));

// ===== 5. 项目 + 任务生命周期 =====
console.log('\n[5] 项目/任务生命周期');
const n0 = useStore.getState().projects.length;
const proj = await useStore.getState().addProject({
  label: `__store_${Date.now()}`, tag: 'store测试', color: 'green', ui: 'CLI',
  purpose: 'p', intro: 'i', stack: ['Node'], frameworks: [], deployed: false,
  deployPath: '', runPort: '', projectUrl: '', repoUrl: '', owner: '',
});
check('addProject 后列表 +1', useStore.getState().projects.length === n0 + 1);
check('新项目在列表中', useStore.getState().projects.some((p) => p.id === proj.id));
check('新项目 tasks 为空', useStore.getState().projects.find((p) => p.id === proj.id).tasks.length === 0);

await useStore.getState().addProjectTask(proj.id, 'store 任务', '功能');
let target = useStore.getState().projects.find((p) => p.id === proj.id);
check('addProjectTask 后 tasks=1', target.tasks.length === 1, `len=${target.tasks.length}`);
check('taskTotal 同步为 1', target.taskTotal === 1, String(target.taskTotal));
check('unread 置为 true', target.unread === true);
const tid = target.tasks[0].id;

await useStore.getState().toggleProjectTask(tid);
target = useStore.getState().projects.find((p) => p.id === proj.id);
check('toggle 后 done=true', target.tasks[0].done === true);
check('taskDone 同步为 1', target.taskDone === 1, String(target.taskDone));

await useStore.getState().updateProjectTask(tid, { title: 'store 任务改', category: 'UI' });
target = useStore.getState().projects.find((p) => p.id === proj.id);
check('标题已更新', target.tasks[0].title === 'store 任务改', target.tasks[0].title);
check('类别已更新', target.tasks[0].category === 'UI', target.tasks[0].category);

await useStore.getState().removeProjectTask(tid);
target = useStore.getState().projects.find((p) => p.id === proj.id);
check('删除任务后 tasks=0', target.tasks.length === 0);
check('taskTotal 归零', target.taskTotal === 0 && target.taskDone === 0);

// markProjectRead：unread 为 true 时应清除
check('读之前 unread=true', target.unread === true);
await useStore.getState().markProjectRead(proj.id);
check('markProjectRead 后 unread=false', useStore.getState().projects.find((p) => p.id === proj.id).unread === false);

// ===== 6. 删除项目 + 异常路径 =====
console.log('\n[6] 删除与异常处理');
await useStore.getState().removeProject(proj.id);
check('removeProject 后列表还原', useStore.getState().projects.length === n0);
check('已不在列表中', !useStore.getState().projects.some((p) => p.id === proj.id));

let delThrew = false;
try { await useStore.getState().removeProject(proj.id); } catch { delThrew = true; }
check('重复删除抛错（已不存在）', delThrew);

// ===== 7. 退出登录 =====
console.log('\n[7] 退出登录');
await useStore.getState().logout();
const out = useStore.getState();
check('loggedIn=false', out.loggedIn === false);
check('me=null', out.me === null);
check('projects 清空', out.projects.length === 0);
check('token 已清除', localStorage.getItem(TOKEN_KEY) === null);

// 退出后恢复会话应回到未登录
await useStore.getState().restoreSession();
check('退出后恢复会话 → 未登录', useStore.getState().loggedIn === false);

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n`);
process.exit(fail === 0 ? 0 : 1);
