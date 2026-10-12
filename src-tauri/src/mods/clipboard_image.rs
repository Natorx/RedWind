/* src-tauri/src/mods/clipboard_image.rs
description: 「图片暂存」模块 —— 一键把剪贴板里的图片存进本地临时图库，并可传到远程主机

构成：
  StagedImage   图库中的一条记录（文件落在磁盘，库里只存元数据）
  SshHost       可传输的目标主机配置
  ImageDbState  SQLite 连接（image.db）

存储位置：
  图片本体  <data_dir>/clipboard_images/<uuid>.<ext>
  图库索引  <data_dir>/image.db

设计要点：
  - 图片以文件形式落盘而不是塞进 SQLite：截图动辄几 MB，
    BLOB 会让库迅速膨胀，且前端无法直接用 asset 协议预览。
  - 剪贴板读取走 Win32 API（CF_DIB / CF_DIBV5），不依赖第三方工具。
  - 传输走系统自带 OpenSSH 的 scp，避免引入体积庞大的 SSH 库。
*/

use rusqlite::{params, Connection, Result as SqliteResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::State;

use crate::mods::path_set;

// ==================== 数据结构 ====================

/// 图库中的一张图片
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StagedImage {
    pub id: i64,
    /// 文件名（不含目录），用于拼接预览地址
    pub file_name: String,
    /// 磁盘上的绝对路径，便于「在文件夹中显示」
    pub path: String,
    /// 原始文件名（若剪贴板来源为文件复制则可能有值）
    pub title: String,
    /// 宽高（像素），读取失败时为 0
    pub width: i64,
    pub height: i64,
    /// 文件字节数
    pub bytes: i64,
    /// png / jpg / webp
    pub format: String,
    /// 来源描述，如「剪贴板」
    pub source: String,
    /// 创建时间（RFC3339）
    pub created_at: String,
    /// 是否已成功传输过
    pub uploaded: bool,
    /// 最近一次传输的目标，形如 user@host:/path
    pub uploaded_to: String,
}

/// 可传输的目标主机
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SshHost {
    pub id: i64,
    pub name: String,
    pub host: String,
    /// SSH 端口，默认 22
    pub port: i64,
    pub user: String,
    /// 目标目录，如 /home/teabos/pics
    pub remote_dir: String,
    /// 私钥路径；留空表示用默认密钥或 agent
    pub key_path: String,
    pub created_at: String,
}

/// 新建 / 编辑主机时的入参
#[derive(Debug, Deserialize)]
pub struct SshHostInput {
    pub name: String,
    pub host: String,
    pub port: Option<i64>,
    pub user: String,
    pub remote_dir: String,
    #[serde(default)]
    pub key_path: String,
}

/// 一次传输的结果
#[derive(Debug, Serialize)]
pub struct TransferResult {
    pub ok: bool,
    /// 成功 / 失败的数量
    pub sent: usize,
    pub failed: usize,
    /// 每个文件的失败原因，成功的不列
    pub errors: Vec<String>,
    /// 目标描述，如 teabos@192.168.101.6:/home/teabos/pics
    pub target: String,
}

// ==================== 数据库 ====================

pub struct ImageDbState {
    pub conn: Mutex<Connection>,
}

impl ImageDbState {
    pub fn new(conn: Connection) -> Self {
        ImageDbState {
            conn: Mutex::new(conn),
        }
    }
}

/// 图片文件存放目录（与库同级的 clipboard_images/）
pub fn images_dir() -> PathBuf {
    let dir = app_data_dir().join("clipboard_images");
    std::fs::create_dir_all(&dir).ok();
    dir
}

/// 应用数据目录：dev 走 target/debug/data，prod 走系统 AppData
fn app_data_dir() -> PathBuf {
    let dev_mode = std::env::var("dev_mode")
        .map(|v| v.eq_ignore_ascii_case("true"))
        .unwrap_or(false);

    if dev_mode {
        path_set::get_dev_data_dir().unwrap_or_else(|_| std::env::temp_dir())
    } else {
        path_set::get_prod_data_dir_channel()
    }
}

pub fn init_image_table(conn: &Connection) -> SqliteResult<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS images (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            path TEXT NOT NULL,
            title TEXT NOT NULL DEFAULT '',
            width INTEGER NOT NULL DEFAULT 0,
            height INTEGER NOT NULL DEFAULT 0,
            bytes INTEGER NOT NULL DEFAULT 0,
            format TEXT NOT NULL DEFAULT 'png',
            source TEXT NOT NULL DEFAULT '剪贴板',
            created_at TEXT NOT NULL,
            uploaded INTEGER NOT NULL DEFAULT 0,
            uploaded_to TEXT NOT NULL DEFAULT ''
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS ssh_hosts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL DEFAULT 22,
            user TEXT NOT NULL,
            remote_dir TEXT NOT NULL,
            key_path TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // 列表默认按时间倒序，建个索引
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_images_created ON images(created_at DESC)",
        [],
    )?;

    Ok(())
}

