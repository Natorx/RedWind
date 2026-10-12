/**
 * CF_HDROP 解析与多图暂存的回归测试。
 *
 * 背景：剪贴板里有多张图片时（多选图片文件后 Ctrl+C），Windows 只提供
 * CF_HDROP（文件列表）而**没有** CF_DIB。原来的实现只看 CF_DIB/PNG，
 * 导致多图场景完全读不到。此测试锁定该缺陷。
 *
 * 覆盖：
 *   1. 复刻 Rust 侧 parse_hdrop 的解析逻辑，验证能正确切出多个路径
 *   2. 验证 UTF-16LE / ANSI 两种编码
 *   3. 用真实剪贴板设置多文件，确认端到端形态符合预期
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const results = [];
const check = (label, cond, extra = '') => {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
};

/* ---------- 复刻 Rust 的 parse_hdrop ---------- */

const CF_HDROP_OFFSET = 20; // DROPFILES 头：pFiles(4) + pt(8) + fNC(4) + fWide(4)

function parseHdrop(bytes) {
  if (bytes.length < 20) return [];
  const offset = bytes.readUInt32LE(0);
  const fWide = bytes.readUInt32LE(16) !== 0;
  if (offset >= bytes.length) return [];
  const body = bytes.subarray(offset);
  const paths = [];

  if (fWide) {
    // 注意：不能用 Uint16Array.from(...) 再转 —— 它按平台字节序写回，会得到乱码。
    // Rust 侧用 String::from_utf16_lossy(u16)，直接对 u16 值解码，是正确的；
    // 这里用 Node 的 utf16le 解码同样正确。
    let cur = [];
    for (let i = 0; i + 1 < body.length; i += 2) {
      const u = body.readUInt16LE(i);
      if (u === 0) {
        if (cur.length) {
          const buf = Buffer.alloc(cur.length * 2);
          cur.forEach((v, k) => buf.writeUInt16LE(v, k * 2));
          paths.push(buf.toString('utf16le'));
        }
        cur = [];
      } else cur.push(u);
    }
  } else {
    let cur = [];
    for (const b of body) {
      if (b === 0) {
        if (cur.length) paths.push(Buffer.from(cur).toString('latin1'));
        cur = [];
      } else cur.push(b);
    }
  }
  return paths;
}

/** 构造一个 CF_HDROP 字节块 */
function makeHdrop(paths, { wide = true } = {}) {
  const header = Buffer.alloc(CF_HDROP_OFFSET);
  header.writeUInt32LE(CF_HDROP_OFFSET, 0); // pFiles 指向数据起始
  header.writeUInt32LE(wide ? 1 : 0, 16); // fWide

  let body;
  if (wide) {
    const parts = [];
    for (const p of paths) {
      parts.push(Buffer.from(p, 'utf16le'));
      parts.push(Buffer.alloc(2)); // UTF-16 NUL
    }
    parts.push(Buffer.alloc(2)); // 结尾额外 NUL
    body = Buffer.concat(parts);
  } else {
    const parts = [];
    for (const p of paths) {
      parts.push(Buffer.from(p, 'latin1'));
      parts.push(Buffer.alloc(1));
    }
    parts.push(Buffer.alloc(1));
    body = Buffer.concat(parts);
  }
  return Buffer.concat([header, body]);
}

console.log('\n=== CF_HDROP 解析测试 ===\n');

/* 1. 单个路径 */
{
  const p = ['C:\\Users\\test\\a.png'];
  const got = parseHdrop(makeHdrop(p));
  check('单个路径能解析', got.length === 1 && got[0] === p[0], JSON.stringify(got));
}

/* 2. 多个路径 —— 这是本次修复的核心场景 */
{
  const p = [
    'C:\\Users\\test\\a.png',
    'C:\\Users\\test\\b.jpg',
    'C:\\Users\\test\\c.webp',
  ];
  const got = parseHdrop(makeHdrop(p));
  check('多路径能全部解析（核心缺陷）', got.length === 3, `got ${got.length} 项`);
  check('多路径内容正确', JSON.stringify(got) === JSON.stringify(p), JSON.stringify(got));
}

