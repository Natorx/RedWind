/* src-tauri/src/mods/release.rs
description: 「版本发布」模块 —— 对一个项目目录执行版本发布流程

支持三类项目（按目录下的配置文件识别）：
  Tauri  package.json + src-tauri/tauri.conf.json + src-tauri/Cargo.toml
  Node   package.json
  Rust   Cargo.toml

五个步骤各自可选：
  1. 修改版本号（可多选具体文件）
  2. 构建（执行项目自己的构建命令，流式输出、可取消）
  3. 提取构建产物到指定目录
  4. git 提交（带备注）
  5. 推送到 GitHub

设计要点：
  - 版本号落在多个文件里，且规则不同（JSON / TOML / lockfile），
    因此不擅自决定改哪些，而是扫描出候选项交给前端勾选。
  - 构建是长任务，用 tokio 子进程逐行读输出并通过 Tauri 事件推给前端，
    同时保留 child 句柄以支持取消。
*/

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, State};
use tokio::io::{AsyncBufReadExt, BufReader};

use rusqlite::{params, Connection};

// ==================== 保存的配置 ====================

/// 一份已保存的发布配置。
///
/// 保存的是「用户在这个界面上填过的一切」，导入时整体回填，
/// 因此项目路径、四个步骤的开关、各自参数都在这里。
///
/// 字段名保持 snake_case：与 ProjectInfo 等项目内的其他结构一致，
/// 前端调用时按同名传参（见 Release.tsx 的 saveConfig）。
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedConfig {
    pub id: i64,
    /// 配置名（默认取项目名）
    pub name: String,
    /// 项目根目录
    pub root: String,
    /// 项目类型，仅作展示
    pub kind: String,
    /// 步骤开关
    pub do_version: bool,
    pub do_build: bool,
    pub do_extract: bool,
    pub do_commit: bool,
    pub do_push: bool,
    /// 版本号相关
    pub new_version: String,
    /// 勾选的版本号文件，JSON 数组字符串
    pub version_files: Vec<String>,
    /// 构建相关
    pub build_command: String,
    pub artifact_dir: String,
    pub extract_to: String,
    /// 提交与推送
    pub commit_message: String,
    pub force_push: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// 保存 / 更新配置的入参
#[derive(Debug, Deserialize)]
pub struct ConfigInput {
    /// Some(id) 表示覆盖已有配置，None 表示新建
    pub id: Option<i64>,
    pub name: String,
    pub root: String,
    pub kind: String,
    pub do_version: bool,
    pub do_build: bool,
    pub do_extract: bool,
    pub do_commit: bool,
    pub do_push: bool,
    pub new_version: String,
    pub version_files: Vec<String>,
    pub build_command: String,
    pub artifact_dir: String,
    pub extract_to: String,
    pub commit_message: String,
    pub force_push: bool,
}

// ==================== 数据结构 ====================

/// 项目类型
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ProjectKind {
    Tauri,
    Node,
    Rust,
    /// 未能识别
    Unknown,
}

/// 一处版本号所在位置
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VersionTarget {
    /// 相对项目根目录的路径，如 "package.json"
    pub path: String,
    /// 展示名，如 "package.json"
    pub label: String,
    /// 文件类型：json | toml | toml_lock
    pub format: String,
    /// 当前版本号（读不到则为空串）
    pub current: String,
    /// 是否建议默认勾选
    pub recommended: bool,
}

/// 项目扫描结果
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectInfo {
    /// 项目根目录绝对路径
    pub root: String,
    /// 项目名（取自配置文件）
    pub name: String,
    pub kind: ProjectKind,
    /// 识别到的语言，如 ["Rust", "TypeScript"]
    pub languages: Vec<String>,
    /// 所有版本号位置
    pub version_targets: Vec<VersionTarget>,
    /// 建议的构建命令
    pub build_command: String,
    /// 构建命令的工作目录（相对 root）
    pub build_dir: String,
    /// 构建产物的默认源目录（相对 root）
    pub artifact_dir: String,
    /// 产物文件匹配（扩展名）
    pub artifact_ext: Vec<String>,
    /// git 仓库根（相对 root，通常为 ""）
    pub git_root: String,
    /// 当前分支
    pub branch: String,
    /// 上游分支，如 origin/master；无则为空
    pub upstream: String,
    /// 是否存在未提交改动
    pub dirty: bool,
    /// 识别说明（给用户看的一句话）
    pub note: String,
}

// ==================== 运行状态 ====================

/// 构建进程句柄，用于取消
#[derive(Default)]
pub struct ReleaseState {
    pub build_child: Mutex<Option<tokio::process::Child>>,
    /// 标记用户是否请求取消，避免把「取消」误报为「失败」
    pub cancelled: Mutex<bool>,
}

/// 已保存配置的 SQLite 连接
pub struct ReleaseDbState {
    pub conn: Mutex<Connection>,
}

impl ReleaseDbState {
    pub fn new(conn: Connection) -> Self {
        ReleaseDbState {
            conn: Mutex::new(conn),
        }
    }
}

/// 建表
pub fn init_release_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS release_configs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            root TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT '',
            do_version INTEGER NOT NULL DEFAULT 1,
            do_build INTEGER NOT NULL DEFAULT 1,
            do_extract INTEGER NOT NULL DEFAULT 1,
            do_commit INTEGER NOT NULL DEFAULT 1,
            do_push INTEGER NOT NULL DEFAULT 1,
            new_version TEXT NOT NULL DEFAULT '',
            version_files TEXT NOT NULL DEFAULT '[]',
            build_command TEXT NOT NULL DEFAULT '',
            artifact_dir TEXT NOT NULL DEFAULT '',
            extract_to TEXT NOT NULL DEFAULT '',
            commit_message TEXT NOT NULL DEFAULT '',
            force_push INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )",
        [],
    )?;
    // 同名配置只保留一条（按 root 判重）
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_release_configs_root ON release_configs(root)",
        [],
    )?;
    Ok(())
}

