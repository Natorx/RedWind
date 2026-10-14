/**
 * 版本号读写逻辑的回归测试。
 *
 * 复刻 release.rs 中 read/write 的解析规则，在**临时副本**上验证：
 *   - JSON 的 version 只替换顶层那一处，不打乱格式
 *   - TOML 只改 [package] 段的 version，不动 [dependencies]
 *   - Cargo.lock 按包名精确定位，不误改依赖的版本
 * 全部在临时目录进行，不触碰真实项目。
 */
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const results = [];
const check = (label, cond, extra = '') => {
  results.push({ label, ok: !!cond });
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : '  → ' + extra}`);
};

/* ---------- 复刻 Rust 侧逻辑 ---------- */

function readJsonVersion(text) {
  try {
    const v = JSON.parse(text);
    return typeof v.version === 'string' ? v.version : '';
  } catch {
    return '';
  }
}

/** 与 write_json_version 一致：正则替换第一处 "version": "..." */
function writeJsonVersion(text, nv) {
  const re = /"version"\s*:\s*"[^"]*"/;
  if (!re.test(text)) throw new Error('未找到 version 字段');
  return text.replace(re, `"version": "${nv}"`);
}

function readCargoTomlVersion(text) {
  let inPkg = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('[')) {
      inPkg = t === '[package]';
      continue;
    }
    if (inPkg && t.startsWith('version')) {
      const m = /=/.exec(t);
      if (m) return t.slice(m.index + 1).trim().replace(/^"|"$/g, '');
    }
  }
  return '';
}

/** 与 write_cargo_toml_version 一致：只改 [package] 段第一处 version */
function writeCargoTomlVersion(text, nv) {
  const lines = text.split('\n');
  let inPkg = false;
  let done = false;
  const out = lines.map((line) => {
    const t = line.trim();
    if (t.startsWith('[')) {
      inPkg = t === '[package]';
      return line;
    }
    if (!done && inPkg && t.startsWith('version') && t.includes('=')) {
      const indent = line.match(/^\s*/)[0];
      done = true;
      return `${indent}version = "${nv}"`;
    }
    return line;
  });
  if (!done) throw new Error('未找到 [package] version');
  return out.join('\n');
}

/** 与 write_cargo_lock_version 一致：按 name 定位后再改 version */
function writeCargoLockVersion(text, pkgName, nv) {
  const lines = text.split('\n');
  let currentName = null;
  let changed = false;
  const out = lines.map((line) => {
    const t = line.trim();
    const nameMatch = /^name = "([^"]*)"/.exec(t);
    if (nameMatch) {
      currentName = nameMatch[1];
      return line;
    }
    if (!changed && t.startsWith('version = ') && currentName === pkgName) {
      const indent = line.match(/^\s*/)[0];
      changed = true;
      currentName = null;
      return `${indent}version = "${nv}"`;
    }
    return line;
  });
  return { text: out.join('\n'), changed };
}

console.log('\n=== 版本号读写逻辑验证 ===\n');

const dir = mkdtempSync(join(tmpdir(), 'rel-ver-'));

/* ---------- 1. JSON ---------- */
{
  // 注意：package.json 里可能有嵌套的 version（如某个依赖声明），
  // 规则是只改第一处（顶层）。构造带缩进的真实格式验证格式保持。
  const original = `{
  "name": "demo",
  "version": "0.7.1",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "some-pkg": "^1.0.0"
  }
}
`;
  writeFileSync(join(dir, 'package.json'), original);

  check('JSON 能读出当前版本', readJsonVersion(original) === '0.7.1', readJsonVersion(original));

  const updated = writeJsonVersion(original, '0.8.0');
  check('JSON 版本已更新', readJsonVersion(updated) === '0.8.0');
  check(
    'JSON 其他字段未被改动',
    updated.includes('"name": "demo"') &&
      updated.includes('"build": "vite build"') &&
      updated.includes('"some-pkg": "^1.0.0"'),
  );
  check('JSON 缩进格式保持', updated.includes('\n  "version": "0.8.0",'));
  check('JSON 行数不变', updated.split('\n').length === original.split('\n').length);
}

/* ---------- 2. tauri.conf.json：顶层 version 之外还有 $schema ---------- */
{
  const original = `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "Red Wind",
  "version": "0.7.1",
  "identifier": "com.example.app"
}
`;
  const updated = writeJsonVersion(original, '0.9.0');
  check('tauri.conf.json 版本更新', readJsonVersion(updated) === '0.9.0');
  check('tauri.conf.json 保留 $schema', updated.includes('schema.tauri.app'));
}

/* ---------- 3. Cargo.toml：必须只改 [package]，不动依赖 ---------- */
{
  const original = `[package]