pub fn init_image_database() -> Result<ImageDbState, String> {
    let dir = app_data_dir();
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let db_path = dir.join("image.db");
    println!("image database path: {}", db_path.display());

    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| e.to_string())?;
    init_image_table(&conn).map_err(|e| e.to_string())?;

    Ok(ImageDbState::new(conn))
}

/// 启动时初始化；失败则退回内存库，保证应用仍可运行
pub fn init_image_db_state() -> ImageDbState {
    match init_image_database() {
        Ok(state) => state,
        Err(e) => {
            eprintln!("Failed to initialize image database: {}", e);
            let conn = Connection::open_in_memory().unwrap();
            let _ = init_image_table(&conn);
            ImageDbState::new(conn)
        }
    }
}

// ==================== 剪贴板读取（Windows） ====================

#[cfg(windows)]
mod clipboard {
    use windows::Win32::Foundation::HGLOBAL;
    use windows::Win32::System::DataExchange::{
        CloseClipboard, GetClipboardData, IsClipboardFormatAvailable, OpenClipboard,
    };
    use windows::Win32::System::Memory::{GlobalLock, GlobalSize, GlobalUnlock};

    /// CF_DIB = 8，CF_DIBV5 = 17。两者都是「BITMAPINFOHEADER + 像素」的原始布局。
    const CF_DIB: u32 = 8;
    const CF_DIBV5: u32 = 17;
    /// CF_HDROP = 15：文件列表。多选图片文件复制时只有这个，没有 CF_DIB。
    const CF_HDROP: u32 = 15;

    /// 从剪贴板取到的一张图
    pub struct ClipImage {
        /// 图片原始字节（PNG 直出，或由 DIB 转码而来）
        pub png: Vec<u8>,
        /// 来源文件名；来自内存位图时为空
        pub title: String,
    }

    /// 一次性读完剪贴板里**所有**图片。
    ///
    /// 顺序很关键，按可靠性从高到低：
    ///   1. CF_HDROP 文件列表 —— 多选图片文件复制走这条，
    ///      且能保留原始文件名。多张图在这里体现为多个路径。
    ///   2. PNG 注册格式 —— 单图且含透明通道时优先，画质最好。
    ///   3. CF_DIB / CF_DIBV5 —— 截图工具的通用路径。
    ///
    /// 关键点：多文件场景下**没有** CF_DIB，所以必须单独处理 CF_HDROP，
    /// 否则「粘贴板有多个图片」时会完全读不到。
    pub fn read_images() -> Result<Vec<ClipImage>, String> {
        unsafe {
            if OpenClipboard(None).is_err() {
                return Err("无法打开剪贴板（可能被其他程序占用）".to_string());
            }
            let result = (|| -> Result<Vec<ClipImage>, String> {
                let mut out: Vec<ClipImage> = Vec::new();

                // 1) 文件列表（可能是多个路径，也可能是单个）
                if IsClipboardFormatAvailable(CF_HDROP).is_ok() {
                    if let Ok(bytes) = read_blob(CF_HDROP) {
                        for path in parse_hdrop(&bytes) {
                            let p = std::path::Path::new(&path);
                            if !p.is_file() {
                                continue; // 目录等非文件项跳过
                            }
                            // 只收图片扩展名，避免把剪贴板里混着的其它文件也吞进来
                            if !is_image_file(&path) {
                                continue;
                            }
                            if let Ok(data) = std::fs::read(&path) {
                                if let Some(png) = normalize_to_png(&data) {
                                    let title = p
                                        .file_name()
                                        .map(|s| s.to_string_lossy().to_string())
                                        .unwrap_or_default();
                                    out.push(ClipImage { png, title });
                                }
                            }
                        }
                        // 文件列表里有图就直接返回：它比内存位图更权威
                        if !out.is_empty() {
                            return Ok(out);
                        }
                    }
                }

                // 2) PNG 注册格式
                let png_fmt = register_png_format();
                if png_fmt != 0 && IsClipboardFormatAvailable(png_fmt).is_ok() {
                    if let Ok(bytes) = read_blob(png_fmt) {
                        if !bytes.is_empty() {
                            out.push(ClipImage {
                                png: bytes,
                                title: String::new(),
                            });
                            return Ok(out);
                        }
                    }
                }

                // 3) DIB / DIBV5
                for fmt in [CF_DIB, CF_DIBV5] {
                    if IsClipboardFormatAvailable(fmt).is_ok() {
                        if let Ok(bytes) = read_blob(fmt) {
                            if let Some(png) = dib_to_png(&bytes) {
                                out.push(ClipImage {
                                    png,
                                    title: String::new(),
                                });
                                return Ok(out);
                            }
                        }
                    }
                }

                Err("剪贴板里没有图片".to_string())
            })();

            let _ = CloseClipboard();
            result
        }
    }

