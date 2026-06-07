#!/usr/bin/env bash
# Quick-Box：新建 fabric-web-prod（构建镜像 + postDeploy 同步 OpenResty 静态目录）
#
#   ./scripts/qb-init-fabric-web-prod.sh
#   ./scripts/qb-init-fabric-web-prod.sh --deploy-only main
#
# init 后须 PATCH 完整 deployMethodConfig（含 buildArgs），勿只传 buildArgs 字段。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_QB="${ROOT}/deploy/.env.qb"
ENV_PROD="${ROOT}/deploy/.env.prod"

DEPLOY_ONLY=0
GIT_REF="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --deploy-only) DEPLOY_ONLY=1; shift ;;
    -h|--help) sed -n '2,9p' "$0"; exit 0 ;;
    *) GIT_REF="$1"; shift ;;
  esac
done

[[ -f "$ENV_QB" ]] || { echo "缺少 $ENV_QB" >&2; exit 1; }
# shellcheck disable=SC1090
source "$ENV_QB"
: "${QB_API_KEY:?}"
: "${QB_PROJECT_ID:?}"
QB_API_BASE="${QB_API_BASE:-https://ops.zoom.ci/api/v1}"

if [[ -f "$ENV_PROD" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_PROD"
fi

PROD_WEB_DIST="${PROD_WEB_DIST:-/opt/1panel/apps/openresty/openresty/www/sites/fabricoption.com/index/dist}"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://fabricoption.com/api}"

init_fabric_web_prod() {
  local body_file
  body_file=$(mktemp)
  PROD_WEB_DIST="$PROD_WEB_DIST" python3 <<'PY' >"$body_file"
import json, os
static = os.environ["PROD_WEB_DIST"]
post = f"""set -euo pipefail
STATIC="{static}"
IMAGE_TAG="${{IMAGE:-fabric-web-prod:latest}}"
mkdir -p "$STATIC"
rm -rf "$STATIC"/*
cid=$(docker create "$IMAGE_TAG")
docker cp "${{cid}}:/usr/share/nginx/html/." "$STATIC/"
docker rm "$cid" >/dev/null
echo "synced web dist to $STATIC"
"""
body = {
  "repoUrl": "https://github.com/yixian-huang/fabric.git",
  "environmentName": "fabric-web-prod",
  "imageName": "fabric-web-prod",
  "containerName": "fabric-web-prod",
  "workDir": "/home/fabric-web-prod",
  "dockerfile": "todo-web/Dockerfile",
  "buildContext": "todo-web",
  "buildServerName": "172.81.57.29",
  "deployServerNames": ["Goddady - Fabric"],
  "ports": ["127.0.0.1:18083:80"],
  "healthCheckUrl": "https://fabricoption.com/",
  "postDeployScript": post,
}
print(json.dumps(body))
PY

  echo ">>> POST init-project (fabric-web-prod)"
  local resp http env_id
  resp=$(curl -sS -X POST "${QB_API_BASE}/onboarding/init-project" \
    -H "X-API-Key: ${QB_API_KEY}" -H "Content-Type: application/json" \
    -d @"$body_file" -w "\nHTTP:%{http_code}")
  http=$(echo "$resp" | tail -1)
  resp=$(echo "$resp" | sed '$d')
  rm -f "$body_file"
  echo "$resp" | python3 -m json.tool || { echo "$resp"; exit 1; }
  echo "$http" | grep -q 'HTTP:20' || exit 1

  env_id=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('environmentId',''))" 2>/dev/null || true)
  if [[ -z "$env_id" ]]; then
    env_id=$(curl -fsSL -H "X-API-Key: ${QB_API_KEY}" \
      "${QB_API_BASE}/projects/${QB_PROJECT_ID}/environments" \
      | python3 -c "import sys,json; print(next(e['id'] for e in json.load(sys.stdin)['data'] if e['name']=='fabric-web-prod'))")
  fi

  echo ">>> PATCH fabric-web-prod ($env_id): 完整 deployMethodConfig + buildArgs"
  curl -fsS -X PATCH "${QB_API_BASE}/projects/${QB_PROJECT_ID}/environments/${env_id}" \
    -H "X-API-Key: ${QB_API_KEY}" -H "Content-Type: application/json" \
    -d "$(VITE_API_BASE_URL="$VITE_API_BASE_URL" python3 <<PY
import json, os
print(json.dumps({
  "deployHookEnabled": True,
  "deployMethodConfig": {
    "tag": "latest",
    "ports": ["127.0.0.1:18083:80"],
    "workDir": "/home/fabric-web-prod",
    "imageName": "fabric-web-prod",
    "dockerfile": "todo-web/Dockerfile",
    "buildContext": "todo-web",
    "containerName": "fabric-web-prod",
    "buildArgs": {"VITE_API_BASE_URL": os.environ["VITE_API_BASE_URL"]},
  },
}))
PY
)" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print('buildArgs', d['deployMethodConfig'].get('buildArgs'))"
}

deploy_fabric_web_prod() {
  echo ">>> deploy hook fabric-web-prod (gitRef=${GIT_REF})"
  local dep_id
  dep_id=$(curl -fsS -X POST "${QB_API_BASE}/deploy-hooks/${QB_PROJECT_ID}/fabric-web-prod" \
    -H "X-API-Key: ${QB_API_KEY}" -H "Content-Type: application/json" \
    -d "$(printf '{"gitRef":"%s"}' "$GIT_REF")" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
  echo "    deployment: ${QB_API_BASE}/deployments/${dep_id}"
  for _ in $(seq 1 90); do
    local st
    st=$(curl -fsSL -H "X-API-Key: ${QB_API_KEY}" "${QB_API_BASE}/deployments/${dep_id}" \
      | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['status'])")
    case "$st" in
      success) echo "    status: success"; break ;;
      failed|cancelled|build_failed) echo "    status: $st" >&2; exit 1 ;;
    esac
    sleep 10
  done
  curl -fsS -o /dev/null "https://fabricoption.com/"
  echo "    https://fabricoption.com/ OK"
}

if [[ "$DEPLOY_ONLY" != "1" ]]; then
  if curl -fsSL -H "X-API-Key: ${QB_API_KEY}" \
    "${QB_API_BASE}/projects/${QB_PROJECT_ID}/environments" \
    | python3 -c "import sys,json; sys.exit(0 if any(e['name']=='fabric-web-prod' for e in json.load(sys.stdin)['data']) else 1)" 2>/dev/null; then
    echo "fabric-web-prod 已存在，跳过 init"
  else
    init_fabric_web_prod
  fi
fi

deploy_fabric_web_prod
echo "完成。"
