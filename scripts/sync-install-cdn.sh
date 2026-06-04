#!/usr/bin/env bash
# 将 dist/ 安装包同步到 fabric-api 容器挂载目录（nginx 从 /install.sh 提供）
#
# 用法:
#   FABRIC_INSTALL_BASE=http://172.81.57.29:18081 \
#   ./scripts/publish-release.sh 1.0.0 --bundle-only
#   ./scripts/sync-install-cdn.sh
#
# 环境变量:
#   INSTALL_CDN_SSH     SSH 目标，默认 root@172.81.57.29
#   INSTALL_CDN_DIR     宿主机目录（映射到容器 /app/install-www），默认 /opt/fabric-api/install-www
#   INSTALL_CDN_PORT    API/安装共用对外端口，默认 18081
#   FABRIC_INSTALL_BASE 写入 manifest 的根 URL，默认同上
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_CDN_SSH="${INSTALL_CDN_SSH:-root@172.81.57.29}"
INSTALL_CDN_DIR="${INSTALL_CDN_DIR:-/opt/fabric-api/install-www}"
INSTALL_CDN_PORT="${INSTALL_CDN_PORT:-18081}"
FABRIC_INSTALL_BASE="${FABRIC_INSTALL_BASE:-}"

if [[ ! -f "$ROOT/dist/install.sh" ]]; then
  echo "[sync] 缺少 dist/install.sh，请先运行: ./scripts/publish-release.sh <version> --bundle-only" >&2
  exit 1
fi

if [[ ! -d "$ROOT/dist/releases/latest" ]]; then
  echo "[sync] 缺少 dist/releases/latest，请先 publish-release" >&2
  exit 1
fi

HOST="${INSTALL_CDN_SSH#*@}"
if [[ -z "$FABRIC_INSTALL_BASE" ]]; then
  FABRIC_INSTALL_BASE="http://${HOST}:${INSTALL_CDN_PORT}"
fi

echo "[sync] 目标: ${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR} (容器内 /app/install-www)"
ssh "$INSTALL_CDN_SSH" "mkdir -p '${INSTALL_CDN_DIR}/releases'"

rsync -avz \
  "$ROOT/dist/install.sh" \
  "${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR}/install.sh"

rsync -avz \
  "$ROOT/dist/releases/" \
  "${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR}/releases/"

echo ""
echo "[sync] 完成。验证:"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/healthz"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/releases/latest/manifest.json | head"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | head -3"
echo ""
echo "官方安装命令（发给用户，在用户自己的机器执行）:"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash -s -- --port 8088 -y"
