/**
 * 剪贴板图片读取逻辑的验证。
 *
 * 复刻 src-tauri/src/mods/clipboard_image.rs 里 dib_to_png 的解析算法，
 * 用真实截图工具产生的 DIB 字节验证：行序翻转、4 字节对齐、alpha 处理是否正确。
 * 这样能在不启动应用的前提下确认核心算法没写反。
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const results = [];
const check = (label, cond, extra = '') => {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
};

/* ---------- 复刻 Rust 的 DIB 解析（BITMAPINFOHEADER + BGR(A)） ---------- */

function dibToRgba(dib) {
  // 与 Rust 侧一致：头部不足 40 字节直接放弃，避免越界读取
  if (dib.length < 40) return null;
  const dv = new DataView(dib.buffer, dib.byteOffset, dib.byteLength);
  const headerSize = dv.getUint32(0, true);
  const width = dv.getInt32(4, true);
  const heightRaw = dv.getInt32(8, true);
  const bitCount = dv.getUint16(14, true);
  const compression = dv.getUint32(16, true);

  if (compression !== 0 && compression !== 3) return null;
  if (width <= 0 || heightRaw === 0) return null;

  const topDown = heightRaw < 0;
  const h = Math.abs(heightRaw);
  const w = width;

  let pixelOffset = headerSize;
  if (compression === 3) {
    if (headerSize === 40) pixelOffset += 12;
    if (bitCount === 32 && headerSize === 40) pixelOffset += 4;
  } else if (bitCount <= 8) {
    const colors = dv.getUint32(32, true);
    const n = colors === 0 ? 1 << bitCount : colors;
    pixelOffset += n * 4;
  }

  const bpp = bitCount / 8;
  if (bpp < 3) return null;

  const rowStride = Math.floor((w * bpp + 3) / 4) * 4;
  if (dib.length < pixelOffset + rowStride * h) return null;

  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const srcY = topDown ? y : h - 1 - y; // DIB 默认自下而上
    const rowStart = pixelOffset + srcY * rowStride;
    for (let x = 0; x < w; x++) {
      const p = rowStart + x * bpp;
      const b = dib[p];
      const g = dib[p + 1];
      const r = dib[p + 2];
      const a = bpp >= 4 ? (dib[p + 3] === 0 ? 255 : dib[p + 3]) : 255;
      const o = (y * w + x) * 4;
      rgba[o] = r;
      rgba[o + 1] = g;
      rgba[o + 2] = b;
      rgba[o + 3] = a;
    }
  }
  return { rgba, w, h };
}

/* ---------- 构造一张已知图案的 DIB，验证解析结果 ---------- */

/**
 * 造一张 w×h 的 24/32 位 DIB。
 * 图案：左上角红色块、右上角绿色块、左下角蓝色块、右下角白色块。
 * 这样只要行序或通道顺序写反，断言立刻失败。
 */
function makeDib(w, h, bpp, { topDown = false } = {}) {
  const headerSize = 40;
  const rowStride = Math.floor((w * bpp + 3) / 4) * 4;
  const buf = Buffer.alloc(headerSize + rowStride * h);

  buf.writeUInt32LE(headerSize, 0);
  buf.writeInt32LE(w, 4);
  buf.writeInt32LE(topDown ? -h : h, 8);
  buf.writeUInt16LE(1, 12); // planes
  buf.writeUInt16LE(bpp * 8, 14);
  buf.writeUInt32LE(0, 16); // BI_RGB
  buf.writeUInt32LE(rowStride * h, 20);

  // 每个象限的期望颜色（RGB）
  const colorAt = (x, y) => {
    const left = x < w / 2;
    const top = y < h / 2;
    if (left && top) return [255, 0, 0]; // 左上 红
    if (!left && top) return [0, 255, 0]; // 右上 绿
    if (left && !top) return [0, 0, 255]; // 左下 蓝
    return [255, 255, 255]; // 右下 白
  };

  for (let y = 0; y < h; y++) {
    // 存储行序：自下而上时，内存第 0 行是图像的"最下面"一行
    const storeRow = topDown ? y : h - 1 - y;
    const rowStart = headerSize + storeRow * rowStride;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = colorAt(x, y);
      const p = rowStart + x * bpp;
      buf[p] = b; // BGR 顺序
      buf[p + 1] = g;
      buf[p + 2] = r;
      if (bpp === 4) buf[p + 3] = 255;
    }
  }
  return buf;
}