/// 打开数据库并建表
pub fn init_release_database() -> Result<ReleaseDbState, String> {
    let dev_mode = std::env::var("dev_mode")
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    let dir = if dev_mode {
        crate::mods::path_set::get_dev_data_dir()
            .map_err(|e| e.to_string())?
    } else {
        crate::mods::path_set::get_prod_data_dir_image()
    };
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db_path = dir.join("release.db");
    println!("release database path: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    init_release_table(&conn).map_err(|e| e.to_string())?;
    Ok(ReleaseDbState::new(conn))
}

/// 启动时初始化；失败退回内存库，保证应用仍可运行
pub fn init_release_db_state() -> ReleaseDbState {
    match init_release_database() {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to initialize release database: {}", e);
            let conn = Connection::open_in_memory().unwrap();
            let _ = init_release_table(&conn);
            ReleaseDbState::new(conn)
        }
    }
}

// ==================== 工具 ====================

/// 读 JSON 文件里的 .version（也支持 "version" 键）
fn read_json_version(path: &Path) -> Option<String> {
    let raw = std::fs::read_to_string(path).ok()?;
    let v: serde_json::Value = serde_json::from_str(&raw).ok()?;
    v.get("version")?.as_str().map(|s| s.to_string())
}

/// 读 Cargo.toml [package] 段的 version
fn read_cargo_toml_version(path: &Path) -> Option<String> {
    let raw = std::fs::read_to_string(path).ok()?;
    let mut in_package = false;
    for line in raw.lines() {
        let t = line.trim();
        if t.starts_with('[') {
            in_package = t == "[package]";
            continue;
        }
        if in_package && t.starts_with("version") {
            // version = "0.1.0"
            if let Some(v) = t.split('=').nth(1) {
                return Some(v.trim().trim_matches('"').to_string());
            }
        }
    }
    None
}

