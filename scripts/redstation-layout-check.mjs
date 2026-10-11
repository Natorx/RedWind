/**
 * 布局与样式校验：用 Edge headless 量取关键元素的计算样式和几何尺寸，
 * 确认「项目列表 / 任务面板 / 详情卡」三栏布局真的成形，而不是仅挂载了 DOM。
 *
 * 用法：node scripts/redstation-layout-check.mjs
 */
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP_URL = process.env.APP_URL || 'http://localhost:4173/';
const PORT = 9334;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const proc = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORT}`, '--remote-allow-origins=*',
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=1600,1000',
  '--user-data-dir=' + process.env.TEMP + '\\rs-layout-profile',
  'about:blank',
], { stdio: 'ignore' });

let target = null;
for (let i = 0; i < 40; i++) {
  await sleep(500);
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page');
    if (target?.webSocketDebuggerUrl) break;
  } catch {}
}
if (!target) { console.error('CDP 未就绪'); proc.kill(); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); }
});
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable'); await send('Page.enable');

async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r?.exceptionDetails) return null;
  return r?.result?.value;
}

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
}

await send('Page.navigate', { url: APP_URL });
await sleep(3500);

// 进入模块 + 登录
await evalJs(`(()=>{const b=Array.from(document.querySelectorAll('.sidebar-nav button')).find(x=>x.textContent.includes('项目管理')); if(b)b.click();})()`);
await sleep(2500);
await evalJs(`
  (() => {
    const i = document.querySelectorAll('.rs-login-form input');
    if (i.length < 2) return;
    const set = (el,v)=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));};
    set(i[0],'10248571'); set(i[1],'redstation');
    document.querySelector('.rs-login-form').requestSubmit();
  })()
`);
await sleep(4500);

console.log('\n=== 布局与样式校验 ===\n');

// 1. 页面网格：左栏 280px + 右栏弹性
const grid = await evalJs(`
  (() => {
    const p = document.querySelector('.rs-page');
    if (!p) return null;
    const cs = getComputedStyle(p);
    const side = document.querySelector('.rs-side');
    return { display: cs.display, cols: cs.gridTemplateColumns, sideW: side ? Math.round(side.getBoundingClientRect().width) : -1 };
  })()
`);
check('页面使用 grid 布局', grid?.display === 'grid', JSON.stringify(grid));
check('左栏宽度 280px', grid?.sideW === 280, `sideW=${grid?.sideW}`);

// 2. 三栏：详情打开时右侧分成两列
await evalJs(`(()=>{const b=Array.from(document.querySelectorAll('.rs-link-btn')).find(x=>x.textContent.includes('查看项目详情')); if(b)b.click();})()`);
await sleep(2500);
const split = await evalJs(`
  (() => {
    const s = document.querySelector('.rs-main-split');
    if (!s) return null;
    const cs = getComputedStyle(s);
    const cols = cs.gridTemplateColumns.split(' ').map(x=>Math.round(parseFloat(x)));
    const cards = document.querySelectorAll('.rs-main-split > .rs-card').length;
    return { detailOpen: s.classList.contains('detail-open'), cols, cards };
  })()
`);
check('详情打开时加 detail-open 类', split?.detailOpen === true, JSON.stringify(split));
check('右侧分为两列', split?.cols?.length === 2, `cols=${JSON.stringify(split?.cols)}`);
check('两个卡片并排', split?.cards === 2, `cards=${split?.cards}`);
check('两列宽度接近', split && Math.abs(split.cols[0] - split.cols[1]) < 40, JSON.stringify(split?.cols));

// 3. 卡片视觉：背景/边框/圆角来自设计令牌
const card = await evalJs(`
  (() => {
    const c = document.querySelector('.rs-card');
    if (!c) return null;
    const cs = getComputedStyle(c);
    return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, border: cs.borderTopWidth, color: cs.color };
  })()
