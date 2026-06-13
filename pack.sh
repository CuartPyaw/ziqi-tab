#!/usr/bin/env bash
# Ziqi Tab – Chrome 扩展打包脚本
# 产出 dist/ziqi-tab-{version}.crx + dist/key.pem（签名密钥）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$SCRIPT_DIR/dist"
KEY_FILE="$DIST_DIR/key.pem"

# ── 读取版本号 ──
VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' "$SCRIPT_DIR/manifest.json" | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
VERSION="${VERSION:-0.0.0}"
OUTPUT_NAME="ziqi-tab-${VERSION}.crx"

# ── 探测 Chrome / Edge ──
detect_chrome() {
  if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows (Git Bash)
    for p in \
      "/c/Program Files/Google/Chrome/Application/chrome.exe" \
      "/c/Program Files (x86)/Google/Chrome/Application/chrome.exe" \
      "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
      "/c/Program Files/Microsoft/Edge/Application/msedge.exe"; do
      [[ -f "$p" ]] && { echo "$p"; return; }
    done
  elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    for p in \
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
      [[ -f "$p" ]] && { echo "$p"; return; }
    done
  else
    # Linux
    for cmd in google-chrome google-chrome-stable chromium chromium-browser microsoft-edge; do
      command -v "$cmd" &>/dev/null && { echo "$cmd"; return; }
    done
  fi
  echo ""
}

CHROME=$(detect_chrome)
if [[ -z "$CHROME" ]]; then
  echo "❌ 未找到 Chrome 或 Edge。请安装后重试，或手动指定："
  echo "   CHROME=/path/to/browser bash pack.sh"
  exit 1
fi
echo "🔍 使用浏览器: $CHROME"

# ── 创建临时目录（仅含运行时文件） ──
WORK_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'ziqi-pack')
# shellcheck disable=SC2064
trap "rm -rf '$WORK_DIR'" EXIT

echo "📦 准备打包文件..."
cp "$SCRIPT_DIR/manifest.json" "$WORK_DIR/"
cp "$SCRIPT_DIR/newtab.html"  "$WORK_DIR/"
cp -r "$SCRIPT_DIR/css"       "$WORK_DIR/"
cp -r "$SCRIPT_DIR/js"        "$WORK_DIR/"
cp -r "$SCRIPT_DIR/icons"     "$WORK_DIR/"

# ── 密钥处理 ──
KEY_ARG=()
if [[ -f "$KEY_FILE" ]]; then
  cp "$KEY_FILE" "${WORK_DIR}.pem"
  KEY_ARG=(--pack-extension-key="${WORK_DIR}.pem")
  echo "🔑 使用现有密钥: dist/key.pem"
else
  echo "🔑 首次打包，Chrome 将自动生成密钥"
fi

mkdir -p "$DIST_DIR"

# ── 调用 Chrome 打包 ──
echo "🔨 正在打包..."
"$CHROME" --pack-extension="$WORK_DIR" "${KEY_ARG[@]}" 2>&1 || true

# Chrome 将 .crx / .pem 输出到临时目录的父级
CRX_FILE="${WORK_DIR}.crx"
GENERATED_KEY="${WORK_DIR}.pem"

if [[ ! -f "$CRX_FILE" ]]; then
  echo "❌ 打包失败：Chrome 未生成 .crx 文件"
  exit 1
fi

mv "$CRX_FILE" "$DIST_DIR/$OUTPUT_NAME"
echo "✅ 打包完成: dist/$OUTPUT_NAME"

# 新生成的密钥挪到 dist/ 长期保存
if [[ ! -f "$KEY_FILE" ]] && [[ -f "$GENERATED_KEY" ]]; then
  mv "$GENERATED_KEY" "$KEY_FILE"
  echo "🔑 密钥已保存: dist/key.pem（⚠️ 请勿提交到 Git，丢失后无法更新扩展）"
fi

echo ""
echo "📋 dist/ 产物:"
ls -lh "$DIST_DIR"
