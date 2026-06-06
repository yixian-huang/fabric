#!/usr/bin/env bash
# Migrate fabricoption.com from Django todo-server to todo-server-go + new frontends.
# Run on the production host as root.
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/fabric-go}"
API_PORT="${API_PORT:-8081}"
# 生产机内存紧张时保持 0，使用 ghcr 预构建镜像；需 Django 密码兼容时设 BUILD_API=1
BUILD_API="${BUILD_API:-0}"
SWITCH_OPENRESTY="${SWITCH_OPENRESTY:-1}"
STOP_GUNICORN="${STOP_GUNICORN:-0}"
DB_USER="${DB_USER:-fabric}"
DB_PASS="${DB_PASS:-dkHzk45HhwmfiyC4}"
DB_NAME="${DB_NAME:-fabric}"
MINIO_USER="${MINIO_USER:-minio_2bGnyz}"
MINIO_PASS="${MINIO_PASS:-minio_TT5y4s}"
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
IMAGE_API="${IMAGE_API:-ghcr.io/yixian-huang/fabric-api:latest}"
IMAGE_WEB="${IMAGE_WEB:-ghcr.io/yixian-huang/fabric-web:latest}"
IMAGE_TABLE="${IMAGE_TABLE:-ghcr.io/yixian-huang/fabric-table:latest}"

SITE_ROOT="/opt/1panel/apps/openresty/openresty/www/sites/fabricoption.com"
WEB_DIST="${SITE_ROOT}/index/dist"
TABLE_DIST="${SITE_ROOT}/table/dist"
BACKUP_DIR="${DEPLOY_DIR}/backups/$(date +%Y%m%d-%H%M%S)"

log() { echo "[migrate] $*"; }

mkdir -p "$DEPLOY_DIR" "$BACKUP_DIR"

log "Backing up PostgreSQL..."
docker exec 1Panel-postgresql-mKEU pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc \
  > "${BACKUP_DIR}/fabric.dump"

log "Pulling images..."
docker pull "$IMAGE_API"
docker pull "$IMAGE_WEB"
docker pull "$IMAGE_TABLE"

API_BINARY=""
if [[ "$BUILD_API" == "1" ]]; then
  log "Building API with Django password compatibility (BUILD_API=1)..."
  if [[ ! -f "${DEPLOY_DIR}/fabric-api" ]]; then
    rm -rf "${DEPLOY_DIR}/src"
    mkdir -p "${DEPLOY_DIR}/src"
    tar -C "${DEPLOY_DIR}/src" -xf "${DEPLOY_DIR}/todo-server-go.tar" 2>/dev/null || true
  fi
fi

if [[ "$BUILD_API" == "1" && -f "${DEPLOY_DIR}/src/go.mod" ]]; then
  docker run --rm \
    -v "${DEPLOY_DIR}/src:/src" \
    -w /src \
    golang:1.25-alpine \
    sh -c 'apk add --no-cache git >/dev/null && go mod download && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /src/fabric-api ./cmd/api'
  API_RUN_IMAGE="alpine:3.20"
  API_BINARY="${DEPLOY_DIR}/src/fabric-api"
else
  log "No local source tarball; using prebuilt image (Django passwords may not work)."
  API_RUN_IMAGE="$IMAGE_API"
  API_BINARY=""
fi

log "Starting Go API (schema migrations)..."
docker rm -f fabric-api 2>/dev/null || true

if [[ -n "$API_BINARY" && -f "$API_BINARY" ]]; then
  docker run -d --name fabric-api \
    --restart unless-stopped \
    --add-host=host.docker.internal:host-gateway \
    -p "127.0.0.1:${API_PORT}:8081" \
    -v "${API_BINARY}:/app/fabric-api:ro" \
    -v "${DEPLOY_DIR}/data:/app/data" \
    -v "${DEPLOY_DIR}/src/db/migrations:/app/db/migrations:ro" \
    -e APP_ENV=production \
    -e HTTP_ADDR=:8081 \
    -e JWT_SECRET="$JWT_SECRET" \
    -e POSTGRES_DSN="postgres://${DB_USER}:${DB_PASS}@host.docker.internal:5432/${DB_NAME}?sslmode=disable" \
    -e REDIS_ADDR=host.docker.internal:6379 \
    -e MINIO_ENDPOINT=host.docker.internal:9000 \
    -e MINIO_ACCESS_KEY="$MINIO_USER" \
    -e MINIO_SECRET_KEY="$MINIO_PASS" \
    -e MINIO_BUCKET_NAME=fabric \
    -e MINIO_SECURE=false \
    -e STORAGE_MODE=embedded-minio \
    -e DATABASE_MODE=external \
    -e DATA_DIR=/app/data \
    -e MIGRATIONS_DIR=/app/db/migrations \
    alpine:3.20 \
    /app/fabric-api
