/**
 * 用 Edge headless 渲染 RedWind 的「项目管理」模块，抓取运行时错误。
 *
 * 通过 CDP 直连（原生 WebSocket），不引入额外依赖：
 * 1. 启动 msedge --headless --remote-debugging-port
 * 2. 打开 preview 地址，点击侧栏「项目管理」
 * 3. 收集 console 错误 / 未捕获异常 / 失败请求
 * 4. 截图落盘供人工核对
 *
 * 用法：node scripts/redstation-render-check.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = process.env.APP_URL || 'http://localhost:4173/';
const PORT = 9333;

const errors = [];
const logs = [];
const failedRequests = [];

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ===== 启动 Edge =====
const proc = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--remote-allow-origins=*',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1600,1000',
  '--user-data-dir=' + process.env.TEMP + '\\rs-render-profile',
  'about:blank',
], { stdio: 'ignore' });

// ===== 等待 CDP 就绪 =====
let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const list = await res.json();
    target = list.find((t) => t.type === 'page');
    if (target?.webSocketDebuggerUrl) break;
  } catch { /* 还没起来 */ }
}
if (!target) { console.error('无法连接 Edge CDP'); proc.kill(); process.exit(1); }

// ===== 极简 CDP 客户端 =====
const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();

ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg.result ?? msg.error);
    pending.delete(msg.id);
    return;
  }
  // 事件
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    errors.push(`[exception] ${d.exception?.description || d.text}`);
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(' ');
    logs.push(`[console.${msg.params.type}] ${text}`);
    if (msg.params.type === 'error') errors.push(`[console.error] ${text}`);
  }
  if (msg.method === 'Network.loadingFailed') {
    failedRequests.push(`${msg.params.type} ${msg.params.errorText}`);
  }
});

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++msgId;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Network.enable');
await send('Page.enable');

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond, extra });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : ' ' + extra}`);
}

// ===== 打开应用 =====
console.log('\n=== 渲染检查 ===\n');
await send('Page.navigate', { url: APP_URL });
await sleep(3500);

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r?.exceptionDetails) return { error: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return { value: r?.result?.value };
}

// 首页应已渲染侧栏
const sidebar = await evalJs(`document.querySelectorAll('.sidebar-nav button').length`);
check('侧栏已渲染', sidebar.value >= 1, `buttons=${sidebar.value} ${sidebar.error ?? ''}`);

const labels = await evalJs(`Array.from(document.querySelectorAll('.sidebar-nav .nav-label')).map(e=>e.textContent).join('|')`);
check('侧栏含「项目管理」', String(labels.value).includes('项目管理'), String(labels.value));

// ===== 点击「项目管理」进入模块 =====
await evalJs(`
  (() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav button'));
    const t = btns.find(b => b.textContent.includes('项目管理'));
    if (t) { t.click(); return true; }
    return false;
  })()