    /// 是否为受支持的图片文件
    fn is_image_file(path: &str) -> bool {
        let lower = path.to_ascii_lowercase();
        [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"]
            .iter()
            .any(|ext| lower.ends_with(ext))
    }

    /// 把任意受支持的图片字节统一转成 PNG。
    ///
    /// 这样图库里格式一致，前端预览与传输都不必再分支处理。
    /// 已是 PNG 的原样返回，避免无谓的重新编码。
    fn normalize_to_png(data: &[u8]) -> Option<Vec<u8>> {
        if data.starts_with(&[0x89, b'P', b'N', b'G']) {
            return Some(data.to_vec());
        }
        let img = image::load_from_memory(data).ok()?;
        let mut out = std::io::Cursor::new(Vec::new());
        img.write_to(&mut out, image::ImageFormat::Png).ok()?;
        Some(out.into_inner())
    }

    /// 解析 CF_HDROP 的 DROPFILES 结构，取出文件路径列表。
    ///
    /// 布局：DROPFILES 头（20 字节）+ 宽/窄字符路径串，
    /// 每个路径以 NUL 结尾，整块以额外的 NUL 收尾（双 NUL）。
    /// fWide 非 0 表示 UTF-16LE。
    fn parse_hdrop(bytes: &[u8]) -> Vec<String> {
        if bytes.len() < 20 {
            return Vec::new();
        }
        let offset = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]) as usize;
        let f_wide = u32::from_le_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]) != 0;

        if offset >= bytes.len() {
            return Vec::new();
        }
        let body = &bytes[offset..];
        let mut paths = Vec::new();

        if f_wide {
            // UTF-16LE：按 0x0000 切分
            let units: Vec<u16> = body
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            for chunk in units.split(|&u| u == 0) {
                if chunk.is_empty() {
                    continue;
                }
                paths.push(String::from_utf16_lossy(chunk));
            }
        } else {
            // ANSI：按单字节 0 切分
            for chunk in body.split(|&b| b == 0) {
                if chunk.is_empty() {
                    continue;
                }
                paths.push(String::from_utf8_lossy(chunk).to_string());
            }
        }

        paths
    }

    /// 注册 "PNG" 剪贴板格式，返回格式 id（0 表示失败）
    fn register_png_format() -> u32 {
        use windows::core::PCWSTR;
        use windows::Win32::System::DataExchange::RegisterClipboardFormatW;
        let name: Vec<u16> = "PNG\0".encode_utf16().collect();
        unsafe { RegisterClipboardFormatW(PCWSTR(name.as_ptr())) }
    }

    /// 读取指定格式的剪贴板数据为字节数组
    unsafe fn read_blob(fmt: u32) -> Result<Vec<u8>, String> {
        let handle = GetClipboardData(fmt).map_err(|e| format!("读取剪贴板失败: {}", e))?;
        let hglobal = HGLOBAL(handle.0);
        let ptr = GlobalLock(hglobal);
        if ptr.is_null() {
            return Err("锁定剪贴板内存失败".to_string());
        }
        let size = GlobalSize(hglobal);
        let slice = std::slice::from_raw_parts(ptr as *const u8, size);
        let out = slice.to_vec();
        let _ = GlobalUnlock(hglobal);
        Ok(out)
    }

    /// 把 DIB（BITMAPINFOHEADER + 像素）转成 PNG。
    ///
    /// DIB 用的是 BGR(A) 排列且行按 4 字节对齐，这里手动还原成 RGBA 后交给 image 编码。
    fn dib_to_png(dib: &[u8]) -> Option<Vec<u8>> {
        if dib.len() < 40 {
            return None;
        }
        let rd_u32 = |o: usize| -> u32 {
            u32::from_le_bytes([dib[o], dib[o + 1], dib[o + 2], dib[o + 3]])
        };
        let rd_i32 = |o: usize| -> i32 {
            i32::from_le_bytes([dib[o], dib[o + 1], dib[o + 2], dib[o + 3]])
        };
        let rd_u16 = |o: usize| -> u16 { u16::from_le_bytes([dib[o], dib[o + 1]]) };

        let header_size = rd_u32(0) as usize;
        let width = rd_i32(4);
        let height_raw = rd_i32(8);
        let bit_count = rd_u16(14) as u32;
        let compression = rd_u32(16);

        // 只处理未压缩（BI_RGB=0）与 BI_BITFIELDS=3
        if compression != 0 && compression != 3 {
            return None;
        }
        if width <= 0 || height_raw == 0 {
            return None;
        }

        // 负高度表示自上而下存储
        let top_down = height_raw < 0;
        let height = height_raw.abs();
        let w = width as usize;
        let h = height as usize;

        // 调色板/掩码之后才是像素数据
        let mut pixel_offset = header_size;
        if compression == 3 {
            // BI_BITFIELDS：紧跟 3 个 DWORD 掩码（若 header 未包含）
            if header_size == 40 {
                pixel_offset += 12;
            }
            // 32 位带 alpha 的常见情况，掩码后还有 4 字节 alpha 掩码
            if bit_count == 32 && header_size == 40 {
                pixel_offset += 4;
            }
        } else if bit_count <= 8 {
            // 调色板：每个表项 4 字节
            let colors = rd_u32(32);
            let n = if colors == 0 { 1usize << bit_count } else { colors as usize };
            pixel_offset += n * 4;
        }

        let bytes_per_pixel = (bit_count / 8) as usize;
        if bytes_per_pixel < 3 {
            // 8 位及以下的调色板图不常见，这里不做展开
            return None;
        }

        // 每行按 4 字节对齐
        let row_stride = ((w * bytes_per_pixel + 3) / 4) * 4;
        if dib.len() < pixel_offset + row_stride * h {
            return None;
        }

        let mut rgba = vec![0u8; w * h * 4];
        for y in 0..h {
            // DIB 默认自下而上，行序需要翻转
            let src_y = if top_down { y } else { h - 1 - y };
            let row_start = pixel_offset + src_y * row_stride;
            for x in 0..w {
                let p = row_start + x * bytes_per_pixel;
                let b = dib[p] as u8;
                let g = dib[p + 1] as u8;
                let r = dib[p + 2] as u8;
                // 32 位时第 4 字节是 alpha；很多截图工具写 0，
                // 全 0 会导致整图透明，故 alpha 为 0 时按不透明处理。
                let a = if bytes_per_pixel >= 4 {
                    let av = dib[p + 3];
                    if av == 0 {
                        255
                    } else {
                        av
                    }
                } else {
                    255
                };
                let o = (y * w + x) * 4;
                rgba[o] = r;
                rgba[o + 1] = g;
                rgba[o + 2] = b;
                rgba[o + 3] = a;
            }
        }

        // 下面复用 image crate 编码为 PNG
        Some(crate::mods::clipboard_image::encode_rgba_to_png(&rgba, w as u32, h as u32)?)
    }
}