`);
check('卡片深色背景已生效', card?.bg === 'rgb(18, 18, 22)', JSON.stringify(card));
check('卡片圆角 18px', card?.radius === '18px', String(card?.radius));
check('卡片有 1px 边框', card?.border === '1px', String(card?.border));

// 4. 紫色变量作用域：.rs-root 上应解析出设计令牌
const tokens = await evalJs(`
  (() => {
    const r = document.querySelector('.rs-root');
    if (!r) return null;
    const cs = getComputedStyle(r);
    return { red: cs.getPropertyValue('--red-500').trim(), bg1: cs.getPropertyValue('--rs-bg-1').trim(), radius: cs.getPropertyValue('--radius-lg').trim() };
  })()
`);
check('--red-500 令牌生效', tokens?.red === '#ef4444', JSON.stringify(tokens));
check('--rs-bg-1 令牌生效', tokens?.bg1 === '#121216', JSON.stringify(tokens));

// 5. 标签配色：不同 color 落到不同色值
const tagColors = await evalJs(`
  (() => {
    const out = {};
    document.querySelectorAll('.rs-tag').forEach(t => {
      const cls = Array.from(t.classList).find(c => c !== 'rs-tag');
      if (cls && !(cls in out)) out[cls] = getComputedStyle(t).color;
    });
    return out;
  })()
`);
check('标签按配色渲染出多种颜色', tagColors && Object.keys(tagColors).length >= 2, JSON.stringify(tagColors));

// 6. 任务勾选框：自定义样式（原生 input 透明）
const checkBox = await evalJs(`
  (() => {
    const c = document.querySelector('.rs-check input');
    const box = document.querySelector('.rs-check-box');
    if (!c || !box) return null;
    return { inputOpacity: getComputedStyle(c).opacity, boxW: Math.round(box.getBoundingClientRect().width) };
  })()
`);
check('勾选框为自定义样式', checkBox?.inputOpacity === '0' && checkBox?.boxW === 17, JSON.stringify(checkBox));

// 7. 分段筛选按钮：选中态有背景
const seg = await evalJs(`
  (() => {
    const on = document.querySelector('.rs-seg-btn.on');
    if (!on) return null;
    const cs = getComputedStyle(on);
    return { text: on.textContent, bg: cs.backgroundImage.slice(0, 30), color: cs.color };
  })()
`);
check('筛选按钮选中态有渐变背景', seg && seg.bg.includes('gradient'), JSON.stringify(seg));

// 8. 滚动容器
const scroll = await evalJs(`
  (() => {
    const r = document.querySelector('.rs-root');
    const cs = getComputedStyle(r);
    return { overflowY: cs.overflowY, h: Math.round(r.getBoundingClientRect().height) };
  })()
`);
check('模块可纵向滚动', scroll?.overflowY === 'auto', JSON.stringify(scroll));

// 9. 无横向溢出
const overflow = await evalJs(`document.documentElement.scrollWidth <= window.innerWidth + 2`);
check('无横向溢出', overflow === true);

// 10. 文字未被截断为空白
const textLen = await evalJs(`(document.querySelector('.rs-main-split')?.innerText||'').trim().length`);
check('主区有可见文本', textLen > 50, `len=${textLen}`);

// 截图（详情展开态）
const shot = await send('Page.captureScreenshot', { format: 'png' });
if (shot?.data) {
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/redstation-detail.png', Buffer.from(shot.data, 'base64'));
}

// 收起详情后再截一张
await evalJs(`(()=>{const b=document.querySelector('.rs-detail-close'); if(b)b.click();})()`);
await sleep(1500);
const shot2 = await send('Page.captureScreenshot', { format: 'png' });
if (shot2?.data) {
  mkdirSync('artifacts', { recursive: true });
  writeFileSync('artifacts/redstation-tasks.png', Buffer.from(shot2.data, 'base64'));
}
console.log('\n  截图：artifacts/redstation-detail.png, artifacts/redstation-tasks.png');

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 布局校验：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
ws.close(); proc.kill();
process.exit(failed === 0 ? 0 : 1);
