/**
 * 频道模块新版布局的运行时校验（连真实运行的 Tauri 应用）
 *
 * 通过 WebView2 的 CDP 端口驱动真实应用：
 * 进入「频道」页，量取左右两栏布局、类别竖向列表、类型筛选与右侧内容联动。
 *
 * 前置：以 WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222 启动 tauri dev
 * 用法：node scripts/channel-layout-check.mjs
 */
const PORT = process.env.CDP_PORT || 9222;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ===== 找到应用页面 =====
let target = null;
for (let i = 0; i < 30; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    target = list.find((t) => t.type === 'page' && /localhost:1420/.test(t.url || ''));
    if (target?.webSocketDebuggerUrl) break;
  } catch { /* 还没起来 */ }
  await sleep(500);
}
if (!target) { console.error('❌ 未找到应用页面，请确认已用调试端口启动 tauri dev'); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const errors = [];

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    errors.push('[console.error] ' + m.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
});
function send(method, params = {}) {
  return new Promise((res) => { const id = ++msgId; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
}
async function evalJs(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r?.exceptionDetails) return { __err: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  return { value: r?.result?.value };
}

await new Promise((r) => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Page.enable');

const results = [];
function check(label, cond, extra = '') {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
}

console.log('\n=== 频道模块布局校验（真实应用）===\n');

// ===== 进入频道页 =====
await evalJs(`
  (() => {
    const btns = Array.from(document.querySelectorAll('.sidebar-nav button'));
    const t = btns.find(b => b.textContent.includes('频道'));
    if (t) { t.click(); return true; }
    return false;
  })()
`);
await sleep(2500);

const title = await evalJs(`(document.querySelector('h1')||{}).textContent||''`);
check('已进入频道页', String(title.value).includes('频道'), String(title.value));

// ===== 1. 类型筛选仍在 =====
const kindTabs = await evalJs(`
  Array.from(document.querySelectorAll('button')).filter(b=>['全部','博主','视频'].includes(b.textContent.trim().replace(/\\s*\\d+$/,'').trim()))
    .map(b=>b.textContent.trim()).slice(0,6)
`);
check('类型筛选（全部/博主/视频）保留', Array.isArray(kindTabs.value) && kindTabs.value.length >= 3, JSON.stringify(kindTabs.value));

// ===== 2. 左栏类别竖向列表 =====
// 注意：页面里有两个 aside —— RedWind 自身左侧导航栏(.sidebar) 和本页的类别面板，
// 且两者都含 li>button。必须排除 .sidebar 才能定位到类别面板。
const ASIDE = `Array.from(document.querySelectorAll('aside')).find(a=>!String(a.className).includes('sidebar'))`;
const SECTION = `(()=>{const a=${ASIDE}; return a? a.parentElement.querySelector('section') : null;})()`;
/** 条目卡片：右侧内容区里带 bg-neutral-900/80 的直接子项 */
const CARDS = `(()=>{const s=${SECTION}; return s? Array.from(s.querySelectorAll('div')).filter(d=>/bg-neutral-900\\/80/.test(String(d.className))).length : -1;})()`;

const aside = await evalJs(`
  (() => {
    const a = ${ASIDE};
    if (!a) return null;
    const r = a.getBoundingClientRect();
    const rows = Array.from(a.querySelectorAll('li button'));
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      rows: rows.length,
      rowWidths: rows.slice(0,3).map(b=>Math.round(b.getBoundingClientRect().width)),
      rowTops: rows.slice(0,3).map(b=>Math.round(b.getBoundingClientRect().top)),
      rowLefts: rows.slice(0,3).map(b=>Math.round(b.getBoundingClientRect().left)),
    };
  })()
`);
check('左侧类别面板存在', aside?.__err === undefined && aside?.value !== null, JSON.stringify(aside));
check('类别为竖向列表', Array.isArray(aside?.value?.rowTops) && aside.value.rowTops[1] > aside.value.rowTops[0], JSON.stringify(aside?.value?.rowTops));
check('列表项左对齐同列', Array.isArray(aside?.value?.rowLefts) && new Set(aside.value.rowLefts).size === 1, JSON.stringify(aside?.value?.rowLefts));
// 面板宽 224（lg:w-56），两侧各 12px 内边距 + 1px 边框
check(
  '列表项占满整行宽',
  (aside?.value?.rowWidths?.[0] ?? 0) >= (aside?.value?.w ?? 999) - 26,
  `row=${aside?.value?.rowWidths?.[0]} aside=${aside?.value?.w}`,
);
check('类别数量 >= 6（含「全部类别」）', (aside?.value?.rows ?? 0) >= 6, `rows=${aside?.value?.rows}`);

// ===== 3. 右侧内容区 =====
const section = await evalJs(`
  (() => {
    const a = ${ASIDE};
    const s = ${SECTION};
    if (!a || !s) return null;
    const sr = s.getBoundingClientRect(), ar = a.getBoundingClientRect();
    return {
      w: Math.round(sr.width),
      left: Math.round(sr.left),
      asideRight: Math.round(ar.right),
      sideBySide: sr.left >= ar.right - 2,
      // 同一行：两者顶部接近，且没有把 section 挤到下一行
      sameRow: Math.abs(sr.top - ar.top) < 40,
      cards: s.querySelectorAll(':scope > div > div').length,
    };
  })()
`);
check('右侧内容区存在', section?.__err === undefined && section?.value !== null, JSON.stringify(section));
check('左右并排（右侧在左侧之右）', section?.value?.sideBySide === true, JSON.stringify(section?.value));
// 同一行：两者顶部接近（aside 有 lg:sticky top-6，允许 40px 内偏差）
check('左右同一行（未被挤到下一行）', section?.value?.sameRow === true, JSON.stringify(section?.value));
check('右侧渲染出条目卡片', (section?.value?.cards ?? 0) > 0, `cards=${section?.value?.cards}`);

// ===== 4. 默认选中第一个类别 =====
const firstActive = await evalJs(`
  (() => {
    const a = ${ASIDE};
    const rows = Array.from(a.querySelectorAll('li button'));
    const active = rows.find(b => (b.getAttribute('aria-current')||'') === 'true');
    const heading = ${SECTION}?.querySelector('h2');
    return { activeText: active?.textContent.replace(/\\d+$/,'').trim() ?? null, heading: heading?.textContent.trim() ?? null, index: rows.indexOf(active), total: rows.length };
  })()
`);
check('默认有选中类别', firstActive?.value?.activeText != null, JSON.stringify(firstActive?.value));
// 自动选中的是「第一个真实类别」（列表第 2 项，第 1 项是「全部类别」），
// 符合"避免右侧长期空着"的意图。
check(
  '默认自动选中第一个真实类别',
  firstActive?.value?.index === 1,
  `index=${firstActive?.value?.index} text=${firstActive?.value?.activeText}`,
);
check(
  '右侧标题 = 左侧选中类别',
  (() => {
    const a = String(firstActive?.value?.activeText ?? '').trim();
    const h = String(firstActive?.value?.heading ?? '').replace(/^#/, '').trim();
    return !!a && a === h;
  })(),
  `aside=${firstActive?.value?.activeText} heading=${firstActive?.value?.heading}`,
);

// ===== 5. 点击切换类别，右侧内容跟随 =====
const before = await evalJs(`${SECTION}?.querySelector('h2')?.textContent.trim()`);
await evalJs(`(()=>{const a=${ASIDE}; const r=a.querySelectorAll('li button'); if(r[2]) r[2].click();})()`);
await sleep(1200);
const after = await evalJs(`
  (() => {
    const a = ${ASIDE};
    const rows = Array.from(a.querySelectorAll('li button'));
    const active = rows.find(b => (b.getAttribute('aria-current')||'') === 'true');
    return { heading: ${SECTION}?.querySelector('h2')?.textContent.trim(), activeText: active?.textContent.replace(/\\d+$/,'').trim(), cards: ${CARDS} };
  })()
`);
check('点击类别后右侧标题变化', before.value !== after?.value?.heading, `before=${before.value} after=${after?.value?.heading}`);
check(
  '点击类别后右侧标题跟随选中项',
  String(after?.value?.heading ?? '').replace(/^#/, '').trim() === String(after?.value?.activeText ?? '').trim(),
  `heading=${after?.value?.heading} active=${after?.value?.activeText}`,
);

// ===== 6. 类型筛选联动类别列表 =====
async function clickKind(label) {
  await evalJs(`
    (() => {
      const b = Array.from(document.querySelectorAll('button'))
        .filter(x => !x.closest('li') && !String(x.closest('aside')?.className||'').includes('w-56'))
        .find(x => x.textContent.trim().replace(/\\s*\\d+$/, '').trim() === '${label}');
      if (b) b.click();
    })()
  `);
  await sleep(1300);
}
await clickKind('视频');
const videoState = await evalJs(`
  (() => {
    const a = ${ASIDE};
    const rows = Array.from(a.querySelectorAll('li button'));
    const active = rows.find(b => (b.getAttribute('aria-current')||'') === 'true');
    return { rows: rows.length, activeText: active?.textContent.replace(/\\d+$/,'').trim() ?? null, hasSelected: !!active, heading: ${SECTION}?.querySelector('h2')?.textContent.trim(), cards: ${CARDS} };
  })()
`);
check('切到「视频」后类别列表随之刷新', (videoState?.value?.rows ?? 0) >= 2, JSON.stringify(videoState?.value));
check('切到「视频」后仍有选中类别', videoState?.value?.hasSelected === true, JSON.stringify(videoState?.value));
check('视频筛选下渲染出视频条目', (videoState?.value?.cards ?? 0) > 0, `cards=${videoState?.value?.cards}`);
// 视频筛选下，卡片里的类型角标应都是「视频」
const kindsShown = await evalJs(`
  (() => {
    const s = ${SECTION};
    const cards = Array.from(s.querySelectorAll('div')).filter(d=>/bg-neutral-900\\/80/.test(String(d.className)));
    return cards.map(c=>{const t=c.textContent; return t.includes('视频')?'video':(t.includes('博主')?'blogger':'?');});
  })()
`);
check(
  '视频筛选下条目均为视频类型',
  Array.isArray(kindsShown?.value) && kindsShown.value.length > 0 && kindsShown.value.every((k) => k === 'video'),
  JSON.stringify(kindsShown?.value),
);

// 切回全部
await clickKind('全部');
const allState = await evalJs(`
  (() => {
    const a = ${ASIDE};
    return { rows: a.querySelectorAll('li button').length, cards: ${CARDS} };
  })()
`);
check('切回「全部」后类别恢复', (allState?.value?.rows ?? 0) >= 6, JSON.stringify(allState?.value));

// ===== 7. 选中「全部类别」应展示所有条目 =====
await evalJs(`
  (() => {
    const a = ${ASIDE};
    const rows = Array.from(a.querySelectorAll('li button'));
    const all = rows.find(b => b.textContent.trim().startsWith('全部类别'));
    if (all) all.click();
  })()
`);
await sleep(1200);
const allCards = await evalJs(CARDS);
check('「全部类别」展示所有条目', (allCards?.value ?? 0) >= 15, `cards=${allCards?.value}`);

// ===== 8. 无横向溢出 & 无运行时错误 =====
const overflow = await evalJs(`document.documentElement.scrollWidth <= window.innerWidth + 2`);
check('无横向溢出', overflow?.value === true, `scrollW=${(await evalJs('document.documentElement.scrollWidth'))?.value}`);

const realErrors = errors.filter((e) => !/favicon/i.test(e));
check('无运行时 JS 错误', realErrors.length === 0, realErrors.slice(0, 3).join(' || '));

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 结果：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
if (realErrors.length) realErrors.slice(0, 8).forEach((e) => console.log('  ERR ' + e));

ws.close();
process.exit(failed === 0 && realErrors.length === 0 ? 0 : 1);