#[cfg(not(windows))]
mod clipboard {
    pub struct ClipImage {
        pub png: Vec<u8>,
        pub title: String,
    }

    pub fn read_images() -> Result<Vec<ClipImage>, String> {
        Err("当前仅支持 Windows 平台读取剪贴板图片".to_string())
    }
}

use clipboard::read_images;

/// 把 RGBA 像素编码成 PNG 字节（供剪贴板 DIB 转换复用）
pub fn encode_rgba_to_png(rgba: &[u8], w: u32, h: u32) -> Option<Vec<u8>> {
    use image::{ImageBuffer, Rgba};
    let buf: ImageBuffer<Rgba<u8>, _> = ImageBuffer::from_raw(w, h, rgba.to_vec())?;
    let mut out = std::io::Cursor::new(Vec::new());
    buf.write_to(&mut out, image::ImageFormat::Png).ok()?;
    Some(out.into_inner())
}

/// 返回图片的 (宽, 高)，失败则为 (0, 0)
fn probe_size(path: &std::path::Path) -> (i64, i64) {
    match image::image_dimensions(path) {
        Ok((w, h)) => (w as i64, h as i64),
        Err(_) => (0, 0),
    }
}

// ==================== 命令：图库 ====================

/// 读取剪贴板里的**全部**图片并存入图库，返回新增的记录。
///
/// 剪贴板可能同时包含多张图（多选图片文件复制），因此返回数组。
/// 前端据此提示"已暂存 N 张"。
#[tauri::command]
pub fn capture_clipboard_image(
    state: State<'_, ImageDbState>,
) -> Result<Vec<StagedImage>, String> {
    let clips = read_images()?;
    if clips.is_empty() {
        return Err("剪贴板里没有图片".to_string());
    }

    let dir = images_dir();
    let base_stamp = chrono::Local::now().format("%Y%m%d-%H%M%S").to_string();
    let base_millis = chrono::Local::now().timestamp_subsec_millis();

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut saved = Vec::with_capacity(clips.len());

    for (idx, clip) in clips.into_iter().enumerate() {
        // 序号后缀保证同一批内多张图文件名互不冲突
        let file_name = format!("clip-{}-{:03}-{}.png", base_stamp, base_millis, idx);
        let path = dir.join(&file_name);

        std::fs::write(&path, &clip.png).map_err(|e| format!("写入图片失败: {}", e))?;

        let (width, height) = probe_size(&path);
        let bytes = clip.png.len() as i64;
        let created_at = chrono::Local::now().to_rfc3339();
        let path_str = path.to_string_lossy().to_string();

        // 来源文件名去掉扩展名，作为默认标题更易读
        let title = strip_ext(&clip.title);

        conn.execute(
            "INSERT INTO images (file_name, path, title, width, height, bytes, format, source, created_at, uploaded, uploaded_to)
             VALUES (?, ?, ?, ?, ?, ?, 'png', '剪贴板', ?, 0, '')",
            params![file_name, path_str, title, width, height, bytes, created_at],
        )
        .map_err(|e| e.to_string())?;

        saved.push(StagedImage {
            id: conn.last_insert_rowid(),
            file_name,
            path: path_str,
            title,
            width,
            height,
            bytes,
            format: "png".to_string(),
            source: "剪贴板".to_string(),
            created_at,
            uploaded: false,
            uploaded_to: String::new(),
        });
    }

    Ok(saved)
}