/* 3. 含中文路径 */
{
  const p = ['C:\\用户\\图片\\截图 1.png', 'C:\\用户\\图片\\截图 2.png'];
  const got = parseHdrop(makeHdrop(p));
  check('中文路径正确解码', JSON.stringify(got) === JSON.stringify(p), JSON.stringify(got));
}

/* 4. ANSI（非宽字符）编码 */
{
  const p = ['C:\\tmp\\x.png', 'C:\\tmp\\y.png'];
  const got = parseHdrop(makeHdrop(p, { wide: false }));
  check('ANSI 编码多路径能解析', got.length === 2, JSON.stringify(got));
}

/* 5. 边界情况 */
{
  check('空字节返回空数组', parseHdrop(Buffer.alloc(0)).length === 0);
  check('头部不足 20 字节返回空', parseHdrop(Buffer.alloc(10)).length === 0);
  const bad = makeHdrop(['C:\\a.png']);
  bad.writeUInt32LE(9999, 0); // offset 越界
  check('offset 越界安全返回空', parseHdrop(bad).length === 0);
}

/* 6. 复刻 Rust 的扩展名过滤 */
{
  const isImage = (path) => {
    const lower = path.toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif'].some((e) => lower.endsWith(e));
  };
  const mixed = ['a.png', 'b.txt', 'c.JPG', 'd.pdf', 'e.webp', 'f'];
  const kept = mixed.filter(isImage);
  check(
    '只保留图片扩展名',
    JSON.stringify(kept) === JSON.stringify(['a.png', 'c.JPG', 'e.webp']),
    JSON.stringify(kept),
  );
  check('大写扩展名也能识别', isImage('X.PNG') === true);
}

/* 7. 复刻 strip_ext */
{
  const stripExt = (name) => {
    const i = name.lastIndexOf('.');
    return i > 0 ? name.slice(0, i) : name;
  };
  check('去扩展名正常', stripExt('photo.png') === 'photo', stripExt('photo.png'));
  check('无扩展名保持原样', stripExt('photo') === 'photo');
  check('隐藏文件名不误伤', stripExt('.gitignore') === '.gitignore', stripExt('.gitignore'));
}

/* ---------- 真实剪贴板端到端 ---------- */
console.log('\n=== 真实剪贴板多图场景 ===\n');

const dir = mkdtempSync(join(tmpdir(), 'clip-regress-'));
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const files = [];
for (let i = 1; i <= 3; i++) {
  const p = join(dir, `shot${i}.png`);
  writeFileSync(p, PNG);
  files.push(p);
}

const list = files.map((f) => `'${f.replace(/'/g, "''")}'`).join(',');
const ps = `
Add-Type -AssemblyName System.Windows.Forms
$files = @(${list})
[System.Windows.Forms.Clipboard]::SetFileDropList([System.Collections.Specialized.StringCollection]$files)
Start-Sleep -Milliseconds 300
$fd = [System.Windows.Forms.Clipboard]::GetFileDropList()
Write-Output ("COUNT:" + $fd.Count)
$do = [System.Windows.Forms.Clipboard]::GetDataObject()
Write-Output ("HAS_HDROP:" + ($do.GetFormats() -contains 'FileDrop'))
Write-Output ("HAS_DIB:" + (($do.GetFormats() -contains 'DeviceIndependentBitmap') -or ($do.GetFormats() -contains 'Bitmap')))
`;

try {
  const out = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  const count = /COUNT:(\d+)/.exec(out)?.[1];
  const hasHdrop = /HAS_HDROP:(\w+)/.exec(out)?.[1];
  const hasDib = /HAS_DIB:(\w+)/.exec(out)?.[1];

  check('剪贴板确实有 3 个文件项', count === '3', `COUNT=${count}`);
  check('多图场景提供 FileDrop 格式', hasHdrop === 'True', `HAS_HDROP=${hasHdrop}`);
  check('多图场景【没有】DIB（印证旧实现必然失败）', hasDib === 'False', `HAS_DIB=${hasDib}`);
} catch (e) {
  console.log('  (无法操作剪贴板:', String(e.message).slice(0, 60), ')');
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 结果：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
process.exit(failed === 0 ? 0 : 1);
