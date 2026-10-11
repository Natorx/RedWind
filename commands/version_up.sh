#!/usr/bin/env bash
#
# RedWind 版本升级工具
#
# 用法:
#   bash commands/version_up.sh                 # patch +1        (0.6.1 -> 0.6.2)
#   bash commands/version_up.sh patch|minor|major
#   bash commands/version_up.sh 1.2.3           # 指定具体版本号
#   bash commands/version_up.sh --dry-run minor # 只预览不写入
#   bash commands/version_up.sh --no-commit patch
#
# 同步目标:
#   package.json              -> .version
#   src-tauri/tauri.conf.json -> .version
#   src-tauri/Cargo.toml      -> [package] 段下的 version
#
# 依赖: python(x.y.z 版本号重写) 或 jq(兜底)。二者至少其一。
#
set -euo pipefail

# ---------- 常量 ----------
readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
readonly PKG_JSON="$ROOT_DIR/package.json"
readonly TAURI_CONF="$ROOT_DIR/src-tauri/tauri.conf.json"
readonly CARGO_TOML="$ROOT_DIR/src-tauri/Cargo.toml"

# ---------- 颜色 (非 TTY 时自动禁用) ----------
if [ -t 1 ]; then
  C_RED=$'\033[0;31m'; C_GREEN=$'\033[0;32m'
  C_YELLOW=$'\033[0;33m'; C_DIM=$'\033[2m'; C_OFF=$'\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_DIM=''; C_OFF=''
fi
info() { printf '%s\n' "$*"; }
warn() { printf '%s\n' "${C_YELLOW}$*${C_OFF}" >&2; }
die()  { printf '%s\n' "${C_RED}$*${C_OFF}" >&2; exit 1; }

# ---------- 后端探测: 优先 python, 回退 jq ----------
PY_CMD=""
for c in python3 python py; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'pass' >/dev/null 2>&1; then
    PY_CMD="$c"; break
  fi
done
if [ -z "$PY_CMD" ] && command -v jq >/dev/null 2>&1; then
  PY_CMD=""
else
  [ -n "$PY_CMD" ] || die "❌ 需要 python 或 jq 之一，但均未找到。请安装 Python 3 或 jq。"
fi

# 读取 JSON 的 .version
json_get_version() {
  if [ -n "$PY_CMD" ]; then
    "$PY_CMD" -c '
import json,sys
try:
    with open(sys.argv[1], encoding="utf-8") as f:
        d = json.load(f)
except Exception as e:
    sys.stderr.write("JSON 解析失败: %s\n" % e); sys.exit(1)
v = d.get("version")
if not isinstance(v, str) or not v:
    sys.exit(1)
print(v)
' "$1"
  else
    jq -r '.version // empty' "$1"
  fi
}

# 原子写入 JSON 的 .version (同目录临时文件 + mv)
json_set_version() {
  local file="$1" tmp
  tmp="$(mktemp "${file}.XXXXXX")" || return 1
  if [ -n "$PY_CMD" ]; then
    if ! "$PY_CMD" -c '
import json,sys
path, nv = sys.argv[1], sys.argv[2]
with open(path, encoding="utf-8") as f:
    d = json.load(f)
d["version"] = nv
with open(sys.argv[3], "w", encoding="utf-8") as f:
    json.dump(d, f, indent=2, ensure_ascii=False)
    f.write("\n")
' "$file" "$NEW_VERSION" "$tmp"; then
      rm -f -- "$tmp"; return 1
    fi
  else
    if ! jq --arg v "$NEW_VERSION" '.version = $v' "$file" >"$tmp"; then
      rm -f -- "$tmp"; return 1
    fi
  fi
  mv -f -- "$tmp" "$file" || { rm -f -- "$tmp"; return 1; }
}

