# Fabric — Quick-Box 部署

**仓库:** https://github.com/yixian-huang/fabric.git  
**Project ID:** `7abe3dcb-758f-4614-bf0a-f91ed6086477`  
**主机:** `172.81.57.29`

| 环境 | 容器 | 宿主机端口 | 访问 |
|------|------|------------|------|
| `fabric` (API) | `fabric-api` | 18081 | http://172.81.57.29:18081/healthz |
| `fabric-web` | `fabric-web` | 18082 | http://172.81.57.29:18082/ |
| `fabric-table` | `fabric-table` | 18083 | http://172.81.57.29:18083/grid/ |

前端构建参数（镜像内 baked）：

- `VITE_API_BASE_URL=http://172.81.57.29:18081/api`
- `fabric-table` 另需 `VITE_BASE_PATH=/grid/`

## Deploy hooks

```bash
# API
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7abe3dcb-758f-4614-bf0a-f91ed6086477/fabric" \
  -H "X-API-Key: $QB_API_KEY" -H "Content-Type: application/json" -d '{"gitRef":"main"}'

# Web
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7abe3dcb-758f-4614-bf0a-f91ed6086477/fabric-web" \
  -H "X-API-Key: $QB_API_KEY" -H "Content-Type: application/json" -d '{"gitRef":"main"}'

# Table
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7abe3dcb-758f-4614-bf0a-f91ed6086477/fabric-table" \
  -H "X-API-Key: $QB_API_KEY" -H "Content-Type: application/json" -d '{"gitRef":"main"}'
```

## 环境 ID

- API: `85abae00-85f7-4677-87b2-3f1053dcee51`
- Web: `0935bb3b-a48f-4099-84a6-d021a3d976c4`
- Table: `a523a7e8-dcc6-4197-a7cd-4160b323bdc4`

密钥与 `POSTGRES_DSN` 仅在 Quick-Box 环境变量中配置，勿写入仓库。