`);
await sleep(3000);

const root = await evalJs(`!!document.querySelector('.rs-root')`);
check('模块根节点 .rs-root 已挂载', root.value === true, String(root.error ?? ''));

// 未登录时应出现登录卡片（弹窗）
const loginModal = await evalJs(`!!document.querySelector('.rs-login-modal')`);
check('未登录展示登录卡片', loginModal.value === true);

const backendShown = await evalJs(`(document.querySelector('.rs-login-hint')||{}).textContent||''`);
check('登录卡片显示后端地址', String(backendShown.value).includes('192.168.101.6:3011'), String(backendShown.value));

// ===== 执行登录 =====
await evalJs(`
  (() => {
    const inputs = document.querySelectorAll('.rs-login-form input');
    if (inputs.length < 2) return false;
    const setVal = (el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setVal(inputs[0], '10248571');
    setVal(inputs[1], 'redstation');
    document.querySelector('.rs-login-form').requestSubmit();
    return true;
  })()
`);
await sleep(4000);

const loggedIn = await evalJs(`!!document.querySelector('.rs-user-chip') && !document.querySelector('.rs-login-modal')`);
check('登录成功并进入主界面', loggedIn.value === true, String(loggedIn.error ?? ''));

// ===== 主界面内容 =====
const projectRows = await evalJs(`document.querySelectorAll('.rs-proj-row').length`);
check('项目列表已渲染', projectRows.value > 0, `rows=${projectRows.value}`);

const taskItems = await evalJs(`document.querySelectorAll('.rs-todo-item').length`);
check('任务列表已渲染', taskItems.value >= 0, `items=${taskItems.value}`);

const connState = await evalJs(`(document.querySelector('.rs-conn')||{}).textContent||''`);
check('后端连通状态为「已连接」', String(connState.value).includes('已连接'), String(connState.value));

const topSub = await evalJs(`(document.querySelector('.rs-topbar-sub')||{}).textContent||''`);
check('顶栏显示项目/任务统计', /个项目/.test(String(topSub.value)), String(topSub.value));

// ===== 打开项目详情 =====
await evalJs(`
  (() => {
    const b = Array.from(document.querySelectorAll('.rs-link-btn')).find(x=>x.textContent.includes('查看项目详情'));
    if (b) { b.click(); return true; } return false;
  })()
`);
await sleep(2500);
const detail = await evalJs(`!!document.querySelector('.rs-meta-grid')`);
check('详情卡已展开', detail.value === true);
const detailFields = await evalJs(`Array.from(document.querySelectorAll('.rs-meta-k')).map(e=>e.textContent).join('|')`);
check('详情含关键字段', /发起人/.test(String(detailFields.value)) && /运行端口/.test(String(detailFields.value)), String(detailFields.value));

// ===== 打开新建项目抽屉并关闭 =====
await evalJs(`(()=>{const b=Array.from(document.querySelectorAll('.rs-side-title-row button')).find(x=>x.textContent.includes('新建')); if(b){b.click();return true;} return false;})()`);
await sleep(1200);
const drawer = await evalJs(`!!document.querySelector('.rs-drawer')`);
check('新建项目抽屉可打开', drawer.value === true);
const stackChips = await evalJs(`document.querySelectorAll('.rs-drawer .rs-chip').length`);
check('抽屉含技术栈选项', stackChips.value > 0, `chips=${stackChips.value}`);
await evalJs(`(()=>{const b=document.querySelector('.rs-backdrop'); if(b) b.click(); return true;})()`);
await sleep(900);
const drawerClosed = await evalJs(`!document.querySelector('.rs-drawer')`);
check('抽屉可关闭', drawerClosed.value === true);

// ===== 任务筛选交互 =====
await evalJs(`
  (() => {
    const b = Array.from(document.querySelectorAll('.rs-seg-btn')).find(x=>x.textContent==='已完成');
    if (b) { b.click(); return true; } return false;
  })()
`);
await sleep(900);
const segOn = await evalJs(`Array.from(document.querySelectorAll('.rs-seg-btn.on')).map(e=>e.textContent).join('|')`);
check('任务筛选可切换', String(segOn.value).includes('已完成'), String(segOn.value));
// 切回全部
await evalJs(`(()=>{const b=Array.from(document.querySelectorAll('.rs-seg-btn')).filter(x=>x.textContent==='全部'); b.forEach(x=>x.click()); return true;})()`);
await sleep(600);

// ===== 截图 =====
const shot = await send('Page.captureScreenshot', { format: 'png' });
if (shot?.data) {
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/redstation-module.png', Buffer.from(shot.data, 'base64'));
  console.log('\n  截图已保存：artifacts/redstation-module.png');
}

// ===== 汇总 =====
const realErrors = errors.filter((e) => !/favicon|ERR_ABORTED|net::ERR_FAILED.*favicon/i.test(e));
check('无运行时 JS 错误', realErrors.length === 0, realErrors.slice(0, 5).join(' || '));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 渲染检查：${results.length - failed} 通过 / ${failed} 失败 ===`);
if (realErrors.length) {
  console.log('\n捕获到的错误：');
  realErrors.slice(0, 15).forEach((e) => console.log('  ' + e));
}
if (failedRequests.length) {
  console.log('\n失败请求：');
  [...new Set(failedRequests)].slice(0, 10).forEach((e) => console.log('  ' + e));
}

ws.close();
proc.kill();
process.exit(failed === 0 && realErrors.length === 0 ? 0 : 1);