/// 去掉文件扩展名，用作默认标题
fn strip_ext(name: &str) -> String {
    match name.rfind('.') {
        Some(i) if i > 0 => name[..i].to_string(),
        _ => name.to_string(),
    }
}

/// 列出图库中的图片，新的在前
#[tauri::command]
pub fn list_images(state: State<'_, ImageDbState>) -> Result<Vec<StagedImage>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, file_name, path, title, width, height, bytes, format, source, created_at, uploaded, uploaded_to
             FROM images ORDER BY id DESC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(StagedImage {
                id: row.get(0)?,
                file_name: row.get(1)?,
                path: row.get(2)?,
                title: row.get(3)?,
                width: row.get(4)?,
                height: row.get(5)?,
                bytes: row.get(6)?,
                format: row.get(7)?,
                source: row.get(8)?,
                created_at: row.get(9)?,
                uploaded: row.get::<_, i64>(10)? != 0,
                uploaded_to: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())
}

/// 重命名图片标题（空标题表示清除）
#[tauri::command]
pub fn update_image_title(
    state: State<'_, ImageDbState>,
    id: i64,
    title: String,
) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let n = conn
        .execute(
            "UPDATE images SET title = ? WHERE id = ?",
            params![title, id],
        )
        .map_err(|e| e.to_string())?;

    Ok(n > 0)
}

/// 删除图库记录，并尽力删掉磁盘文件
#[tauri::command]
pub fn delete_image(state: State<'_, ImageDbState>, id: i64) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    // 先取路径再删记录，避免删了记录却找不到文件
    let path: Option<String> = conn
        .query_row("SELECT path FROM images WHERE id = ?", params![id], |r| {
            r.get(0)
        })
        .ok();

    let n = conn
        .execute("DELETE FROM images WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    if n > 0 {
        if let Some(p) = path {
            // 文件可能已被手工删除，失败不报错
            let _ = std::fs::remove_file(p);
        }
    }

    Ok(n > 0)
}

/// 批量删除；返回实际删除的条数
#[tauri::command]
pub fn delete_images(state: State<'_, ImageDbState>, ids: Vec<i64>) -> Result<usize, String> {
    if ids.is_empty() {
        return Ok(0);
    }

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut removed = 0usize;
    for id in ids {
        let path: Option<String> = conn
            .query_row("SELECT path FROM images WHERE id = ?", params![id], |r| {
                r.get(0)
            })
            .ok();
        let n = conn
            .execute("DELETE FROM images WHERE id = ?", params![id])
            .map_err(|e| e.to_string())?;
        if n > 0 {
            removed += 1;
            if let Some(p) = path {
                let _ = std::fs::remove_file(p);
            }
        }
    }

    Ok(removed)
}

/// 清空图库（连同磁盘文件）
#[tauri::command]
pub fn clear_images(state: State<'_, ImageDbState>) -> Result<usize, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let paths: Vec<String> = {
        let mut stmt = conn
            .prepare("SELECT path FROM images")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |r| r.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        rows.collect::<SqliteResult<Vec<_>>>()
            .map_err(|e| e.to_string())?
    };

    let n = conn
        .execute("DELETE FROM images", [])
        .map_err(|e| e.to_string())?;

    for p in paths {
        let _ = std::fs::remove_file(p);
    }

    Ok(n)
}

/// 图库统计：总数与占用体积
#[tauri::command]
pub fn image_stats(state: State<'_, ImageDbState>) -> Result<serde_json::Value, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let (count, bytes): (i64, i64) = conn
        .query_row(
            "SELECT COUNT(*), COALESCE(SUM(bytes), 0) FROM images",
            [],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    let uploaded: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM images WHERE uploaded = 1",
            [],
            |r| r.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "count": count,
        "bytes": bytes,
        "uploaded": uploaded,
        "dir": images_dir().to_string_lossy(),
    }))
}

/// 取图库目录，供「打开文件夹」使用
#[tauri::command]
pub fn images_directory() -> String {
    images_dir().to_string_lossy().to_string()
}

// ==================== 命令：主机配置 ====================

