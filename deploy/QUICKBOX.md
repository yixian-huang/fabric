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

- `VITE_API_BASE_URL=/api`（由容器内 nginx 反代到 API）
- `fabric-table` 另需 `VITE_BASE_PATH=/grid/`

Web/Table 容器环境变量（nginx `/api/` 反代，默认 `172.17.0.1:18081` 经 Docker 桥接访问宿主机 API）：

- `API_UPSTREAM_HOST=172.81.57.29`（桥接不可用时改为宿主机 IP）
- `API_UPSTREAM_PORT=18081`
- 建议 QB `buildArgs` 使用 `VITE_API_BASE_URL=/api`（同源走反代），勿写绝对 API 地址

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

## 官方 install（集成在 fabric-api）

`todo-server-go` 镜像内 nginx 提供 `/install.sh` 与 `/releases/`（端口 **18081**）。发版与同步见 [INSTALL_CDN.md](./INSTALL_CDN.md)。

## 健康检查

QB 的 `healthCheckUrl` 必须使用**宿主机可访问的 URL**（例如 `http://172.81.57.29:18082/`），
不要用容器内的 `http://127.0.0.1:80/`，否则检查端会 `fetch failed` 但服务实际已正常。