# 读取 Cargo.toml [package] 段的 version
cargo_get_version() {
  awk '
    /^\[/ { sect = $0 }
    sect == "[package]" && /^[[:space:]]*version[[:space:]]*=/ {
      if (match($0, /"[^"]*"/)) {
        print substr($0, RSTART + 1, RLENGTH - 2); exit
      }
    }
  ' "$1"
}

# 原子写入 Cargo.toml [package] 段的 version (只改第一个匹配)
cargo_set_version() {
  local file="$1" tmp
  tmp="$(mktemp "${file}.XXXXXX")" || return 1
  if ! awk -v nv="$NEW_VERSION" '
    /^\[/ { sect = $0 }
    !done && sect == "[package]" && /^[[:space:]]*version[[:space:]]*=/ {
      if (match($0, /"[^"]*"/)) {
        printf "%s\"%s\"%s\n", substr($0, 1, RSTART - 1), nv, substr($0, RSTART + RLENGTH)
        done = 1; next
      }
    }
    { print }
    END { if (!done) exit 3 }
  ' "$file" >"$tmp"; then
    rm -f -- "$tmp"; return 1
  fi
  mv -f -- "$tmp" "$file" || { rm -f -- "$tmp"; return 1; }
}

# ---------- 参数解析 ----------
DRY_RUN=0
DO_COMMIT=1
BUMP=""

for arg in "$@"; do
  case "$arg" in
    -n|--dry-run) DRY_RUN=1 ;;
    --no-commit)  DO_COMMIT=0 ;;
    -h|--help)    sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "❌ 未知选项: $arg (使用 --help 查看用法)" ;;
    *)
      [ -n "$BUMP" ] && die "❌ 重复的版本参数: '$BUMP' 与 '$arg'"
      BUMP="$arg"
      ;;
  esac
done
BUMP="${BUMP:-patch}"

# ---------- 前置校验 ----------
for f in "$PKG_JSON" "$TAURI_CONF" "$CARGO_TOML"; do
  [ -f "$f" ] || die "❌ 找不到配置文件: $f"
done

# ---------- 读取当前版本 ----------
V_PKG="$(json_get_version "$PKG_JSON")"   || die "❌ 无法从 package.json 读取 version"
V_TAURI="$(json_get_version "$TAURI_CONF")" || die "❌ 无法从 tauri.conf.json 读取 version"
V_CARGO="$(cargo_get_version "$CARGO_TOML")" || true

[ -n "$V_PKG" ]   || die "❌ package.json 中 version 为空"
[ -n "$V_TAURI" ] || die "❌ tauri.conf.json 中 version 为空"
[ -n "$V_CARGO" ] || die "❌ Cargo.toml 的 [package] 段未找到 version"

readonly VER_RE='^[0-9]+\.[0-9]+\.[0-9]+$'
for pair in "package.json:$V_PKG" "tauri.conf.json:$V_TAURI" "Cargo.toml:$V_CARGO"; do
  name="${pair%%:*}"; ver="${pair#*:}"
  [[ "$ver" =~ $VER_RE ]] || die "❌ $name 中的版本号格式不合法: '$ver' (期望 x.y.z)"
done

# ---------- 计算新版本 ----------
if [[ "$BUMP" =~ $VER_RE ]]; then
  NEW_VERSION="$BUMP"
else
  case "$BUMP" in
    patch|minor|major)
      IFS='.' read -r MA MI PA <<<"$V_PKG"
      case "$BUMP" in
        patch) PA=$((PA + 1)) ;;
        minor) MI=$((MI + 1)); PA=0 ;;
        major) MA=$((MA + 1)); MI=0; PA=0 ;;
      esac
      NEW_VERSION="$MA.$MI.$PA"
      ;;
    *) die "❌ 无效的版本参数: '$BUMP' (可用: patch | minor | major | x.y.z)" ;;
  esac
fi

# ---------- 一致性检查 ----------
if [ "$V_PKG" != "$V_TAURI" ] || [ "$V_PKG" != "$V_CARGO" ]; then
  warn "⚠️  三个配置文件当前版本不一致:"
  warn "    package.json      : $V_PKG"
  warn "    tauri.conf.json   : $V_TAURI"
  warn "    Cargo.toml        : $V_CARGO"
  warn "    将以 package.json 为基准升级到 $NEW_VERSION"
fi

# ---------- 展示计划 ----------
echo "========================================"
echo " RedWind 版本升级"
echo "========================================"
info "当前版本 (package.json) : $V_PKG"
info "升级方式               : $BUMP"
info "目标版本               : ${C_GREEN}$NEW_VERSION${C_OFF}"
echo "----------------------------------------"
info "待修改文件:"
info "  ${C_DIM}package.json${C_OFF}              $V_PKG -> $NEW_VERSION"
info "  ${C_DIM}src-tauri/tauri.conf.json${C_OFF}  $V_TAURI -> $NEW_VERSION"
info "  ${C_DIM}src-tauri/Cargo.toml${C_OFF}      $V_CARGO -> $NEW_VERSION"
echo "----------------------------------------"