#[tauri::command]
pub fn list_ssh_hosts(state: State<'_, ImageDbState>) -> Result<Vec<SshHost>, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, name, host, port, user, remote_dir, key_path, created_at
             FROM ssh_hosts ORDER BY id ASC",
        )
        .map_err(|e| e.to_string())?;

    let rows = stmt
        .query_map([], |row| {
            Ok(SshHost {
                id: row.get(0)?,
                name: row.get(1)?,
                host: row.get(2)?,
                port: row.get(3)?,
                user: row.get(4)?,
                remote_dir: row.get(5)?,
                key_path: row.get(6)?,
                created_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    rows.collect::<SqliteResult<Vec<_>>>()
        .map_err(|e| e.to_string())
}

/// 新增或更新主机（id 为 None 时新增）
#[tauri::command]
pub fn save_ssh_host(
    state: State<'_, ImageDbState>,
    id: Option<i64>,
    host_input: SshHostInput,
) -> Result<SshHost, String> {
    let name = host_input.name.trim().to_string();
    let host = host_input.host.trim().to_string();
    let user = host_input.user.trim().to_string();
    let remote_dir = host_input.remote_dir.trim().to_string();
    let port = host_input.port.unwrap_or(22);
    let key_path = host_input.key_path.trim().to_string();

    if host.is_empty() {
        return Err("主机地址不能为空".to_string());
    }
    if user.is_empty() {
        return Err("用户名不能为空".to_string());
    }
    if remote_dir.is_empty() {
        return Err("目标路径不能为空".to_string());
    }
    if !(1..=65535).contains(&port) {
        return Err("端口需在 1-65535 之间".to_string());
    }

    // 名称为空时用 user@host 兜底，列表里不至于显示空白
    let name = if name.is_empty() {
        format!("{}@{}", user, host)
    } else {
        name
    };

    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let created_at = chrono::Local::now().to_rfc3339();

    match id {
        Some(existing) => {
            conn.execute(
                "UPDATE ssh_hosts SET name=?, host=?, port=?, user=?, remote_dir=?, key_path=? WHERE id=?",
                params![name, host, port, user, remote_dir, key_path, existing],
            )
            .map_err(|e| e.to_string())?;
            Ok(SshHost {
                id: existing,
                name,
                host,
                port,
                user,
                remote_dir,
                key_path,
                created_at,
            })
        }
        None => {
            conn.execute(
                "INSERT INTO ssh_hosts (name, host, port, user, remote_dir, key_path, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![name, host, port, user, remote_dir, key_path, created_at],
            )
            .map_err(|e| e.to_string())?;
            Ok(SshHost {
                id: conn.last_insert_rowid(),
                name,
                host,
                port,
                user,
                remote_dir,
                key_path,
                created_at,
            })
        }
    }
}

#[tauri::command]
pub fn delete_ssh_host(state: State<'_, ImageDbState>, id: i64) -> Result<bool, String> {
    let conn = state
        .conn
        .lock()
        .map_err(|e| format!("Failed to lock mutex: {}", e))?;

    let n = conn
        .execute("DELETE FROM ssh_hosts WHERE id = ?", params![id])
        .map_err(|e| e.to_string())?;

    Ok(n > 0)
}

// ==================== 命令：传输 ====================

/// Windows 上隐藏子进程控制台窗口
#[cfg(windows)]
fn hidden_command(program: &str) -> std::process::Command {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut c = std::process::Command::new(program);
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

#[cfg(not(windows))]
fn hidden_command(program: &str) -> std::process::Command {
    std::process::Command::new(program)
}

/// 定位 scp 可执行文件：优先系统 OpenSSH，回退 PATH
fn scp_program() -> String {
    let system = r"C:\Windows\System32\OpenSSH\scp.exe";
    if std::path::Path::new(system).exists() {
        return system.to_string();
    }
    "scp".to_string()
}

fn ssh_program() -> String {
    let system = r"C:\Windows\System32\OpenSSH\ssh.exe";
    if std::path::Path::new(system).exists() {
        return system.to_string();
    }
    "ssh".to_string()
}

/// 解析实际要用的私钥路径。
///
/// 用户显式填了就用填的；留空时按候选顺序探测用户目录下的常见密钥。
///
/// 之所以要探测：SSH 留空只会尝试默认密钥名（id_rsa / id_ed25519），
/// 而项目自动化常用的自定义密钥名（如 redwind_auto）不在默认之列，
/// 结果是用户明明配好了免密，却仍报 Permission denied。
fn resolve_key_path(configured: &str) -> Option<String> {
    let trimmed = configured.trim();
    if !trimmed.is_empty() {
        // 填了但不存在时仍然返回，让 SSH 自己报错，错误更贴近用户输入
        return Some(trimmed.to_string());
    }

    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .ok()?;
    let ssh_dir = std::path::Path::new(&home).join(".ssh");

    // 顺序：项目专用密钥优先，其后是常见默认名
    for name in ["redwind_auto", "id_ed25519", "id_rsa"] {
        let p = ssh_dir.join(name);
        if p.is_file() {
            return Some(p.to_string_lossy().to_string());
        }
    }
    None
}

/// 把 SSH 的英文报错翻译成可操作的中文提示。
///
/// 原始报错（Permission denied (publickey,password)）对用户毫无指导意义，
/// 这里补上"下一步该做什么"。
fn humanize_ssh_error(raw: &str, key_used: Option<&str>) -> String {
    let text = raw.trim();
    if text.is_empty() {
        return "连接失败（无错误输出）".to_string();
    }
    // 取最后一行非空内容，SSH 的真正原因通常在末尾
    let last = text
        .lines()
        .filter(|l| !l.trim().is_empty())
        .last()
        .unwrap_or(text)
        .trim()
        .to_string();

    if last.contains("Permission denied") {
        let mut msg = String::from("认证失败：服务器拒绝了当前密钥。");
        match key_used {
            Some(k) => msg.push_str(&format!("本次使用的私钥是 {}。", k)),
            None => msg.push_str("未找到可用私钥。"),
        }
        msg.push_str(
            "请确认该密钥的公钥已加入服务器的 ~/.ssh/authorized_keys；\
             若私钥带密码短语，自动化传输无法输入密码，需要改用免密密钥。",
        );
        return msg;
    }

    if last.contains("No such file or directory") {
        return format!("目标路径不存在，请先在服务器上创建或修改目标路径。原始信息：{}", last);
    }

    if last.contains("Connection timed out") || last.contains("Connection refused") {
        return format!("无法连接到主机（网络不通或被防火墙拦截）。原始信息：{}", last);
    }

    if last.contains("Host key verification failed") {
        return format!("主机密钥校验失败，请清理 known_hosts 中该主机的记录。原始信息：{}", last);
    }

    if last.contains("Load key") || last.contains("invalid format") {
        return format!("私钥无法加载（路径错误或文件不是有效私钥）。原始信息：{}", last);
    }

    format!("连接失败：{}", last)
}

/// 测试与主机的连通性：ssh 执行一次 echo
#[tauri::command]
pub async fn test_ssh_host(host_id: i64, state: State<'_, ImageDbState>) -> Result<serde_json::Value, String> {
    let host = {
        let conn = state
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock mutex: {}", e))?;
        conn.query_row(
            "SELECT id, name, host, port, user, remote_dir, key_path, created_at FROM ssh_hosts WHERE id = ?",
            params![host_id],
            |row| {
                Ok(SshHost {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    host: row.get(2)?,
                    port: row.get(3)?,
                    user: row.get(4)?,
                    remote_dir: row.get(5)?,
                    key_path: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        )
        .map_err(|_| "主机不存在".to_string())?
    };

    let key_used = resolve_key_path(&host.key_path);

    let mut cmd = hidden_command(&ssh_program());
    cmd.arg("-p")
        .arg(host.port.to_string())
        .arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg("ConnectTimeout=8")
        .arg("-o")
        .arg("StrictHostKeyChecking=accept-new");

    if let Some(k) = &key_used {
        cmd.arg("-i").arg(k);
    }

    cmd.arg(format!("{}@{}", host.user, host.host));
    // 顺便确认目标目录存在，避免上传时才发现路径不对
    cmd.arg(format!(
        "echo CONNECT_OK && test -d '{}' && echo DIR_OK || echo DIR_MISSING",
        host.remote_dir.replace('\'', "'\\''")
    ));

    let out = cmd.output().map_err(|e| format!("无法启动 ssh：{}", e))?;
    let stdout = String::from_utf8_lossy(&out.stdout).to_string();
    let stderr = String::from_utf8_lossy(&out.stderr).to_string();

    let connected = stdout.contains("CONNECT_OK");
    let dir_exists = stdout.contains("DIR_OK");

    Ok(serde_json::json!({
        "ok": connected,
        "dirExists": dir_exists,
        "stdout": stdout.trim(),
        "stderr": stderr.trim(),
        // 失败时给出可操作的中文提示，前端优先展示它
        "hint": if connected { String::new() } else { humanize_ssh_error(&stderr, key_used.as_deref()) },
        "keyUsed": key_used.unwrap_or_default(),
        "target": format!("{}@{}:{}", host.user, host.host, host.remote_dir),
    }))
}

/// 把选中的图片传到主机目标目录。
///
/// 逐个文件调用 scp：一次失败不影响其余文件，且能精确回报是哪个文件失败。
#[tauri::command]
pub async fn transfer_images(
    host_id: i64,
    ids: Vec<i64>,
    state: State<'_, ImageDbState>,
) -> Result<TransferResult, String> {
    if ids.is_empty() {
        return Err("请先选择要传输的图片".to_string());
    }

    let host = {
        let conn = state
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock mutex: {}", e))?;
        conn.query_row(
            "SELECT id, name, host, port, user, remote_dir, key_path, created_at FROM ssh_hosts WHERE id = ?",
            params![host_id],
            |row| {
                Ok(SshHost {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    host: row.get(2)?,
                    port: row.get(3)?,
                    user: row.get(4)?,
                    remote_dir: row.get(5)?,
                    key_path: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        )
        .map_err(|_| "主机不存在".to_string())?
    };

    // 取出待传文件的 (id, 路径, 文件名)
    let files: Vec<(i64, String, String)> = {
        let conn = state
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock mutex: {}", e))?;
        let mut stmt = conn
            .prepare("SELECT id, path, file_name FROM images WHERE id = ?")
            .map_err(|e| e.to_string())?;
        let mut out = Vec::new();
        for id in &ids {
            if let Ok(row) = stmt.query_row(params![id], |r| {
                Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?, r.get::<_, String>(2)?))
            }) {
                out.push(row);
            }
        }
        out
    };

    if files.is_empty() {
        return Err("选中的图片在库中已不存在".to_string());
    }

    let target_desc = format!("{}@{}:{}", host.user, host.host, host.remote_dir);
    let remote_prefix = format!("{}@{}", host.user, host.host);
    let key_used = resolve_key_path(&host.key_path);

    let mut sent = 0usize;
    let mut errors = Vec::new();
    let mut sent_ids = Vec::new();

    for (id, path, file_name) in files {
        if !std::path::Path::new(&path).exists() {
            errors.push(format!("{}：本地文件不存在", file_name));
            continue;
        }

        let mut cmd = hidden_command(&scp_program());
        cmd.arg("-P")
            .arg(host.port.to_string())
            .arg("-o")
            .arg("BatchMode=yes")
            .arg("-o")
            .arg("ConnectTimeout=10")
            .arg("-o")
            .arg("StrictHostKeyChecking=accept-new");

        if let Some(k) = &key_used {
            cmd.arg("-i").arg(k);
        }

        cmd.arg(&path);
        cmd.arg(format!("{}:{}", remote_prefix, host.remote_dir));

        match cmd.output() {
            Ok(out) if out.status.success() => {
                sent += 1;
                sent_ids.push(id);
            }
            Ok(out) => {
                let err = String::from_utf8_lossy(&out.stderr);
                // 同一个认证问题会在每张图上重复，翻译一次即可读
                errors.push(format!("{}：{}", file_name, humanize_ssh_error(&err, key_used.as_deref())));
            }
            Err(e) => {
                errors.push(format!("{}：无法启动 scp（{}）", file_name, e));
            }
        }
    }

    // 传输成功的标记为已上传
    if !sent_ids.is_empty() {
        let conn = state
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock mutex: {}", e))?;
        for id in &sent_ids {
            let _ = conn.execute(
                "UPDATE images SET uploaded = 1, uploaded_to = ? WHERE id = ?",
                params![target_desc, id],
            );
        }
    }

    let failed = errors.len();
    Ok(TransferResult {
        ok: failed == 0,
        sent,
        failed,
        errors,
        target: target_desc,
    })
}

/// 确保远端目录存在（传输前调用，避免 scp 因目录缺失失败）
#[tauri::command]
pub async fn ensure_remote_dir(
    host_id: i64,
    state: State<'_, ImageDbState>,
) -> Result<bool, String> {
    let host = {
        let conn = state
            .conn
            .lock()
            .map_err(|e| format!("Failed to lock mutex: {}", e))?;
        conn.query_row(
            "SELECT id, name, host, port, user, remote_dir, key_path, created_at FROM ssh_hosts WHERE id = ?",
            params![host_id],
            |row| {
                Ok(SshHost {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    host: row.get(2)?,
                    port: row.get(3)?,
                    user: row.get(4)?,
                    remote_dir: row.get(5)?,
                    key_path: row.get(6)?,
                    created_at: row.get(7)?,
                })
            },
        )
        .map_err(|_| "主机不存在".to_string())?
    };

    let key_used = resolve_key_path(&host.key_path);

    let mut cmd = hidden_command(&ssh_program());
    cmd.arg("-p")
        .arg(host.port.to_string())
        .arg("-o")
        .arg("BatchMode=yes")
        .arg("-o")
        .arg("ConnectTimeout=8")
        .arg("-o")
        .arg("StrictHostKeyChecking=accept-new");

    if let Some(k) = &key_used {
        cmd.arg("-i").arg(k);
    }

    cmd.arg(format!("{}@{}", host.user, host.host));
    cmd.arg(format!(
        "mkdir -p '{}'",
        host.remote_dir.replace('\'', "'\\''")
    ));

    let out = cmd.output().map_err(|e| format!("无法启动 ssh：{}", e))?;
    if out.status.success() {
        Ok(true)
    } else {
        let err = String::from_utf8_lossy(&out.stderr);
        Err(format!(
            "创建远端目录失败：{}",
            humanize_ssh_error(&err, key_used.as_deref())
        ))
    }
}
