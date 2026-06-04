#!/usr/bin/env bash
# 将 dist/ 安装包同步到发布服务器（供官方 curl | bash 使用）
#
# 用法:
#   ./scripts/publish-release.sh 1.0.0 --bundle-only   # 或 CI 已构建镜像
#   INSTALL_CDN_SSH=root@172.81.57.29 ./scripts/sync-install-cdn.sh
#
# 环境变量:
#   INSTALL_CDN_SSH   SSH 目标，默认 root@172.81.57.29
#   INSTALL_CDN_DIR   远端目录，默认 /opt/fabric-cdn/www
#   INSTALL_CDN_PORT  仅用于打印安装命令里的端口提示（默认 18090）
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSTALL_CDN_SSH="${INSTALL_CDN_SSH:-root@172.81.57.29}"
INSTALL_CDN_DIR="${INSTALL_CDN_DIR:-/opt/fabric-cdn/www}"
INSTALL_CDN_PORT="${INSTALL_CDN_PORT:-18090}"
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

echo "[sync] 目标: ${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR}"
ssh "$INSTALL_CDN_SSH" "mkdir -p '${INSTALL_CDN_DIR}/releases'"

rsync -avz \
  "$ROOT/dist/install.sh" \
  "${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR}/install.sh"

rsync -avz \
  "$ROOT/dist/releases/" \
  "${INSTALL_CDN_SSH}:${INSTALL_CDN_DIR}/releases/"

echo ""
echo "[sync] 完成。请确认发布机已运行安装 CDN:"
echo "  cd deploy/cdn && INSTALL_CDN_DIR=${INSTALL_CDN_DIR} docker compose up -d"
echo ""
echo "官方安装命令（发给用户）:"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash -s -- --port 8088 -y"
echo ""
echo "指定版本:"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash -s -- --base-url ${FABRIC_INSTALL_BASE} --version <版本> -y"
