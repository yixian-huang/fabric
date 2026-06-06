#!/usr/bin/env bash
# 生产 fabricoption.com 日常升级（API + Web，不含 todo-table）
# 用法:
#   ./scripts/upgrade-fabricoption-prod.sh              # 本地构建并同步 web dist
#   ./scripts/upgrade-fabricoption-prod.sh --api        # 同上 + 重启 API 容器
#   ./scripts/upgrade-fabricoption-prod.sh --web-only   # 仅 web（默认）
#   ./scripts/upgrade-fabricoption-prod.sh --from-image # 从 GHCR web 镜像解包 dist（不在本地 build）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT}/deploy/.env.prod"

WEB_ONLY=1
UPGRADE_API=0
FROM_IMAGE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web-only) WEB_ONLY=1; UPGRADE_API=0; shift ;;
    --api) UPGRADE_API=1; shift ;;
    --from-image) FROM_IMAGE=1; shift ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *) echo "未知参数: $1" >&2; exit 1 ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

PROD_SSH_HOST="${PROD_SSH_HOST:-23.146.4.16}"
PROD_SSH_PORT="${PROD_SSH_PORT:-52322}"
PROD_SSH_USER="${PROD_SSH_USER:-root}"
PROD_SSH_KEY="${PROD_SSH_KEY:-${ROOT}/.ssh}"
PROD_WEB_DIST="${PROD_WEB_DIST:-/opt/1panel/apps/openresty/openresty/www/sites/fabricoption.com/index/dist}"
PROD_DEPLOY_DIR="${PROD_DEPLOY_DIR:-/opt/fabric-go}"
PROD_API_PORT="${PROD_API_PORT:-8081}"
IMAGE_API="${IMAGE_API:-ghcr.io/yixian-huang/fabric-api:latest}"
IMAGE_WEB="${IMAGE_WEB:-ghcr.io/yixian-huang/fabric-web:latest}"

VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://fabricoption.com/api}"
VITE_SITE_URL="${VITE_SITE_URL:-https://fabricoption.com}"
VITE_FABRIC_THEME="${VITE_FABRIC_THEME:-modern}"

SSH_OPTS=(-p "$PROD_SSH_PORT" -i "$PROD_SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=30)
SSH=(ssh "${SSH_OPTS[@]}" "${PROD_SSH_USER}@${PROD_SSH_HOST}")

log() { echo "[prod-upgrade] $*"; }

ensure_ssh_key() {
  if ! ssh-keygen -y -f "$PROD_SSH_KEY" >/dev/null 2>&1; then
    log "修复 SSH 私钥 PEM 换行…"
    python3 - "$PROD_SSH_KEY" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
lines = [ln.strip() for ln in p.read_text().splitlines()]
b64 = "".join(lines[1:-1])
wrapped = "\n".join(b64[i : i + 70] for i in range(0, len(b64), 70))
p.write_text(f"{lines[0]}\n{wrapped}\n{lines[-1]}\n")
PY
    chmod 600 "$PROD_SSH_KEY"
  fi
}

sync_web_dist() {
  if [[ "$FROM_IMAGE" == "1" ]]; then
    log "在服务器从镜像解包 web: ${IMAGE_WEB}"
    "${SSH[@]}" bash -s <<EOF
set -euo pipefail
mkdir -p "${PROD_WEB_DIST}"
cid=\$(docker create "${IMAGE_WEB}")
docker cp "\${cid}:/usr/share/nginx/html/." "${PROD_WEB_DIST}/"
docker rm "\$cid" >/dev/null
EOF
    return
  fi

  log "本地构建 todo-web…"
  (
    cd "${ROOT}/todo-web"
    export VITE_API_BASE_URL VITE_SITE_URL VITE_FABRIC_THEME
    npx vite build
  )

  log "同步 dist → ${PROD_SSH_HOST}:${PROD_WEB_DIST}"
  tar -C "${ROOT}/todo-web/dist" -czf - . \
    | "${SSH[@]}" "mkdir -p '${PROD_WEB_DIST}' && tar -C '${PROD_WEB_DIST}' -xzf -"
}

upgrade_api() {
  log "重启 API 容器 (${IMAGE_API})…"
  "${SSH[@]}" bash -s <<EOF
set -euo pipefail
docker pull "${IMAGE_API}" || true
docker rm -f fabric-api 2>/dev/null || true
# 保留现有 JWT / 数据卷；环境变量应与 migrate 后一致
JWT="\$(cat ${PROD_DEPLOY_DIR}/jwt.secret 2>/dev/null || openssl rand -hex 32)"
docker run -d --name fabric-api \\
  --restart unless-stopped \\
  --network host \\
  -v "${PROD_DEPLOY_DIR}/data:/app/data" \\
  -e APP_ENV=production \\
  -e HTTP_ADDR=:${PROD_API_PORT} \\
  -e JWT_SECRET="\$JWT" \\
  -e POSTGRES_DSN="\${POSTGRES_DSN:-postgres://fabric@127.0.0.1:5432/fabric?sslmode=disable}" \\
  -e REDIS_ADDR=127.0.0.1:6379 \\
  -e REDIS_PASSWORD="\${REDIS_PASSWORD:-}" \\
  -e MINIO_ENDPOINT=127.0.0.1:9000 \\
  -e STORAGE_MODE=embedded-minio \\
  -e DATABASE_MODE=external \\
  "${IMAGE_API}"
sleep 3
curl -fsS "http://127.0.0.1:${PROD_API_PORT}/healthz" >/dev/null
EOF
}

verify() {
  log "验证 https://fabricoption.com/api/healthz"
  curl -fsS "https://fabricoption.com/api/healthz" >/dev/null
  log "完成。"
}

main() {
  ensure_ssh_key
  sync_web_dist
  if [[ "$UPGRADE_API" == "1" ]]; then
    upgrade_api
  fi
  verify
}

main
