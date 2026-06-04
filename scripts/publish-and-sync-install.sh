#!/usr/bin/env bash
# 发版打包 + 同步到 fabric-api 宿主机 install-www
#
#   FABRIC_INSTALL_BASE=http://172.81.57.29:18081 \
#   INSTALL_CDN_SSH=root@172.81.57.29 \
#     ./scripts/publish-and-sync-install.sh 1.0.0
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:?用法: $0 <version>}"

FABRIC_INSTALL_BASE="${FABRIC_INSTALL_BASE:-http://172.81.57.29:18081}"
FABRIC_REGISTRY="${FABRIC_REGISTRY:-ghcr.io/yixian-huang}"
export FABRIC_INSTALL_BASE FABRIC_REGISTRY

"${ROOT}/scripts/publish-release.sh" "$VERSION" --bundle-only
"${ROOT}/scripts/sync-install-cdn.sh"
