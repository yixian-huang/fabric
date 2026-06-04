# Fabric API (Go) — Quick-Box 部署

## 仓库

- **Monorepo:** https://github.com/yixian-huang/fabric.git
- **构建路径:** `todo-server-go/`（`Dockerfile` + `buildContext`）

## Deploy hook

```bash
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7abe3dcb-758f-4614-bf0a-f91ed6086477/fabric" \
  -H "X-API-Key: $QB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gitRef":"main"}'
```

- **QB Project ID:** `7abe3dcb-758f-4614-bf0a-f91ed6086477`
- **Environment ID:** `85abae00-85f7-4677-87b2-3f1053dcee51`
- **环境名:** `fabric`
- **对外端口:** `18081` → 容器 `8080`

## 运行时依赖

| 服务 | 容器内访问 | 说明 |
|------|------------|------|
| PostgreSQL | `host.docker.internal:54321` | 宿主机映射端口；库名 `fabric`（QB 变量 `POSTGRES_DSN`） |
| 文件存储 | `/app/data/files` | `STORAGE_MODE=local` |
| Redis | 可选 | 连接失败仅 warn |

## 健康检查

```bash
curl http://172.81.57.29:18081/healthz
```

## 环境变量

在 Quick-Box 控制台或 Variables API 管理；**勿将密钥写入仓库**。

常用键：`POSTGRES_DSN`、`JWT_SECRET`、`APP_ENV`、`DATABASE_MODE`、`STORAGE_MODE`、`DATA_DIR`。
