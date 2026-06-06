#!/usr/bin/env bash
# 触发 Quick-Box 部署（测试环境 172.81.57.29）
# 默认仅 fabric + fabric-web；todo-table 暂不维护
#
#   ./scripts/qb-deploy.sh main
#   ./scripts/qb-deploy.sh v1.2.3
#   ./scripts/qb-deploy.sh main --with-table   # 历史兼容
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/deploy/.env.qb"

WITH_TABLE=0
GIT_REF=""
for arg in "$@"; do
  case "$arg" in
    --with-table) WITH_TABLE=1 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      [[ -z "$GIT_REF" ]] && GIT_REF="$arg"
      ;;
  esac
done
GIT_REF="${GIT_REF:-main}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 ${ENV_FILE}，请复制 deploy/.env.qb.example 并填入 QB_API_KEY" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

: "${QB_API_KEY:?QB_API_KEY 未设置}"
: "${QB_PROJECT_ID:?QB_PROJECT_ID 未设置}"
QB_API_BASE="${QB_API_BASE:-https://ops.zoom.ci/api/v1}"

SERVICES=(fabric fabric-web)
if [[ "$WITH_TABLE" == "1" ]]; then
  SERVICES+=(fabric-table)
fi

BODY=$(printf '{"gitRef":"%s"}' "$GIT_REF")

for svc in "${SERVICES[@]}"; do
  echo ">>> deploy ${svc} (gitRef=${GIT_REF})"
  resp=$(curl -fsS -X POST "${QB_API_BASE}/deploy-hooks/${QB_PROJECT_ID}/${svc}" \
    -H "X-API-Key: ${QB_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  echo "$resp"
  dep_id=$(printf '%s' "$resp" | sed -n 's/.*"id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
  if [[ -n "$dep_id" ]]; then
    echo "    deployment: ${QB_API_BASE}/deployments/${dep_id}"
  fi
  echo ""
done

echo "完成。健康检查（测试机）:"
echo "  curl -fsS http://${QB_HOST:-172.81.57.29}:${QB_PORT_API:-18081}/healthz"
echo "  curl -fsSI http://${QB_HOST:-172.81.57.29}:${QB_PORT_WEB:-18082}/ | head -5"