if [ "$NEW_VERSION" = "$V_PKG" ] && [ "$NEW_VERSION" = "$V_TAURI" ] && [ "$NEW_VERSION" = "$V_CARGO" ]; then
  info "ℹ️  版本号未发生变化，无需修改。"
  exit 0
fi

if [ "$DRY_RUN" -eq 1 ]; then
  info "${C_YELLOW}[dry-run] 未写入任何文件。${C_OFF}"
  exit 0
fi

# ---------- 备份 + 失败回滚 ----------
TMPDIR_UP="$(mktemp -d)"
cleanup() { rm -rf -- "$TMPDIR_UP"; }
rollback() {
  warn "↩️  升级失败，正在回滚..."
  cp -- "$TMPDIR_UP/package.json"    "$PKG_JSON"   2>/dev/null || true
  cp -- "$TMPDIR_UP/tauri.conf.json" "$TAURI_CONF" 2>/dev/null || true
  cp -- "$TMPDIR_UP/Cargo.toml"      "$CARGO_TOML" 2>/dev/null || true
  warn "已恢复原文件。"
}
cp -- "$PKG_JSON"   "$TMPDIR_UP/package.json"
cp -- "$TAURI_CONF" "$TMPDIR_UP/tauri.conf.json"
cp -- "$CARGO_TOML" "$TMPDIR_UP/Cargo.toml"
trap cleanup EXIT
trap 'rollback; exit 1' ERR

# ---------- 写入 ----------
echo ""
info "🔧 正在写入..."
json_set_version  "$PKG_JSON"
json_set_version  "$TAURI_CONF"
cargo_set_version "$CARGO_TOML"

# ---------- 回读校验 ----------
R_PKG="$(json_get_version "$PKG_JSON")"     || die "❌ 回读 package.json 失败"
R_TAURI="$(json_get_version "$TAURI_CONF")" || die "❌ 回读 tauri.conf.json 失败"
R_CARGO="$(cargo_get_version "$CARGO_TOML")" || true

[ "$R_PKG"   = "$NEW_VERSION" ] || die "❌ 校验失败: package.json 实际为 '$R_PKG'"
[ "$R_TAURI" = "$NEW_VERSION" ] || die "❌ 校验失败: tauri.conf.json 实际为 '$R_TAURI'"
[ "$R_CARGO" = "$NEW_VERSION" ] || die "❌ 校验失败: Cargo.toml 实际为 '$R_CARGO'"

trap - ERR   # 校验通过, 解除回滚

echo ""
info "${C_GREEN}✅ 升级完成! ${V_PKG} -> ${NEW_VERSION}${C_OFF}"
info "   package.json        $R_PKG"
info "   tauri.conf.json     $R_TAURI"
info "   Cargo.toml          $R_CARGO"

# ---------- 可选 git 提交 ----------
if [ "$DO_COMMIT" -eq 1 ] \
   && command -v git >/dev/null 2>&1 \
   && git -C "$ROOT_DIR" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo ""
  info "改动概要:"
  git -C "$ROOT_DIR" --no-pager diff --stat -- \
      package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml || true
  echo ""
  if [ -t 0 ]; then
    read -r -p "是否提交以上改动? [y/N] " ans || ans=""
  else
    ans=""
  fi
  case "$ans" in
    [yY]|[yY][eE][sS])
      git -C "$ROOT_DIR" add -- package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
      if git -C "$ROOT_DIR" commit -m "chore(release): bump version to $NEW_VERSION"; then
        info "${C_GREEN}✅ 已提交${C_OFF}"
      else
        warn "⚠️  git 提交失败（可能缺少 user.name/user.email 或被 hook 拦截）"
      fi
      ;;
    *) info "已跳过提交（改动保留在工作区）" ;;
  esac
fi

# 仅在交互式终端中等待按键
if [ -t 0 ]; then
  echo ""
  read -r -p "按回车键退出..." _ || true
fi