else
  docker run -d --name fabric-api \
    --restart unless-stopped \
    --add-host=host.docker.internal:host-gateway \
    -p "127.0.0.1:${API_PORT}:8080" \
    -v "${DEPLOY_DIR}/data:/app/data" \
    -e APP_ENV=production \
    -e HTTP_ADDR=:8081 \
    -e JWT_SECRET="$JWT_SECRET" \
    -e POSTGRES_DSN="postgres://${DB_USER}:${DB_PASS}@host.docker.internal:5432/${DB_NAME}?sslmode=disable" \
    -e REDIS_ADDR=host.docker.internal:6379 \
    -e MINIO_ENDPOINT=host.docker.internal:9000 \
    -e MINIO_ACCESS_KEY="$MINIO_USER" \
    -e MINIO_SECRET_KEY="$MINIO_PASS" \
    -e MINIO_BUCKET_NAME=fabric \
    -e MINIO_SECURE=false \
    -e STORAGE_MODE=embedded-minio \
    -e DATABASE_MODE=external \
    -e DATA_DIR=/app/data \
    "$IMAGE_API"
fi

sleep 5
curl -fsS "http://127.0.0.1:${API_PORT}/healthz" >/dev/null || {
  docker logs fabric-api --tail 80
  exit 1
}

log "Running Django -> Go data migration..."
docker exec -i 1Panel-postgresql-mKEU psql -U "$DB_USER" -d "$DB_NAME" \
  < "${DEPLOY_DIR}/migrate-django-to-go.sql"

log "Extracting todo-web static files..."
rm -rf "${BACKUP_DIR}/web-dist" "${BACKUP_DIR}/table-dist"
cp -a "$WEB_DIST" "${BACKUP_DIR}/web-dist" 2>/dev/null || true
mkdir -p "$WEB_DIST" "$TABLE_DIST"
cid=$(docker create "$IMAGE_WEB")
docker cp "${cid}:/usr/share/nginx/html/." "$WEB_DIST/"
docker rm "$cid" >/dev/null

log "Extracting todo-table static files..."
cid=$(docker create "$IMAGE_TABLE")
docker cp "${cid}:/usr/share/nginx/html/." "$TABLE_DIST/"
docker rm "$cid" >/dev/null

log "Writing runtime config..."
cat > "${DEPLOY_DIR}/data/fabric-config.json" <<EOF
{
  "setup_completed": true,
  "setup_completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "storage_mode": "embedded-minio",
  "database_mode": "external"
}
EOF

if [[ "$SWITCH_OPENRESTY" == "1" ]]; then
  log "Switching OpenResty API upstream to ${API_PORT}..."
  PROXY_DIR="${SITE_ROOT}/proxy"
  for f in "/opt/1panel/apps/openresty/openresty/conf/conf.d/fabricoption.com.conf" \
           "${PROXY_DIR}/api.conf"; do
    [[ -f "$f" ]] || continue
    cp -a "$f" "${BACKUP_DIR}/$(basename "$f").bak"
    sed -i "s|127.0.0.1:8000|127.0.0.1:${API_PORT}|g" "$f"
  done
  if [[ ! -f "${PROXY_DIR}/grid.conf" ]]; then
    cat > "${PROXY_DIR}/grid.conf" <<'NGINX'
location = /grid {
    return 301 /grid/;
}
location /grid/ {
    alias /opt/1panel/apps/openresty/openresty/www/sites/fabricoption.com/table/dist/;
    index index.html;
    try_files $uri $uri/ /grid/index.html;
}
NGINX
  fi
  docker exec 1Panel-openresty-rFWS nginx -t
  docker exec 1Panel-openresty-rFWS nginx -s reload
fi

echo "$JWT_SECRET" > "${DEPLOY_DIR}/jwt.secret"
chmod 600 "${DEPLOY_DIR}/jwt.secret"

if [[ "$STOP_GUNICORN" == "1" ]]; then
  log "Stopping Django gunicorn..."
  pkill -f "gunicorn fabric.wsgi" || true
fi

log "Done."
log "Backup: ${BACKUP_DIR}"
log "JWT secret: ${DEPLOY_DIR}/jwt.secret"
log "API health: http://127.0.0.1:${API_PORT}/healthz"
log "Verify: curl -fsS http://127.0.0.1:${API_PORT}/healthz && curl -fsSI https://fabricoption.com/api/healthz | head -5"