name = "red-wind"
version = "0.7.1"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
serde = "1"
chrono = "0.4"

[profile.release]
strip = true
`;
  check('TOML 能读出 [package] 版本', readCargoTomlVersion(original) === '0.7.1', readCargoTomlVersion(original));

  const updated = writeCargoTomlVersion(original, '0.8.0');
  check('TOML [package] 版本已更新', readCargoTomlVersion(updated) === '0.8.0');

  // 关键：依赖段的 version 不能被误改
  check(
    'TOML 依赖版本未被误改',
    updated.includes('tauri = { version = "2", features = [] }') &&
      updated.includes('serde = "1"') &&
      updated.includes('chrono = "0.4"'),
    '依赖行被改坏了',
  );
  check('TOML name 未被改动', updated.includes('name = "red-wind"'));
  check('TOML profile 段保留', updated.includes('[profile.release]'));

  // 对照验证：朴素实现（盲改第一处 version = "..."）在什么情况下会出事。
  // 注意：当 [package] 的 version 排在前面时，朴素实现恰好也能工作；
  // 真正危险的是 [package] 未直接写 version（workspace 继承风格），
  // 此时第一处 version 落在依赖上，会被改坏。
  const workspaceStyle = `[package]
name = "demo"
edition = "2021"

[dependencies]
tauri = { version = "2", features = [] }
`;
  const naive = workspaceStyle.replace(/version = "[^"]*"/, 'version = "0.8.0"');
  check(
    '对照：workspace 风格下朴素实现会改坏依赖',
    !naive.includes('version = "2"'),
    '朴素实现竟然没改坏',
  );
  // 当前实现遇到该情形应报错，而不是乱改
  let threw = false;
  try {
    writeCargoTomlVersion(workspaceStyle, '0.8.0');
  } catch {
    threw = true;
  }
  check('[package] 无 version 时报错而非乱改', threw);
}

/* ---------- 4. Cargo.lock：按包名精确定位 ---------- */
{
  const original = `version = 4

[[package]]
name = "chrono"
version = "0.4.42"

[[package]]
name = "red-wind"
version = "0.7.1"
dependencies = [
 "chrono",
]

[[package]]
name = "serde"
version = "1.0.219"
`;
  const r = writeCargoLockVersion(original, 'red-wind', '0.8.0');
  check('lock 中本包版本已更新', r.changed && r.text.includes('name = "red-wind"\nversion = "0.8.0"'));
  check('lock 中 chrono 版本未被误改', r.text.includes('name = "chrono"\nversion = "0.4.42"'));
  check('lock 中 serde 版本未被误改', r.text.includes('name = "serde"\nversion = "1.0.219"'));

  // 包名不存在时应报告未改动
  const r2 = writeCargoLockVersion(original, 'not-exist', '9.9.9');
  check('包名不存在时不改动任何内容', r2.changed === false && r2.text === original);
}

/* ---------- 5. 版本号格式校验（与 Rust 侧正则一致） ---------- */
{
  const re = /^\d+\.\d+\.\d+([-+][0-9A-Za-z.\-]+)?$/;
  check('接受 1.2.3', re.test('1.2.3'));
  check('接受 0.8.0', re.test('0.8.0'));
  check('接受 1.2.3-beta.1', re.test('1.2.3-beta.1'));
  check('接受 1.2.3+build5', re.test('1.2.3+build5'));
  check('拒绝 1.2', !re.test('1.2'));
  check('拒绝 v1.2.3', !re.test('v1.2.3'));
  check('拒绝 空串', !re.test(''));
  check('拒绝 1.2.3.4', !re.test('1.2.3.4'));
}

/* ---------- 6. patch +1 递增 ---------- */
{
  const bump = (v) => {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim());
    if (!m) return '';
    return `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
  };
  check('0.7.1 -> 0.7.2', bump('0.7.1') === '0.7.2', bump('0.7.1'));
  check('1.0.9 -> 1.0.10', bump('1.0.9') === '1.0.10', bump('1.0.9'));
  check('无法解析时返回空串', bump('abc') === '');
}

rmSync(dir, { recursive: true, force: true });

const failed = results.filter((r) => !r.ok).length;
console.log(`\n=== 结果：${results.length - failed} 通过 / ${failed} 失败 ===\n`);
process.exit(failed === 0 ? 0 : 1);
