#!/usr/bin/env bash
# 构建预构建镜像并打包线上安装 release（不含源码）
#
# 用法:
#   ./scripts/publish-release.sh 1.0.0
#   FABRIC_REGISTRY=ghcr.io/myorg ./scripts/publish-release.sh 1.0.0 --push
#
# 产出:
#   dist/releases/1.0.0/{manifest.json,docker-compose.yml,nginx.conf,env.example,install.sh}
#   dist/releases/latest/  -> 同步副本
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="${1:-}"
PUSH=0
BUNDLE_ONLY=0
FABRIC_REGISTRY="${FABRIC_REGISTRY:-ghcr.io/yixian-huang}"
FABRIC_INSTALL_BASE="${FABRIC_INSTALL_BASE:-https://get.fabricoption.com}"

usage() {
  echo "用法: $0 <version> [--push] [--bundle-only]"
  echo "  --push         构建后推送镜像到 ${FABRIC_REGISTRY}"
  echo "  --bundle-only  仅打包 release 清单（镜像已由 CI 构建时使用）"
  exit 1
}

[[ -z "$VERSION" ]] && usage
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --push) PUSH=1; shift ;;
    --bundle-only) BUNDLE_ONLY=1; shift ;;
    *) usage ;;
  esac
done

RELEASE_DIR="$ROOT/dist/releases/$VERSION"
LATEST_DIR="$ROOT/dist/releases/latest"

sha256_file() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

IMAGE_API="${FABRIC_REGISTRY}/fabric-api:${VERSION}"
IMAGE_WEB="${FABRIC_REGISTRY}/fabric-web:${VERSION}"
IMAGE_TABLE="${FABRIC_REGISTRY}/fabric-table:${VERSION}"

info() { echo "[publish] $*"; }

if [[ "$BUNDLE_ONLY" -eq 0 ]]; then
  info "构建镜像 ${VERSION}..."

  docker build -t "$IMAGE_API" "$ROOT/todo-server-go"
  docker build -t "$IMAGE_WEB" \
    --build-arg VITE_API_BASE_URL=/api \
    "$ROOT/todo-web"
  docker build -t "$IMAGE_TABLE" \
    --build-arg VITE_API_BASE_URL=/api \
    --build-arg VITE_BASE_PATH=/grid/ \
    "$ROOT/todo-table"

  if [[ "$PUSH" -eq 1 ]]; then
    info "推送镜像..."
    docker push "$IMAGE_API"
    docker push "$IMAGE_WEB"
    docker push "$IMAGE_TABLE"
    docker tag "$IMAGE_API" "${FABRIC_REGISTRY}/fabric-api:latest"
    docker tag "$IMAGE_WEB" "${FABRIC_REGISTRY}/fabric-web:latest"
    docker tag "$IMAGE_TABLE" "${FABRIC_REGISTRY}/fabric-table:latest"
    docker push "${FABRIC_REGISTRY}/fabric-api:latest"
    docker push "${FABRIC_REGISTRY}/fabric-web:latest"
    docker push "${FABRIC_REGISTRY}/fabric-table:latest"
  fi
else
  info "跳过镜像构建 (--bundle-only)"
fi

info "打包 release 到 dist/releases/${VERSION}..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

cp "$ROOT/deploy/docker-compose.yml" "$RELEASE_DIR/docker-compose.yml"
cp "$ROOT/deploy/nginx/nginx.conf" "$RELEASE_DIR/nginx.conf"
cp "$ROOT/deploy/.env.example" "$RELEASE_DIR/env.example"
cp "$ROOT/deploy/install.sh" "$RELEASE_DIR/install.sh"
cp "$ROOT/scripts/install-lib.sh" "$RELEASE_DIR/install-lib.sh"
chmod +x "$RELEASE_DIR/install.sh"

SUM_COMPOSE="$(sha256_file "$RELEASE_DIR/docker-compose.yml")"
SUM_NGINX="$(sha256_file "$RELEASE_DIR/nginx.conf")"
SUM_ENV="$(sha256_file "$RELEASE_DIR/env.example")"
RELEASED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat > "$RELEASE_DIR/manifest.json" <<EOF
{
  "version": "${VERSION}",
  "released_at": "${RELEASED_AT}",
  "install_base": "${FABRIC_INSTALL_BASE}",
  "registry": "${FABRIC_REGISTRY}",
  "images": {
    "api": "${IMAGE_API}",
    "web": "${IMAGE_WEB}",
    "table": "${IMAGE_TABLE}"
  },
  "files": {
    "docker-compose.yml": "${SUM_COMPOSE}",
    "nginx.conf": "${SUM_NGINX}",
    "env.example": "${SUM_ENV}"
  }
}
EOF

rm -rf "$LATEST_DIR"
mkdir -p "$LATEST_DIR"
cp -R "$RELEASE_DIR/." "$LATEST_DIR/"

# 根 install.sh 指向同一脚本，便于 CDN 只托管一个 URL
cp "$ROOT/deploy/install.sh" "$ROOT/dist/install.sh"
chmod +x "$ROOT/dist/install.sh"

info "完成"
echo ""
echo "上传到 CDN (${FABRIC_INSTALL_BASE}):"
echo "  dist/install.sh                    -> ${FABRIC_INSTALL_BASE}/install.sh"
echo "  dist/releases/${VERSION}/*         -> ${FABRIC_INSTALL_BASE}/releases/${VERSION}/"
echo "  dist/releases/latest/*             -> ${FABRIC_INSTALL_BASE}/releases/latest/"
echo ""
echo "用户安装命令:"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash"
echo "  curl -fsSL ${FABRIC_INSTALL_BASE}/install.sh | bash -s -- --version ${VERSION}"
