#!/usr/bin/env bash
# 读取 Quick-Box ai-handoff（JSON），按 recommendedPlaybook 部署
#
#   ./scripts/qb-handoff.sh              # 读 handoff，部署 in-scope 环境（默认跳过 fabric-table）
#   ./scripts/qb-handoff.sh --show       # 仅打印 handoff 摘要
#   ./scripts/qb-handoff.sh --with-table
#   ./scripts/qb-handoff.sh main         # 指定 gitRef
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/deploy/.env.qb"

SHOW_ONLY=0
WITH_TABLE=0
GIT_REF="main"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --show) SHOW_ONLY=1; shift ;;
    --with-table) WITH_TABLE=1; shift ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      GIT_REF="$1"
      shift
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "缺少 ${ENV_FILE}，请复制 deploy/.env.qb.example" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
: "${QB_API_KEY:?}"
: "${QB_PROJECT_ID:?}"
QB_API_BASE="${QB_API_BASE:-https://ops.zoom.ci/api/v1}"

handoff_json=$(curl -fsSL \
  -H "X-API-Key: ${QB_API_KEY}" \
  -H "Accept: application/json" \
  "${QB_API_BASE}/projects/${QB_PROJECT_ID}/ai-handoff")

export HANDOFF="$handoff_json"
export WITH_TABLE

python3 <<'PY'
import json, os, sys

data = json.loads(os.environ["HANDOFF"])["data"]
print("=== Quick-Box Handoff ===")
print("project:", data.get("projectName"), data.get("projectId"))
print("recommendedPlaybook:", data.get("recommendedPlaybook"))
print()
print("serverConnectivity:")
for name, s in (data.get("serverConnectivity") or {}).items():
    print(f"  - {name}: {s.get('status')} ({s.get('host')}:{s.get('port')}) bound={s.get('environmentsBound')}")
print()
print("environmentReadiness:")
for name, r in (data.get("environmentReadiness") or {}).items():
    flag = "ready" if r.get("ready") else "NOT READY"
    miss = ", ".join(r.get("missing") or [])
    print(f"  - {name}: {flag}" + (f" ({miss})" if miss else ""))
print()
print("environments:")
skip_table = os.environ.get("WITH_TABLE") != "1"
for env in data.get("environments") or []:
    n = env.get("name")
    if skip_table and n == "fabric-table":
        print(f"  - {n}: skipped (out of scope)")
        continue
    hook = env.get("deployHookUrl") or "(hook path: /deploy-hooks/.../" + n + ")"
    print(f"  - {n}: ready={env.get('ready')} health={env.get('healthCheckUrl')}")
    print(f"      hook: {hook}")
playbook = (data.get("playbooks") or {}).get(data.get("recommendedPlaybook"))
if playbook:
    print()
    print("playbook note:", playbook.get("note"))
    for step in playbook.get("steps") or []:
        print(" ", step.get("note") or step)
PY

if [[ "$SHOW_ONLY" == "1" ]]; then
  exit 0
fi

# 部署：环境名 → deploy hook slug（fabric-table 可选）
DEPLOY_ENVS=(fabric fabric-web)
if [[ "$WITH_TABLE" == "1" ]]; then
  DEPLOY_ENVS+=(fabric-table)
fi

BODY=$(printf '{"gitRef":"%s"}' "$GIT_REF")
DEPLOY_IDS=()

for svc in "${DEPLOY_ENVS[@]}"; do
  echo ">>> deploy hook: ${svc} (gitRef=${GIT_REF})"
  resp=$(curl -fsS -X POST "${QB_API_BASE}/deploy-hooks/${QB_PROJECT_ID}/${svc}" \
    -H "X-API-Key: ${QB_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$BODY")
  dep_id=$(printf '%s' "$resp" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
  DEPLOY_IDS+=("$dep_id")
  echo "    deployment: ${QB_API_BASE}/deployments/${dep_id}"
done

poll_deployment() {
  local id="$1"
  local name="$2"
  for _ in $(seq 1 90); do
    local st
    st=$(curl -fsSL -H "X-API-Key: ${QB_API_KEY}" "${QB_API_BASE}/deployments/${id}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['status'])")
    case "$st" in
      success) echo "    ${name}: success"; return 0 ;;
      failed|cancelled) echo "    ${name}: ${st} — see ${QB_API_BASE}/deployments/${id}/logs" >&2; return 1 ;;
    esac
    sleep 5
  done
  echo "    ${name}: timeout" >&2
  return 1
}

echo ">>> polling deployments…"
idx=0
for svc in "${DEPLOY_ENVS[@]}"; do
  poll_deployment "${DEPLOY_IDS[$idx]}" "$svc"
  idx=$((idx + 1))
done

echo ">>> health checks (测试机)"
curl -fsS -o /dev/null "http://${QB_HOST:-172.81.57.29}:${QB_PORT_API:-18081}/healthz"
echo "    API ${QB_PORT_API:-18081}/healthz OK"
curl -fsS -o /dev/null "http://${QB_HOST:-172.81.57.29}:${QB_PORT_WEB:-18082}/"
echo "    Web ${QB_PORT_WEB:-18082}/ OK"
echo "完成。"
