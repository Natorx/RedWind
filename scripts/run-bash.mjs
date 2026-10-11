#!/usr/bin/env node
/**
 * 在 Windows 上通过 Git Bash 执行 .sh 脚本的跨平台包装器。
 *
 * 背景: pnpm/npm 在 Windows 上用 cmd.exe 执行 package.json 的 scripts,
 *       而 cmd.exe 找不到 `bash`(Git Bash 默认不加入系统 PATH)。
 *
 * 用法: node scripts/run-bash.mjs <script.sh> [args...]
 *
 * 定位策略(按顺序尝试):
 *   1. POSIX 环境(CONFIG_SHELL / $SHELL 含 bash, 或非 Windows) 直接用 bash
 *   2. 从 PATH 上的 git.exe 推导 Git 安装根 -> <root>\bin\bash.exe
 *   3. 常见安装位置兜底
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("用法: node scripts/run-bash.mjs <script.sh> [args...]");
  process.exit(2);
}

const isWindows = process.platform === "win32";

function firstExisting(candidates, check) {
  for (const c of candidates) {
    if (!c) continue;
    if (check(c)) return c;
  }
  return null;
}

/** 用 `where git` 找到 git.exe 路径, 推导 <gitRoot>\bin\bash.exe */
function bashFromGit() {
  const r = spawnSync(isWindows ? "where" : "which", ["git"], {
    encoding: "utf8",
    shell: false,
  });
  if (r.status !== 0 || !r.stdout) return null;

  const lines = r.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const candidates = [];
  for (const gitExe of lines) {
    // git.exe 通常位于 <root>\cmd\git.exe 或 <root>\bin\git.exe
    const gitRoot = path.dirname(path.dirname(gitExe));
    candidates.push(path.join(gitRoot, "bin", "bash.exe"));
    candidates.push(path.join(gitRoot, "usr", "bin", "bash.exe"));
    // 若 git 就在 <root>\bin 下, dirname 一次即可
    const gitRoot2 = path.dirname(gitExe);
    candidates.push(path.join(gitRoot2, "bash.exe"));
    candidates.push(path.join(gitRoot2, "..", "usr", "bin", "bash.exe"));
  }
  return firstExisting(candidates, (p) => existsSync(p));
}

function resolveBash() {
  const env = process.env;

  // 非 Windows: 直接用 PATH 上的 bash
  if (!isWindows) {
    return "bash";
  }

  // 显式覆盖: GIT_BASH / REDWIND_BASH
  const override = env.REDWIND_BASH || env.GIT_BASH;
  if (override && existsSync(override)) return override;

  // 从 git 推导
  const fromGit = bashFromGit();
  if (fromGit) return fromGit;

  // 常见安装位置兜底
  const fallbacks = [
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
    path.join(env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe"),
  ];
  const found = firstExisting(fallbacks, (p) => existsSync(p));
  if (found) return found;

  return null;
}

const bash = resolveBash();
if (!bash) {
  console.error(
    [
      "❌ 未找到 bash。",
      "",
      "这个项目需要在 Git Bash 下运行 shell 脚本。请任选其一:",
      "  1. 安装 Git for Windows: https://git-scm.com/download/win",
      "  2. 设置环境变量指向已有的 bash, 例如:",
      '     setx REDWIND_BASH "D:\\Git\\bin\\bash.exe"',
    ].join("\n"),
  );
  process.exit(1);
}

const [script, ...rest] = args;
const scriptPath = path.resolve(process.cwd(), script);

if (!existsSync(scriptPath)) {
  console.error(`❌ 找不到脚本: ${scriptPath}`);
  process.exit(1);
}

// 关键: 把脚本所在目录作为工作目录传给 bash, 并允许脚本用 BASH_SOURCE 自解析
const result = spawnSync(bash, [scriptPath, ...rest], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

if (result.error) {
  console.error(`❌ 无法启动 bash (${bash}): ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