/// 写 JSON 文件的 .version，保留原有缩进与键序（用 text 级替换，
/// 避免 serde 重新序列化打乱格式或丢失注释）
fn write_json_version(path: &Path, new_version: &str) -> Result<(), String> {
    let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let re = regex::Regex::new(r#""version"\s*:\s*"[^"]*""#).map_err(|e| e.to_string())?;
    if !re.is_match(&raw) {
        return Err(format!("未在 {} 中找到 version 字段", path.display()));
    }
    // 只替换第一处（package.json / tauri.conf.json 的顶层 version）
    let out = re.replacen(&raw, 1, format!("\"version\": \"{}\"", new_version));
    std::fs::write(path, out.as_bytes()).map_err(|e| e.to_string())
}

/// 写 Cargo.toml [package] 段的 version（只改第一处匹配）
fn write_cargo_toml_version(path: &Path, new_version: &str) -> Result<(), String> {
    let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut out = String::with_capacity(raw.len());
    let mut in_package = false;
    let mut done = false;

    for line in raw.split_inclusive('\n') {
        let t = line.trim();
        if t.starts_with('[') {
            in_package = t.trim_end() == "[package]";
            out.push_str(line);
            continue;
        }
        if !done && in_package && t.starts_with("version") && t.contains('=') {
            // 保留行首缩进
            let indent: String = line.chars().take_while(|c| c.is_whitespace()).collect();
            // 保留行尾换行
            let nl = if line.ends_with('\n') { "\n" } else { "" };
            out.push_str(&format!("{}version = \"{}\"{}", indent, new_version, nl));
            done = true;
            continue;
        }
        out.push_str(line);
    }

    if !done {
        return Err(format!(
            "未在 {} 的 [package] 段找到 version",
            path.display()
        ));
    }
    std::fs::write(path, out).map_err(|e| e.to_string())
}

/// 同步 Cargo.lock 里本项目包的版本号
///
/// lockfile 中形如：
///   [[package]]
///   name = "red-wind"
///   version = "0.7.1"
/// 需要按 name 精确定位，不能盲改（否则会改到依赖的版本）。
fn write_cargo_lock_version(path: &Path, pkg_name: &str, new_version: &str) -> Result<bool, String> {
    let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut out = String::with_capacity(raw.len());
    let mut current_name: Option<String> = None;
    let mut changed = false;

    for line in raw.split_inclusive('\n') {
        let t = line.trim();
        if let Some(rest) = t.strip_prefix("name = ") {
            current_name = Some(rest.trim().trim_matches('"').to_string());
            out.push_str(line);
            continue;
        }
        if !changed && t.starts_with("version = ") && current_name.as_deref() == Some(pkg_name) {
            let indent: String = line.chars().take_while(|c| c.is_whitespace()).collect();
            let nl = if line.ends_with('\n') { "\n" } else { "" };
            out.push_str(&format!("{}version = \"{}\"{}", indent, new_version, nl));
            changed = true;
            current_name = None;
            continue;
        }
        out.push_str(line);
    }

    if changed {
        std::fs::write(path, out).map_err(|e| e.to_string())?;
    }
    Ok(changed)
}

/// 同步执行一条命令并返回 (成功, stdout+stderr)
fn run_capture(dir: &Path, program: &str, args: &[&str]) -> (bool, String) {
    let out = crate::mods::release::hidden_command(program)
        .args(args)
        .current_dir(dir)
        .output();
    match out {
        Ok(o) => {
            let text = format!(
                "{}{}",
                String::from_utf8_lossy(&o.stdout),
                String::from_utf8_lossy(&o.stderr)
            );
            (o.status.success(), text.trim().to_string())
        }
        Err(e) => (false, format!("无法执行 {}：{}", program, e)),
    }
}

/// Windows 上隐藏子进程控制台窗口
#[cfg(windows)]
pub fn hidden_command(program: &str) -> std::process::Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut c = std::process::Command::new(program);
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

#[cfg(not(windows))]
pub fn hidden_command(program: &str) -> std::process::Command {
    std::process::Command::new(program)
}

// ==================== 命令：扫描项目 ====================

/// 扫描一个目录，识别项目类型、版本号位置、构建与产物路径
#[tauri::command]
pub fn scan_project(root: String) -> Result<ProjectInfo, String> {
    let root_path = PathBuf::from(&root);
    if !root_path.is_dir() {
        return Err(format!("目录不存在：{}", root));
    }

    let has_pkg = root_path.join("package.json").is_file();
    let has_cargo = root_path.join("Cargo.toml").is_file();
    let tauri_conf = root_path.join("src-tauri").join("tauri.conf.json");
    let has_tauri = has_pkg && tauri_conf.is_file();

    let (kind, note) = if has_tauri {
        (
            ProjectKind::Tauri,
            "识别为 Tauri 应用（package.json + src-tauri/tauri.conf.json）".to_string(),
        )
    } else if has_pkg {
        (ProjectKind::Node, "识别为 Node 项目（package.json）".to_string())
    } else if has_cargo {
        (
            ProjectKind::Rust,
            "识别为 Rust 项目（Cargo.toml）".to_string(),
        )
    } else {
        (
            ProjectKind::Unknown,
            "未找到 package.json 或 Cargo.toml，请确认所选目录".to_string(),
        )
    };

    // ---- 版本号位置 ----
    let mut targets: Vec<VersionTarget> = Vec::new();

    let mut push_json = |path: PathBuf, label: &str, recommended: bool| {
        if path.is_file() {
            targets.push(VersionTarget {
                path: path
                    .strip_prefix(&root_path)
                    .unwrap_or(&path)
                    .to_string_lossy()
                    .replace('\\', "/"),
                label: label.to_string(),
                format: "json".to_string(),
                current: read_json_version(&path).unwrap_or_default(),
                recommended,
            });
        }
    };

    match kind {
        ProjectKind::Tauri => {
            push_json(root_path.join("package.json"), "package.json", true);
            push_json(tauri_conf.clone(), "src-tauri/tauri.conf.json", true);

            let cargo = root_path.join("src-tauri").join("Cargo.toml");
            if cargo.is_file() {
                targets.push(VersionTarget {
                    path: "src-tauri/Cargo.toml".to_string(),
                    label: "src-tauri/Cargo.toml".to_string(),
                    format: "toml".to_string(),
                    current: read_cargo_toml_version(&cargo).unwrap_or_default(),
                    recommended: true,
                });
            }
            let lock = root_path.join("src-tauri").join("Cargo.lock");
            if lock.is_file() {
                // lock 里的版本由 cargo 构建时自动同步，故不默认勾选
                targets.push(VersionTarget {
                    path: "src-tauri/Cargo.lock".to_string(),
                    label: "src-tauri/Cargo.lock（构建时自动同步）".to_string(),
                    format: "cargo_lock".to_string(),
                    current: String::new(),
                    recommended: false,
                });
            }
        }
        ProjectKind::Node => {
            push_json(root_path.join("package.json"), "package.json", true);
        }
        ProjectKind::Rust => {
            let cargo = root_path.join("Cargo.toml");
            targets.push(VersionTarget {
                path: "Cargo.toml".to_string(),
                label: "Cargo.toml".to_string(),
                format: "toml".to_string(),
                current: read_cargo_toml_version(&cargo).unwrap_or_default(),
                recommended: true,
            });
            if root_path.join("Cargo.lock").is_file() {
                targets.push(VersionTarget {
                    path: "Cargo.lock".to_string(),
                    label: "Cargo.lock（构建时自动同步）".to_string(),
                    format: "cargo_lock".to_string(),
                    current: String::new(),
                    recommended: false,
                });
            }
        }
        ProjectKind::Unknown => {}
    }

    // ---- 项目名 ----
    let name = if has_pkg {
        std::fs::read_to_string(root_path.join("package.json"))
            .ok()
            .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
            .and_then(|v| v.get("name").and_then(|n| n.as_str()).map(String::from))
            .unwrap_or_else(|| {
                root_path
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default()
            })
    } else if has_cargo {
        std::fs::read_to_string(root_path.join("Cargo.toml"))
            .ok()
            .and_then(|s| {
                s.lines()
                    .find(|l| l.trim().starts_with("name"))
                    .and_then(|l| l.split('=').nth(1))
                    .map(|v| v.trim().trim_matches('"').to_string())
            })
            .unwrap_or_else(|| {
                root_path
                    .file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default()
            })
    } else {
        root_path
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_default()
    };

    // ---- 语言 ----
    let mut languages: Vec<String> = Vec::new();
    if has_cargo {
        languages.push("Rust".to_string());
    }
    if has_pkg {
        languages.push("TypeScript".to_string());
    }
    if root_path.join("client").is_dir() || root_path.join("src").is_dir() {
        // 仅作补充提示，不重复
    }
    if languages.is_empty() {
        languages.push("未知".to_string());
    }

    // ---- 构建命令 ----
    let (build_command, build_dir, artifact_dir, artifact_ext): (String, String, String, Vec<String>) = match kind {
        ProjectKind::Tauri => (
            "npx tauri build".to_string(),
            String::new(),
            "src-tauri/target/release/bundle/nsis".to_string(),
            vec![
                ".exe".to_string(),
                ".msi".to_string(),
                ".dmg".to_string(),
                ".appimage".to_string(),
                ".deb".to_string(),
            ],
        ),
        ProjectKind::Node => {
            // 有 build 脚本才建议执行
            let has_build = std::fs::read_to_string(root_path.join("package.json"))
                .ok()
                .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                .map(|v| v.get("scripts").and_then(|s| s.get("build")).is_some())
                .unwrap_or(false);
            (
                if has_build {
                    "pnpm build".to_string()
                } else {
                    String::new()
                },
                String::new(),
                "dist".to_string(),
                vec![],
            )
        }
        ProjectKind::Rust => (
            "cargo build --release".to_string(),
            String::new(),
            "target/release".to_string(),
            vec![],
        ),
        ProjectKind::Unknown => (String::new(), String::new(), String::new(), vec![]),
    };

    // ---- git ----
    let (branch, upstream, dirty) = {
        let (ok, out) = run_capture(&root_path, "git", &["rev-parse", "--abbrev-ref", "HEAD"]);
        let branch = if ok { out.trim().to_string() } else { String::new() };
        let (uok, uout) = run_capture(
            &root_path,
            "git",
            &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
        );
        let upstream = if uok { uout.trim().to_string() } else { String::new() };
        let (sok, sout) = run_capture(&root_path, "git", &["status", "--porcelain"]);
        let dirty = sok && !sout.trim().is_empty();
        (branch, upstream, dirty)
    };

    Ok(ProjectInfo {
        root: root_path.to_string_lossy().to_string(),
        name,
        kind,
        languages,
        version_targets: targets,
        build_command,
        build_dir,
        artifact_dir,
        artifact_ext,
        git_root: String::new(),
        branch,
        upstream,
        dirty,
        note,
    })
}

// ==================== 命令：改版本号 ====================

/// 按勾选的文件修改版本号，返回每个文件的处理结果描述
#[tauri::command]
pub fn apply_version(
    root: String,
    files: Vec<String>,
    new_version: String,
) -> Result<Vec<String>, String> {
    if files.is_empty() {
        return Ok(vec!["未选择任何文件，跳过".to_string()]);
    }
    // 版本号格式校验（允许预发布后缀）
    let re = regex::Regex::new(r"^\d+\.\d+\.\d+([\-+][0-9A-Za-z.\-]+)?$")
        .map_err(|e| e.to_string())?;
    if !re.is_match(new_version.trim()) {
        return Err(format!(
            "版本号格式不合法：{}（应形如 1.2.3 或 1.2.3-beta.1）",
            new_version
        ));
    }
    let v = new_version.trim();
    let root_path = PathBuf::from(&root);
    let mut logs = Vec::new();

    for rel in &files {
        let p = root_path.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        let name = p.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();

        let r = if name == "Cargo.lock" {
            // lock 需要按本包名精确定位
            let pkg_name = if root_path.join("src-tauri").join("Cargo.toml").is_file() && rel.contains("src-tauri") {
                read_cargo_package_name(&root_path.join("src-tauri").join("Cargo.toml"))
            } else {
                read_cargo_package_name(&root_path.join("Cargo.toml"))
            };
            match pkg_name {
                Some(pn) => write_cargo_lock_version(&p, &pn, v).map(|changed| {
                    if changed {
                        format!("✔ {} → {}", rel, v)
                    } else {
                        format!("· {} 未找到本包条目，跳过", rel)
                    }
                }),
                None => Err("无法确定包名".to_string()),
            }
        } else if name.ends_with(".json") {
            write_json_version(&p, v).map(|_| format!("✔ {} → {}", rel, v))
        } else if name == "Cargo.toml" {
            write_cargo_toml_version(&p, v).map(|_| format!("✔ {} → {}", rel, v))
        } else {
            Err(format!("不支持的文件类型：{}", rel))
        };

        match r {
            Ok(msg) => logs.push(msg),
            Err(e) => logs.push(format!("✖ {}：{}", rel, e)),
        }
    }

    Ok(logs)
}

/// 取 Cargo.toml [package] 段的 name
fn read_cargo_package_name(path: &Path) -> Option<String> {
    let raw = std::fs::read_to_string(path).ok()?;
    let mut in_package = false;
    for line in raw.lines() {
        let t = line.trim();
        if t.starts_with('[') {
            in_package = t == "[package]";
            continue;
        }
        if in_package && t.starts_with("name") {
            return t.split('=').nth(1).map(|v| v.trim().trim_matches('"').to_string());
        }
    }
    None
}

// ==================== 命令：流式执行构建 ====================

/// 构建输出事件
#[derive(Clone, Serialize)]
struct BuildOutput {
    line: String,
}

/// 构建结束事件
#[derive(Clone, Serialize)]
struct BuildDone {
    ok: bool,
    cancelled: bool,
    code: Option<i32>,
}

/// 执行构建命令，逐行推送输出到前端（事件名 release://output）
#[tauri::command]
pub async fn run_build(
    app: AppHandle,
    state: State<'_, ReleaseState>,
    root: String,
    command: String,
    work_dir: String,
) -> Result<(), String> {
    if command.trim().is_empty() {
        return Err("构建命令为空".to_string());
    }

    let root_path = PathBuf::from(&root);
    let cwd = if work_dir.trim().is_empty() {
        root_path.clone()
    } else {
        root_path.join(work_dir.trim())
    };
    if !cwd.is_dir() {
        return Err(format!("构建目录不存在：{}", cwd.display()));
    }

    // 重置取消标记。
    // 注意：MutexGuard 不是 Send，必须限制在语句内，
    // 否则整个 async fn 无法满足 Tauri 命令对 Send 的要求。
    {
        let mut c = state.cancelled.lock().map_err(|e| e.to_string())?;
        *c = false;
    }

    // Windows 上 pnpm/npm/npx 是 .cmd 脚本，需经 cmd /C 才能执行
    #[cfg(windows)]
    let mut cmd = {
        let mut c = tokio::process::Command::new("cmd");
        c.arg("/C").arg(&command);
        c
    };
    #[cfg(not(windows))]
    let mut cmd = {
        // 走 shell 以便支持带参数的整条命令
        let mut c = tokio::process::Command::new("sh");
        c.arg("-c").arg(&command);
        c
    };

    cmd.current_dir(&cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    #[cfg(windows)]
    {
        // tokio::process::Command 自带 creation_flags（内部转调 std），
        // 无需 use std::os::windows::process::CommandExt
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let mut child = cmd.spawn().map_err(|e| format!("无法启动构建：{}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    // 把子进程交给状态管理，供取消使用。
    // 同样把 guard 限制在块内，避免跨越 await。
    {
        let mut guard = state.build_child.lock().map_err(|e| e.to_string())?;
        *guard = Some(child);
    }

    // 逐行读取输出并推送
    let app_out = app.clone();
    let emit_line = move |s: String| {
        let _ = app_out.emit("release://output", BuildOutput { line: s });
    };

    let app1 = app.clone();
    let h1 = stdout.map(|o| {
        tokio::spawn(async move {
            let mut lines = BufReader::new(o).lines();
            while let Ok(Some(l)) = lines.next_line().await {
                let _ = app1.emit("release://output", BuildOutput { line: l });
            }
        })
    });
    let app2 = app.clone();
    let h2 = stderr.map(|o| {
        tokio::spawn(async move {
            let mut lines = BufReader::new(o).lines();
            while let Ok(Some(l)) = lines.next_line().await {
                let _ = app2.emit("release://output", BuildOutput { line: l });
            }
        })
    });

    if let Some(h) = h1 {
        let _ = h.await;
    }
    if let Some(h) = h2 {
        let _ = h.await;
    }

    // 等待退出。
    // 先把 child 从句柄中取出（guard 限制在块内），再 await——
    // MutexGuard 不是 Send，若跨 await 持有会导致整个 future 不是 Send。
    let mut child = {
        let mut guard = state.build_child.lock().map_err(|e| e.to_string())?;
        guard.take()
    };
    let status = match child.as_mut() {
        Some(c) => c.wait().await.ok(),
        None => None,
    };

    let code = status.as_ref().and_then(|s| s.code());
    let ok = status.map(|s| s.success()).unwrap_or(false);
    let cancelled = {
        let c = state.cancelled.lock().map_err(|e| e.to_string())?;
        *c
    };
    emit_line(if cancelled {
        "── 已取消 ──".to_string()
    } else if ok {
        "── 构建完成 ──".to_string()
    } else {
        "── 构建失败 ──".to_string()
    });

    let _ = app.emit(
        "release://done",
        BuildDone {
            ok,
            cancelled,
            code,
        },
    );

    if cancelled {
        return Err("构建已取消".to_string());
    }
    if !ok {
        return Err("构建失败，请查看输出".to_string());
    }
    Ok(())
}

/// 取消正在进行的构建
#[tauri::command]
pub async fn cancel_build(state: State<'_, ReleaseState>) -> Result<bool, String> {
    {
        let mut c = state.cancelled.lock().map_err(|e| e.to_string())?;
        *c = true;
    }
    // 取出子进程后再 await：MutexGuard 不能跨 await
    let mut child = {
        let mut guard = state.build_child.lock().map_err(|e| e.to_string())?;
        guard.take()
    };
    match child.as_mut() {
        Some(c) => {
            c.kill().await.map_err(|e| e.to_string())?;
            // 杀掉后放回，交由 run_build 收尾（它会 take 并 wait）
            let mut guard = state.build_child.lock().map_err(|e| e.to_string())?;
            *guard = child;
            Ok(true)
        }
        None => Ok(false),
    }
}

// ==================== 命令：提取产物 ====================

/// 把产物目录里的文件复制到目标目录，返回复制明细
#[tauri::command]
pub fn extract_artifacts(
    root: String,
    artifact_dir: String,
    dest: String,
    exts: Vec<String>,
) -> Result<Vec<String>, String> {
    let src = PathBuf::from(&root).join(artifact_dir.replace('/', std::path::MAIN_SEPARATOR_STR));
    if !src.is_dir() {
        return Err(format!("产物目录不存在：{}", src.display()));
    }
    let dest_path = PathBuf::from(&dest);
    std::fs::create_dir_all(&dest_path).map_err(|e| format!("无法创建目标目录：{}", e))?;

    let mut logs = Vec::new();
    let entries = std::fs::read_dir(&src).map_err(|e| e.to_string())?;
    let mut copied = 0usize;

    for e in entries.flatten() {
        let p = e.path();
        if !p.is_file() {
            continue;
        }
        // 若指定了扩展名，则按扩展名过滤
        if !exts.is_empty() {
            let name = p.file_name().map(|s| s.to_string_lossy().to_lowercase()).unwrap_or_default();
            if !exts.iter().any(|x| name.ends_with(&x.to_lowercase())) {
                continue;
            }
        }
        let target = dest_path.join(p.file_name().unwrap());
        match std::fs::copy(&p, &target) {
            Ok(n) => {
                copied += 1;
                let mb = n as f64 / 1024.0 / 1024.0;
                logs.push(format!(
                    "✔ {} ({:.2} MB)",
                    p.file_name().unwrap().to_string_lossy(),
                    mb
                ));
            }
            Err(err) => logs.push(format!(
                "✖ {}：{}",
                p.file_name().unwrap().to_string_lossy(),
                err
            )),
        }
    }

    if copied == 0 {
        logs.push(format!(
            "⚠ 未在 {} 中找到匹配的文件（扩展名过滤：{}）",
            src.display(),
            if exts.is_empty() { "无".to_string() } else { exts.join(", ") }
        ));
    } else {
        logs.push(format!("共复制 {} 个文件 → {}", copied, dest_path.display()));
    }
    Ok(logs)
}

// ==================== 命令：git 提交与推送 ====================

/// git add -A 并提交
#[tauri::command]
pub fn git_commit(root: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("提交备注不能为空".to_string());
    }
    let p = PathBuf::from(&root);

    let (ok, out) = run_capture(&p, "git", &["add", "-A"]);
    if !ok {
        return Err(format!("git add 失败：{}", out));
    }

    // 先看是否有内容可提交，避免空提交报错
    let (sok, sout) = run_capture(&p, "git", &["status", "--porcelain"]);
    if sok && sout.trim().is_empty() {
        return Ok("工作区无改动，跳过提交".to_string());
    }

    // 多行备注拆成多个 -m
    let mut args: Vec<String> = vec!["commit".to_string()];
    for line in message.lines().filter(|l| !l.trim().is_empty()) {
        args.push("-m".to_string());
        args.push(line.to_string());
    }
    let arg_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

    let (cok, cout) = run_capture(&p, "git", &arg_refs);
    if !cok {
        return Err(format!("git commit 失败：{}", cout));
    }
    Ok(cout)
}

/// 推送到上游分支
#[tauri::command]
pub fn git_push(root: String, force: bool) -> Result<String, String> {
    let p = PathBuf::from(&root);
    let args: Vec<&str> = if force {
        vec!["push", "--force-with-lease"]
    } else {
        vec!["push"]
    };
    let (ok, out) = run_capture(&p, "git", &args);
    if !ok {
        return Err(format!("git push 失败：{}", out));
    }
    Ok(if out.is_empty() { "已推送".to_string() } else { out })
}

/// 查询 git 状态摘要（供界面显示）
#[tauri::command]
pub fn git_status(root: String) -> Result<serde_json::Value, String> {
    let p = PathBuf::from(&root);
    if !p.join(".git").exists() {
        return Ok(serde_json::json!({ "isRepo": false }));
    }
    let (_, branch) = run_capture(&p, "git", &["rev-parse", "--abbrev-ref", "HEAD"]);
    let (uok, upstream) = run_capture(
        &p,
        "git",
        &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    );
    let (_, porcelain) = run_capture(&p, "git", &["status", "--porcelain"]);
    let (aok, ahead) = run_capture(&p, "git", &["rev-list", "--count", "@{u}..HEAD"]);

    Ok(serde_json::json!({
        "isRepo": true,
        "branch": branch.trim(),
        "upstream": if uok { upstream.trim().to_string() } else { String::new() },
        "dirty": !porcelain.trim().is_empty(),
        "changed": porcelain.lines().count(),
        "ahead": if aok { ahead.trim().parse::<i64>().unwrap_or(0) } else { 0 },
    }))
}

/// 列出目录下的子目录（供选择项目时浏览）
#[tauri::command]
pub fn list_subdirs(path: String) -> Result<Vec<String>, String> {
    let p = PathBuf::from(&path);
    if !p.is_dir() {
        return Err(format!("目录不存在：{}", path));
    }
    let mut dirs: Vec<String> = std::fs::read_dir(&p)
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().to_str().map(String::from))
        .filter(|n| !n.starts_with('.') && n != "node_modules" && n != "target")
        .collect();
    dirs.sort();
    Ok(dirs)
}

// ==================== 命令：配置的保存与导入 ====================

/// 行 → SavedConfig
fn row_to_config(row: &rusqlite::Row) -> rusqlite::Result<SavedConfig> {
    // version_files 以 JSON 数组字符串存储
    let files_raw: String = row.get("version_files")?;
    let version_files: Vec<String> = serde_json::from_str(&files_raw).unwrap_or_default();

    Ok(SavedConfig {
        id: row.get("id")?,
        name: row.get("name")?,
        root: row.get("root")?,
        kind: row.get("kind")?,
        do_version: row.get::<_, i64>("do_version")? != 0,
        do_build: row.get::<_, i64>("do_build")? != 0,
        do_extract: row.get::<_, i64>("do_extract")? != 0,
        do_commit: row.get::<_, i64>("do_commit")? != 0,
        do_push: row.get::<_, i64>("do_push")? != 0,
        new_version: row.get("new_version")?,
        version_files,
        build_command: row.get("build_command")?,
        artifact_dir: row.get("artifact_dir")?,
        extract_to: row.get("extract_to")?,
        commit_message: row.get("commit_message")?,
        force_push: row.get::<_, i64>("force_push")? != 0,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

/// 保存配置。
///
/// 同一个 root 已有配置时直接覆盖（避免反复保存产生重复条目），
/// 因此前端不需要关心到底该传不传 id。
#[tauri::command]
pub fn save_release_config(
    state: State<'_, ReleaseDbState>,
    config: ConfigInput,
) -> Result<SavedConfig, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let files_json = serde_json::to_string(&config.version_files).unwrap_or_else(|_| "[]".into());
    let now = chrono::Local::now().to_rfc3339();

    // 名称留空时用项目目录名兜底
    let name = if config.name.trim().is_empty() {
        PathBuf::from(&config.root)
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "未命名".to_string())
    } else {
        config.name.trim().to_string()
    };

    // 覆盖策略：优先按传入 id，其次按 root 匹配
    let existing_id: Option<i64> = match config.id {
        Some(id) => Some(id),
        None => conn
            .query_row(
                "SELECT id FROM release_configs WHERE root = ?1 LIMIT 1",
                params![config.root],
                |r| r.get(0),
            )
            .ok(),
    };

    let id = match existing_id {
        Some(id) => {
            conn.execute(
                "UPDATE release_configs SET
                    name=?1, root=?2, kind=?3,
                    do_version=?4, do_build=?5, do_extract=?6, do_commit=?7, do_push=?8,
                    new_version=?9, version_files=?10,
                    build_command=?11, artifact_dir=?12, extract_to=?13,
                    commit_message=?14, force_push=?15, updated_at=?16
                 WHERE id=?17",
                params![
                    name,
                    config.root,
                    config.kind,
                    config.do_version as i64,
                    config.do_build as i64,
                    config.do_extract as i64,
                    config.do_commit as i64,
                    config.do_push as i64,
                    config.new_version,
                    files_json,
                    config.build_command,
                    config.artifact_dir,
                    config.extract_to,
                    config.commit_message,
                    config.force_push as i64,
                    now,
                    id,
                ],
            )
            .map_err(|e| e.to_string())?;
            id
        }
        None => {
            conn.execute(
                "INSERT INTO release_configs
                    (name, root, kind, do_version, do_build, do_extract, do_commit, do_push,
                     new_version, version_files, build_command, artifact_dir, extract_to,
                     commit_message, force_push, created_at, updated_at)
                 VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?16)",
                params![
                    name,
                    config.root,
                    config.kind,
                    config.do_version as i64,
                    config.do_build as i64,
                    config.do_extract as i64,
                    config.do_commit as i64,
                    config.do_push as i64,
                    config.new_version,
                    files_json,
                    config.build_command,
                    config.artifact_dir,
                    config.extract_to,
                    config.commit_message,
                    config.force_push as i64,
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;
            conn.last_insert_rowid()
        }
    };

    conn.query_row(
        "SELECT * FROM release_configs WHERE id = ?1",
        params![id],
        row_to_config,
    )
    .map_err(|e| e.to_string())
}

/// 列出全部已保存配置，最近更新的在前
#[tauri::command]
pub fn list_release_configs(state: State<'_, ReleaseDbState>) -> Result<Vec<SavedConfig>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT * FROM release_configs ORDER BY updated_at DESC, id DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], row_to_config).map_err(|e| e.to_string())?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())
}

/// 删除一份配置
#[tauri::command]
pub fn delete_release_config(state: State<'_, ReleaseDbState>, id: i64) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;
    let n = conn
        .execute("DELETE FROM release_configs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(n > 0)
}

