#!/usr/bin/env bash
# 为 Quick-Box fabric 环境增加 install-www 卷（需 QB_API_KEY）
#
#   QB_API_KEY=qb_xxx ./scripts/qb-patch-install-volume.sh
#
set -euo pipefail

QB_API_KEY="${QB_API_KEY:?设置 QB_API_KEY}"
PID="${QB_PROJECT_ID:-7abe3dcb-758f-4614-bf0a-f91ed6086477}"
EID="${QB_ENV_FABRIC_ID:-85abae00-85f7-4677-87b2-3f1053dcee51}"
API_URL="${FABRIC_API_BASE_URL:-http://172.81.57.29:18081/api}"

curl -sS -X PATCH "https://ops.zoom.ci/api/v1/projects/${PID}/environments/${EID}" \
  -H "X-API-Key: ${QB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg api "$API_URL" '{
    healthCheckUrl: "http://172.81.57.29:18081/healthz",
    deployMethodConfig: {
      tag: "latest",
      ports: ["18081:8080"],
      volumes: [
        "/opt/fabric-api/data:/app/data",
        "/opt/fabric-api/install-www:/app/install-www"
      ],
      workDir: "/home/fabric-api",
      imageName: "fabric-api",
      dockerfile: "todo-server-go/Dockerfile",
      buildContext: "todo-server-go",
      containerName: "fabric-api",
      extraHosts: ["host.docker.internal:host-gateway"],
      buildArgs: { VITE_API_BASE_URL: $api }
    }
  }')" | jq '{success, volumes: .data.deployMethodConfig.volumes}'

echo "请在服务器执行: mkdir -p /opt/fabric-api/install-www/releases"
echo "然后重新 deploy fabric 环境。"
