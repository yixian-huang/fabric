#!/usr/bin/env bash
# 触发 Quick-Box 三服务部署（读取 deploy/.env.qb，勿提交密钥）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/deploy/.env.qb"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 ${ENV_FILE}，请从 deploy/QUICKBOX.md 配置 QB_API_KEY" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${QB_API_KEY:?QB_API_KEY 未设置}"
: "${QB_PROJECT_ID:?QB_PROJECT_ID 未设置}"

GIT_REF="${1:-main}"
BODY=$(printf '{"gitRef":"%s"}' "$GIT_REF")

for svc in fabric fabric-web fabric-table; do
  echo ">>> deploy ${svc} (gitRef=${GIT_REF})"
  curl -fsS -X POST "${QB_API_BASE}/deploy-hooks/${QB_PROJECT_ID}/${svc}" \
    -H "X-API-Key: ${QB_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$BODY"
  echo ""
done

echo "完成。健康检查:"
echo "  curl http://${QB_HOST:-127.0.0.1}:${QB_PORT_API:-18081}/healthz"
