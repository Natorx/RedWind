/**
 * 验证防抖逻辑：模拟连续选区变化，统计最终 API 调用次数。
 *
 * 复刻 Passage.tsx 中 scheduleTranslate 的计时行为（纯计时器，无需浏览器），
 * 用与真实拖选相同的时序驱动，确认：
 *   1. 连续变化时只在停止后调用一次
 *   2. 快速连续变化不会累积出多次调用
 *   3. 变化间隔超过阈值时各自触发（用户真的多次选择）
 */
const TRANSLATE_DEBOUNCE_MS = 500;

const results = [];
const check = (label, cond, extra = '') => {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
};

/** 建一个与实际实现同构的防抖翻译器 */
function makeTranslator() {
  let timer = null;
  let selected = '';
  let lastTranslated = '';
  const calls = [];

  return {
    calls,
    /** 与 scheduleTranslate 逻辑一致 */
    schedule(text) {
      if (text === selected && text === lastTranslated) return;
      selected = text;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (text === lastTranslated) return;
        lastTranslated = text;
        calls.push(text);
      }, TRANSLATE_DEBOUNCE_MS);
    },
    clear() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      selected = '';
      lastTranslated = '';
    },
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log('\n=== 防抖行为验证 ===\n');

/* 1. 模拟真实拖选：选区从 1 个字符逐步扩大到整句，每次间隔 16ms（约一帧） */
{
  const t = makeTranslator();
  const full = 'The morning arrives without ceremony and light moves slowly';
  for (let n = 1; n <= full.length; n++) {
    t.schedule(full.slice(0, n));
    await sleep(16);
  }
  // 停止选择，等待防抖窗口结束
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  check(
    `拖选 ${full.length} 次连续变化 → 仅 1 次 API 调用`,
    t.calls.length === 1,
    `实际 ${t.calls.length} 次: ${JSON.stringify(t.calls.slice(0, 5))}`,
  );
  check(
    '调用的是最终选区',
    t.calls[0] === full,
    t.calls[0] === undefined ? 'undefined' : `"${t.calls[0].slice(-20)}"`,
  );
}

/* 2. 对照：若不做防抖，这个场景会产生多少次调用 */
{
  const full = 'The morning arrives without ceremony and light moves slowly';
  const STEPS = full.length; // 按字符串实际长度推进，避免越界后内容不再变化
  let directCalls = 0;
  let last = '';
  for (let n = 1; n <= STEPS; n++) {
    const text = full.slice(0, n);
    if (text === last) continue;
    last = text;
    directCalls++; // 原实现：直接调用
    await sleep(16);
  }
  check(
    `对照：原实现同一场景会产生 ${STEPS} 次调用`,
    directCalls === STEPS,
    `实际 ${directCalls}`,
  );
  console.log(
    `         → 防抖把 ${STEPS} 次压缩为 1 次，减少 ${((1 - 1 / STEPS) * 100).toFixed(1)}%`,
  );
}

/* 3. 两次独立选择，间隔超过阈值 → 应各触发一次 */
{
  const t = makeTranslator();
  t.schedule('first selection');
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  t.schedule('second selection');
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  check('两次独立选择 → 2 次调用', t.calls.length === 2, `实际 ${t.calls.length} 次`);
  check(
    '两次内容都正确',
    t.calls[0] === 'first selection' && t.calls[1] === 'second selection',
    JSON.stringify(t.calls),
  );
}

/* 4. 选区内微小抖动（内容没变）不应重复调用 */
{
  const t = makeTranslator();
  t.schedule('same text');
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  // 内容未变，反复触发（模拟鼠标轻微移动）
  for (let i = 0; i < 10; i++) {
    t.schedule('same text');
    await sleep(20);
  }
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  check('内容未变的重复触发 → 不产生额外调用', t.calls.length === 1, `实际 ${t.calls.length} 次`);
}

/* 5. 停止选择后 500ms 内再次变化，应只调用最后一次 */
{
  const t = makeTranslator();
  t.schedule('a');
  await sleep(300); // 不足 500ms
  t.schedule('ab');
  await sleep(300); // 又不足
  t.schedule('abc');
  await sleep(TRANSLATE_DEBOUNCE_MS + 150);
  check('阈值内多次变化 → 只调用最后一次', t.calls.length === 1 && t.calls[0] === 'abc', JSON.stringify(t.calls));
}

/* 6. clear 应取消未触发的调用 */
{
  const t = makeTranslator();
  t.schedule('will be cancelled');
  await sleep(100);
  t.clear();
  await sleep(TRANSLATE_DEBOUNCE_MS + 200);
  check('计时器未到即取消 → 不调用', t.calls.length === 0, `实际 ${t.calls.length} 次`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 结果：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
process.exit(failed === 0 ? 0 : 1);
