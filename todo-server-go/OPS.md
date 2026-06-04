# Fabric API (Go) — Quick-Box 部署

## Deploy hook（正确项目：todo-project-admin）

```bash
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7eea0f4c-750c-4ddc-b7f1-6caf2fff7a98/fabric" \
  -H "X-API-Key: $QB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gitRef":"fabric-go"}'
```

- **Git 分支:** `fabric-go` on `https://github.com/yixian-huang/todo-server.git`
- **QB Project ID:** `7eea0f4c-750c-4ddc-b7f1-6caf2fff7a98`（todo-project-admin）
- **环境名:** `fabric`
- **对外端口:** `18080` → 容器 `8080`（宿主机 `8080` 已被占用）

## 运行时依赖（宿主机）

| 服务 | 容器内访问 | 说明 |
|------|------------|------|
| PostgreSQL | `host.docker.internal:54321` | 库名 `fabric`，用户 `fabric` |
| RustFS (S3) | `host.docker.internal:9000` | Bucket `fabric`，控制台 [RustFS Browser](http://172.81.57.29:9001/rustfs/console/browser/) |
| Redis | `host.docker.internal:6379` | 可选，连接失败仅 warn |

## 健康检查

```bash
curl http://172.81.57.29:18080/healthz
```

## 环境变量（Quick-Box 已注入）

见 QB 环境 `fabric` 的 variables API；密钥在控制台以 secret 管理，勿写入仓库。
