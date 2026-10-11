/**
 * RedStation 项目管理模块 —— 端到端接口冒烟测试
 *
 * 用与 client/apis/redstation.ts 完全相同的请求形状（路径、方法、body 字段）
 * 打真实后端，覆盖：健康检查 → 登录 → 列表 → 项目 CRUD → 任务 CRUD → 托管状态。
 * 结束时清理掉本次创建的项目。
 *
 * 用法：node scripts/redstation-smoke.mjs
 */
const BASE = process.env.REDSTATION_URL || 'http://192.168.101.6:3011';
const UID = '10248571';
const PASSWORD = 'redstation';

let token = null;
let pass = 0;
let fail = 0;

async function call(path, { method = 'GET', body, query, skipAuth = false } = {}) {
  const url = new URL(path, BASE);
  if (query) for (const [k, v] of Object.entries(query)) if (v != null) url.searchParams.set(k, String(v));
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (!skipAuth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url.href, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

function check(label, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${extra}`); }
}

console.log(`\n=== RedStation smoke @ ${BASE} ===\n`);

// 1. 健康检查（skipAuth）
console.log('[1] 健康检查');
const health = await call('/api/health', { skipAuth: true });
check('GET /api/health -> 200', health.status === 200, `got ${health.status}`);
check('database up', health.data?.database === 'up', JSON.stringify(health.data));

// 2. 错误密码应被拒绝
console.log('\n[2] 登录失败路径');
const bad = await call('/api/auth/login', { method: 'POST', body: { uid: UID, password: 'wrong' }, skipAuth: true });
check('错误密码 -> 401', bad.status === 401, `got ${bad.status}`);

// 3. 登录
console.log('\n[3] 登录');
const login = await call('/api/auth/login', { method: 'POST', body: { uid: UID, password: PASSWORD }, skipAuth: true });
check('POST /api/auth/login -> 2xx', login.ok && !!login.data?.token, `got ${login.status}`);
token = login.data?.token;
check('返回 user.name', typeof login.data?.user?.name === 'string', JSON.stringify(login.data?.user?.name));

// 4. 会话恢复
console.log('\n[4] 会话与成员');
const me = await call('/api/auth/me');
check('GET /api/auth/me -> 200', me.status === 200 && me.data?.id != null, `got ${me.status}`);
const members = await call('/api/users/members');
check('GET /api/users/members 是数组', Array.isArray(members.data), typeof members.data);
const mates = await call('/api/users/teammates');
check('GET /api/users/teammates 是数组', Array.isArray(mates.data), typeof mates.data);

// 5. 项目列表（列表项需含页面渲染依赖的字段）
console.log('\n[5] 项目列表');
const list = await call('/api/projects');
check('GET /api/projects -> 200', list.status === 200 && Array.isArray(list.data?.items), `got ${list.status}`);
const NEED = ['id','label','tag','color','unread','ui','purpose','intro','stack','frameworks','deployed','deployPath','runPort','projectUrl','repoUrl','owner','tasks','taskTotal','taskDone','members','memberCount','myRole'];
const first = list.data?.items?.[0];
const missing = NEED.filter((k) => first && !(k in first));
check('列表项字段完整', !!first && missing.length === 0, `missing: ${missing.join(',')}`);
if (first?.tasks?.[0]) {
  const t = first.tasks[0];
  const tMissing = ['id','projectId','title','done','category','author','date','ago','createdAt'].filter((k) => !(k in t));
  check('任务字段完整', tMissing.length === 0, `missing: ${tMissing.join(',')}`);
}

// 6. 项目 CRUD
console.log('\n[6] 项目 CRUD');
const created = await call('/api/projects', {
  method: 'POST',
  body: {
    label: `__smoke_${Date.now()}`,
    tag: '冒烟测试',
    color: 'cyan',
    ui: 'GUI',
    purpose: 'smoke',
    intro: 'smoke',
    stack: ['Node'],
    frameworks: ['Fastify'],
    deployed: false,
    deployPath: '/tmp/smoke',
    runPort: '3999',
    projectUrl: 'https://example.com',
    repoUrl: 'https://github.com/x/y',
  },
});
check('POST /api/projects -> 2xx', created.ok && created.data?.id != null, `got ${created.status} ${JSON.stringify(created.data).slice(0,160)}`);
const pid = created.data?.id;
if (pid) {
  check('myRole=owner', created.data?.myRole === 'owner', String(created.data?.myRole));
  check('owner 记为当前用户', created.data?.owner === login.data?.user?.name, String(created.data?.owner));

  const upd = await call(`/api/projects/${pid}`, { method: 'PATCH', body: { label: `__smoke_upd_${Date.now()}`, runPort: '4000' } });
  check('PATCH /api/projects/:id -> 2xx', upd.ok && upd.data?.runPort === '4000', `got ${upd.status}`);

  // 7. 任务 CRUD
  console.log('\n[7] 任务 CRUD');
  const task = await call(`/api/projects/${pid}/tasks`, { method: 'POST', body: { title: '冒烟任务', category: '优化' } });
  check('POST 任务 -> 2xx', task.ok && task.data?.id != null, `got ${task.status}`);
  const tid = task.data?.id;
  if (tid) {
    check('任务 category 落库', task.data?.category === '优化', String(task.data?.category));
    check('任务 author 为当前用户', task.data?.author === login.data?.user?.name, String(task.data?.author));
    const tg = await call(`/api/projects/tasks/${tid}/toggle`, { method: 'PATCH' });
    check('toggle 任务 -> done=true', tg.ok && tg.data?.done === true, `got ${tg.status} done=${tg.data?.done}`);
    const te = await call(`/api/projects/tasks/${tid}`, { method: 'PATCH', body: { title: '冒烟任务改', category: 'UI' } });
    check('编辑任务标题+类别', te.ok && te.data?.title === '冒烟任务改' && te.data?.category === 'UI', `got ${te.status}`);
    const td = await call(`/api/projects/tasks/${tid}`, { method: 'DELETE' });
    check('DELETE 任务 -> 2xx', td.ok, `got ${td.status}`);
  }

  // 8. 托管状态
  console.log('\n[8] 代码托管状态');
  const host = await call(`/api/projects/${pid}/hosting`);
  check('GET /hosting -> 200', host.status === 200 && typeof host.data?.hosted === 'boolean', `got ${host.status}`);

  // 9. 成员与邀请（只读路径）
  console.log('\n[9] 成员与邀请');
  const pm = await call(`/api/projects/${pid}/members`);
  check('GET /members -> 200', pm.status === 200 && Array.isArray(pm.data?.items), `got ${pm.status}`);
  const inv = await call(`/api/projects/${pid}/invites`);
  check('GET /invites -> 200', inv.status === 200 && Array.isArray(inv.data?.items), `got ${inv.status}`);
  const myInv = await call('/api/projects/invites/my');
  check('GET /invites/my -> 200', myInv.status === 200 && Array.isArray(myInv.data?.items), `got ${myInv.status}`);

  // 10. 未授权路径
  console.log('\n[10] 鉴权');
  const saved = token;
  token = null;
  const noAuth = await call(`/api/projects/${pid}/members`);
  check('无 token 访问 /members -> 401', noAuth.status === 401, `got ${noAuth.status}`);
  token = saved;

  // 清理
  console.log('\n[11] 清理');
  const del = await call(`/api/projects/${pid}`, { method: 'DELETE' });
  check('DELETE 项目 -> 2xx', del.ok, `got ${del.status}`);
  const gone = await call(`/api/projects/${pid}`);
  check('删除后查询 -> 404', gone.status === 404, `got ${gone.status}`);
}

console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===\n`);
process.exit(fail === 0 ? 0 : 1);
