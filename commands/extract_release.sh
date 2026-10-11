#!/bin/bash
#
# 从 Tauri 构建产物中提取安装包到项目的 release/ 目录
#
# 用法:
#   bash commands/extract_release.sh            # 提取最新版本
#   bash commands/extract_release.sh 0.6.3      # 只提取指定版本
#   bash commands/extract_release.sh --all      # 提取 bundle 下全部版本
#   bash commands/extract_release.sh --list     # 仅列出可提取的文件
#
# 说明:
#   源目录  src-tauri/target/release/bundle/nsis
#   目标目录 <项目根>/release
#
#   同名文件默认跳过（安装包体积大，避免每次都重写）；
#   加 --force 覆盖。
#
set -euo pipefail

export LANG=zh_CN.UTF-8

# ---------- 路径（基于脚本位置解析，不依赖当前工作目录）----------
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/src-tauri/target/release/bundle/nsis"
DEST_DIR="$ROOT_DIR/release"

# ---------- 颜色（非 TTY 自动禁用）----------
if [ -t 1 ]; then
  RED=$'\033[0;31m'; GREEN=$'\033[0;32m'
  YELLOW=$'\033[0;33m'; DIM=$'\033[2m'; NC=$'\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; DIM=''; NC=''
fi
info() { printf '%s\n' "$*"; }
ok()   { printf '%s\n' "${GREEN}$*${NC}"; }
warn() { printf '%s\n' "${YELLOW}$*${NC}" >&2; }
die()  { printf '%s\n' "${RED}$*${NC}" >&2; exit 1; }

# ---------- 参数解析 ----------
MODE="latest"      # latest | all | list
WANT_VERSION=""
FORCE=0

for arg in "$@"; do
  case "$arg" in
    --all)    MODE="all" ;;
    --list)   MODE="list" ;;
    --force)  FORCE=1 ;;
    -h|--help) sed -n '2,18p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*) die "❌ 未知选项: $arg (使用 --help 查看用法)" ;;
    *)
      [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "❌ 版本号格式不合法: '$arg' (期望 x.y.z)"
      WANT_VERSION="$arg"; MODE="version"
      ;;
  esac
done

# ---------- 校验源目录 ----------
[ -d "$SOURCE_DIR" ] || die "❌ 找不到构建产物目录:
   $SOURCE_DIR
   请先执行 npm run dc 或 npx tauri build 生成安装包。"

shopt -s nullglob
ALL_FILES=("$SOURCE_DIR"/*.exe)
shopt -u nullglob
[ ${#ALL_FILES[@]} -gt 0 ] || die "❌ 源目录中没有 .exe 安装包: $SOURCE_DIR"

# ---------- --list ----------
if [ "$MODE" = "list" ]; then
  info "可提取的安装包（$SOURCE_DIR）:"
  for f in "${ALL_FILES[@]}"; do
    # 体积转 MB，保留两位
    size_mb=$(awk -v b="$(stat -c %s "$f" 2>/dev/null || echo 0)" 'BEGIN{printf "%.2f", b/1048576}')
    printf '  %s  %s%s MB%s\n' "$(basename "$f")" "$DIM" "$size_mb" "$NC"
  done
  exit 0
fi

# ---------- 选择要提取的文件 ----------
SELECTED=()
extract_ver() {  # 从 "Red Wind_0.6.3_x64-setup.exe" 取出 0.6.3
  sed -n 's/.*_\([0-9]\+\.[0-9]\+\.[0-9]\+\)_x64-setup\.exe$/\1/p' <<<"$(basename "$1")"
}

case "$MODE" in
  version)
    for f in "${ALL_FILES[@]}"; do
      [ "$(extract_ver "$f")" = "$WANT_VERSION" ] && SELECTED+=("$f")
    done
    [ ${#SELECTED[@]} -gt 0 ] || die "❌ 未找到版本 $WANT_VERSION 的安装包。
   可用版本: $(for f in "${ALL_FILES[@]}"; do extract_ver "$f"; done | sort -u | tr '\n' ' ')"
    ;;
  all)
    SELECTED=("${ALL_FILES[@]}")
    ;;
  latest)
    # 按版本号排序取最大（不依赖文件时间，避免拷贝后时间被改）
    latest_ver=""
    for f in "${ALL_FILES[@]}"; do
      v="$(extract_ver "$f")"
      [ -n "$v" ] || continue
      if [ -z "$latest_ver" ] || [ "$(printf '%s\n%s\n' "$latest_ver" "$v" | sort -V | tail -1)" = "$v" ]; then
        latest_ver="$v"
      fi
    done
    [ -n "$latest_ver" ] || die "❌ 无法从文件名解析出版本号"
    for f in "${ALL_FILES[@]}"; do
      [ "$(extract_ver "$f")" = "$latest_ver" ] && SELECTED+=("$f")
    done
    info "最新版本: ${GREEN}$latest_ver${NC}"
    ;;
esac

# ---------- 复制 ----------
mkdir -p "$DEST_DIR"
info "源目录: $SOURCE_DIR"
info "目标  : $DEST_DIR"
echo "----------------------------------------"

copied=0; skipped=0
for f in "${SELECTED[@]}"; do
  name="$(basename "$f")"
  dest="$DEST_DIR/$name"
  if [ -f "$dest" ] && [ "$FORCE" -eq 0 ]; then
    # 内容一致则跳过；不一致则提示用 --force
    if cmp -s "$f" "$dest"; then
      info "  ${DIM}跳过（已存在且一致）${NC}  $name"; skipped=$((skipped+1))
    else
      warn "  ⚠️  已存在但内容不同，跳过: $name"
      warn "      如需覆盖请加 --force"
      skipped=$((skipped+1))
    fi
    continue
  fi
  cp -f -- "$f" "$dest"
  size_mb=$(awk -v b="$(stat -c %s "$dest" 2>/dev/null || echo 0)" 'BEGIN{printf "%.2f", b/1048576}')
  ok   "  ✅ 已提取  $name  (${size_mb} MB)"
  copied=$((copied+1))
done

echo "----------------------------------------"
ok "完成：新增 $copied 个，跳过 $skipped 个。"
info "release 目录现有安装包:"
for f in "$DEST_DIR"/*.exe; do
  [ -f "$f" ] || continue
  size_mb=$(awk -v b="$(stat -c %s "$f" 2>/dev/null || echo 0)" 'BEGIN{printf "%.2f", b/1048576}')
  printf '  %s%s%s  %s MB\n' "$DIM" "$(basename "$f")" "$NC" "$size_mb"
done
