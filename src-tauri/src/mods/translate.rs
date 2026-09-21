// src-tauri/src/mods/translate.rs
// 百度翻译调用封装（签名方式参照桌面的 baidu-trans 项目）
//
// 签名规则：sign = md5(appid + q + salt + key)
// 接口：https://api.fanyi.baidu.com/api/trans/vip/translate
// 语言：from = auto，目标语言按源文本自动判定（含中文 -> en，否则 -> zh）

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

const API_URL: &str = "https://api.fanyi.baidu.com/api/trans/vip/translate";

#[derive(Debug, Deserialize)]
struct TransResult {
    dst: String,
}

#[derive(Debug, Deserialize)]
struct TransResponse {
    #[serde(rename = "trans_result")]
    #[serde(default)]
    results: Vec<TransResult>,
    #[serde(rename = "error_code")]
    error_code: Option<String>,
    #[serde(rename = "error_msg")]
    error_msg: Option<String>,
}

// 返回给前端的翻译结果
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TranslationResult {
    /// 原文（已按接口要求分片后合并的原文）
    pub source: String,
    /// 译文（分片结果按行合并）
    pub target: String,
    /// 实际使用的目标语言
    pub to_lang: String,
}

fn md5_hex(s: &str) -> String {
    format!("{:x}", md5::compute(s.as_bytes()))
}

/// 从若干候选 .env 文件中读取键值；找不到时回落到进程环境变量。
fn read_env_value(key: &str) -> Option<String> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    // 1) 可执行文件所在目录（打包后 data 目录的上一级）
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.push(dir.join(".env"));
        }
    }
    // 2) 当前工作目录（dev 模式 / tauri dev）
    candidates.push(Path::new(".env").to_path_buf());
    candidates.push(Path::new("src-tauri").join(".env"));
    // 3) 源码树根目录（编译期路径，dev 模式兜底）
    candidates.push(Path::new(env!("CARGO_MANIFEST_DIR")).join(".env"));
    candidates.push(
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .unwrap_or_else(|| Path::new("."))
            .join(".env"),
    );

    for path in candidates {
        let Ok(text) = std::fs::read_to_string(&path) else {
            continue;
        };
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            let Some((k, v)) = line.split_once('=') else {
                continue;
            };
            if k.trim() != key {
                continue;
            }
            let value = v.trim().trim_matches('"').trim_matches('\'').to_string();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }

    // 4) 进程环境变量
    std::env::var(key).ok().filter(|v| !v.trim().is_empty())
}

/// 百度翻译单次请求的 q 长度限制约 6000 字节，按字符安全切分。
/// 优先在换行 / 句末标点 / 空格处断开，避免把词切碎。
fn split_chunks(text: &str, max_chars: usize) -> Vec<String> {
    let mut chunks: Vec<String> = Vec::new();
    let mut current = String::new();

    for ch in text.chars() {
        current.push(ch);
        if current.chars().count() >= max_chars {
            // 尝试回退到最近的断点
            let break_at = current
                .char_indices()
                .rev()
                .find(|(_, c)| matches!(c, '\n' | '。' | '！' | '？' | '.' | '!' | '?' | ';' | '；'))
                .map(|(i, c)| i + c.len_utf8());

            match break_at {
                Some(idx) if idx > 0 && idx < current.len() => {
                    let rest = current.split_off(idx);
                    chunks.push(std::mem::take(&mut current));
                    current = rest;
                }
                _ => chunks.push(std::mem::take(&mut current)),
            }
        }
    }

    if !current.trim().is_empty() {
        chunks.push(current);
    }
    chunks
}

/// 是否包含 CJK 字符（用于判定目标语言）
fn has_cjk(text: &str) -> bool {
    text.chars().any(|c| {
        let u = c as u32;
        (0x4E00..=0x9FFF).contains(&u)      // 基本汉字
            || (0x3400..=0x4DBF).contains(&u) // 扩展 A
            || (0x3000..=0x303F).contains(&u) // CJK 标点
    })
}

/// 调用百度翻译。voice 参数保留给后续语音播报扩展，当前不发声。
#[tauri::command]
pub async fn translate_text(
    text: String,
    from: Option<String>,
    to: Option<String>,
) -> Result<TranslationResult, String> {
    let query = text.trim();
    if query.is_empty() {
        return Err("待翻译文本为空".to_string());
    }

    let appid = read_env_value("BAIDU_TRANS_APPID")
        .or_else(|| read_env_value("BAIDU_APPID"))
        .ok_or_else(|| "未配置百度翻译 appid，请在 .env 中设置 BAIDU_TRANS_APPID".to_string())?;
    let key = read_env_value("BAIDU_TRANS_KEY")
        .or_else(|| read_env_value("BAIDU_KEY"))
        .ok_or_else(|| "未配置百度翻译密钥，请在 .env 中设置 BAIDU_TRANS_KEY".to_string())?;

    let from_lang = from.unwrap_or_else(|| "auto".to_string());
    let to_lang = to.unwrap_or_else(|| {
        if has_cjk(query) {
            "en".to_string()
        } else {
            "zh".to_string()
        }
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    let chunks = split_chunks(query, 1800);
    let mut targets: Vec<String> = Vec::new();

    for chunk in &chunks {
        let trimmed = chunk.trim();
        if trimmed.is_empty() {
            continue;
        }

        let salt = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
            .to_string();
        let sign = md5_hex(&format!("{}{}{}{}", appid, trimmed, salt, key));

        let resp = client
            .get(API_URL)
            .query(&[
                ("q", trimmed),
                ("from", from_lang.as_str()),
                ("to", to_lang.as_str()),
                ("appid", appid.as_str()),
                ("salt", salt.as_str()),
                ("sign", sign.as_str()),
            ])
            .send()
            .await
            .map_err(|e| format!("翻译请求失败: {}", e))?;

        let status = resp.status();
        let body = resp
            .text()
            .await
            .map_err(|e| format!("读取响应失败: {}", e))?;

        if !status.is_success() {
            return Err(format!("翻译接口 HTTP {}: {}", status.as_u16(), body));
        }

        let json: TransResponse =
            serde_json::from_str(&body).map_err(|e| format!("解析响应失败: {} / {}", e, body))?;

        if let Some(code) = json.error_code {
            return Err(format!(
                "翻译接口返回错误 {}: {}",
                code,
                json.error_msg.unwrap_or_default()
            ));
        }

        for item in &json.results {
            targets.push(item.dst.clone());
        }
    }

    if targets.is_empty() {
        return Err("翻译接口未返回结果".to_string());
    }

    Ok(TranslationResult {
        source: query.to_string(),
        target: targets.join("\n"),
        to_lang,
    })
}

/// 查询密钥配置状态，便于前端展示提示
#[tauri::command]
pub async fn translate_config_status() -> Result<bool, String> {
    let ok = read_env_value("BAIDU_TRANS_APPID").is_some()
        && read_env_value("BAIDU_TRANS_KEY").is_some();
    Ok(ok)
}