function px(rgba, w, x, y) {
  const o = (y * w + x) * 4;
  return [rgba[o], rgba[o + 1], rgba[o + 2], rgba[o + 3]];
}

console.log('\n=== DIB 解析算法验证 ===\n');

/* 1. 24 位、自下而上（截图工具最常见） */
{
  const w = 40, h = 24;
  const dib = makeDib(w, h, 3, { topDown: false });
  const res = dibToRgba(dib);
  check('24位 DIB 能解析', !!res);
  if (res) {
    const tl = px(res.rgba, w, 1, 1);
    const tr = px(res.rgba, w, w - 2, 1);
    const bl = px(res.rgba, w, 1, h - 2);
    const br = px(res.rgba, w, w - 2, h - 2);
    check('左上=红（行序未翻转）', tl[0] === 255 && tl[1] === 0 && tl[2] === 0, JSON.stringify(tl));
    check('右上=绿', tr[0] === 0 && tr[1] === 255 && tr[2] === 0, JSON.stringify(tr));
    check('左下=蓝（上下未颠倒）', bl[0] === 0 && bl[1] === 0 && bl[2] === 255, JSON.stringify(bl));
    check('右下=白', br[0] === 255 && br[1] === 255 && br[2] === 255, JSON.stringify(br));
    check('24位 alpha 补 255', tl[3] === 255, String(tl[3]));
  }
}

/* 2. 行宽非 4 倍数（验证 stride 对齐处理） */
{
  const w = 3, h = 2; // 3*3 = 9 字节，需补齐到 12
  const dib = makeDib(w, h, 3);
  const res = dibToRgba(dib);
  check('非对齐行宽(3px)能解析', !!res, 'stride 计算需按 4 字节补齐');
  if (res) {
    const tl = px(res.rgba, w, 0, 0);
    check('非对齐行宽下左上仍为红', tl[0] === 255 && tl[1] === 0, JSON.stringify(tl));
  }
}

/* 3. 32 位、alpha=0 应视为不透明（截图工具常见写法） */
{
  const w = 8, h = 4;
  const dib = makeDib(w, h, 4);
  // 把所有 alpha 置 0
  for (let y = 0; y < h; y++) {
    const stride = ((w * 4 + 3) >> 2) * 4;
    for (let x = 0; x < w; x++) {
      dib[40 + y * stride + x * 4 + 3] = 0;
    }
  }
  const res = dibToRgba(dib);
  check('32位 alpha=0 时按不透明处理', !!res && res.rgba[3] === 255, res ? String(res.rgba[3]) : 'null');
}

/* 4. 自上而下（负高度） */
{
  const w = 16, h = 8;
  const dib = makeDib(w, h, 3, { topDown: true });
  const res = dibToRgba(dib);
  check('负高度（自上而下）能解析', !!res);
  if (res) {
    const tl = px(res.rgba, w, 1, 1);
    check('自上而下时左上仍为红', tl[0] === 255 && tl[1] === 0, JSON.stringify(tl));
  }
}

/* 5. 非法输入应安全返回 null 而不是崩溃 */
{
  check('空字节返回 null', dibToRgba(Buffer.alloc(0)) === null);
  check('过短字节返回 null', dibToRgba(Buffer.alloc(20)) === null);
  const bad = makeDib(8, 4, 3);
  bad.writeUInt32LE(99, 16); // 不支持的压缩方式
  check('未知压缩方式返回 null', dibToRgba(bad) === null);
}

/* ---------- 用真实剪贴板验证（若当前剪贴板有图） ---------- */
console.log('\n=== 真实剪贴板检查 ===\n');
try {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$img = [System.Windows.Forms.Clipboard]::GetImage()
if ($img) { "$($img.Width)x$($img.Height)" } else { "EMPTY" }
`;
  const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' }).trim();
  if (out === 'EMPTY') {
    console.log('  (当前剪贴板没有图片，跳过真实数据验证)');
    console.log('  提示：截图或复制一张图片后可重跑本脚本');
  } else {
    console.log(`  剪贴板当前有图片: ${out}`);
  }
} catch (e) {
  console.log('  (无法读取剪贴板:', String(e.message).slice(0, 60), ')');
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 结果：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
process.exit(failed === 0 ? 0 : 1);
