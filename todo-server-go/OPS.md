# Fabric API (Go) — Quick-Box 部署

全栈说明见 [deploy/QUICKBOX.md](../deploy/QUICKBOX.md)。  
**官方 install 分发（nginx 集成）**见 [deploy/INSTALL_CDN.md](../deploy/INSTALL_CDN.md)。

## 仓库

- **Monorepo:** https://github.com/yixian-huang/fabric.git
- **构建路径:** `todo-server-go/`（镜像内含 nginx + Go API）

## 容器内路由（端口 8080）

| 路径 | 服务 |
|------|------|
| `/api/` | Go API（内部 `:8081`） |
| `/healthz` | 健康检查 |
| `/install.sh` | 一键安装脚本（静态，来自卷 `/app/install-www`） |
| `/releases/` | 安装包清单 |

## Deploy hook

```bash
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/7abe3dcb-758f-4614-bf0a-f91ed6086477/fabric" \
  -H "X-API-Key: $QB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"gitRef":"main"}'
```

- **QB Project ID:** `7abe3dcb-758f-4614-bf0a-f91ed6086477`
- **Environment:** `fabric` · `85abae00-85f7-4677-87b2-3f1053dcee51`
- **对外端口:** `18081` → 容器 `8080`

## 卷（Quick-Box）

```text
/opt/fabric-api/data:/app/data
/opt/fabric-api/install-www:/app/install-www   # 发版后 sync-install-cdn.sh 写入
```

## 发版并上传安装包

```bash
FABRIC_INSTALL_BASE=http://172.81.57.29:18081 ./scripts/publish-and-sync-install.sh 1.0.0
```

用户安装：

```bash
curl -fsSL http://172.81.57.29:18081/install.sh | bash
```

## 运行时依赖

| 服务 | 容器内访问 | 说明 |
|------|------------|------|
| PostgreSQL | `host.docker.internal:54321` | `POSTGRES_DSN` |
| 文件存储 | `/app/data/files` | `STORAGE_MODE=local` |

## 健康检查

```bash
curl http://172.81.57.29:18081/healthz
```
