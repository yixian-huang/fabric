# 官方一键安装（集成在 fabric-api 容器 nginx）

`fabric-api` 镜像内带 **nginx + Go API**：

| 路径 | 说明 |
|------|------|
| `/api/` | 反代到 Go `:8081` |
| `/healthz` | 健康检查 |
| `/install.sh` | 一键安装脚本 |
| `/releases/` | 版本清单与 compose 等 |

对外仍用 Quick-Box 映射端口（例如 **18081**），**不必单独起 18090 CDN**。

## 架构

```
172.81.57.29:18081  →  fabric-api 容器
                         nginx :8080
                           /api/      → Go
                           /install.sh, /releases/  → /app/install-www (卷)
用户本机:
  curl http://172.81.57.29:18081/install.sh | bash
    → pull ghcr.io/yixian-huang/fabric-*
    → 用户自己的 docker compose up
```

## 一次性：挂载安装包目录

Quick-Box 环境 `fabric` 增加卷（与 data 并列）：

```text
/opt/fabric-api/data:/app/data
/opt/fabric-api/install-www:/app/install-www
```

SSH 准备目录：

```bash
mkdir -p /opt/fabric-api/install-www/releases
```

重新 deploy `fabric` 环境（使用含 nginx 的新镜像）。

## 每次发版

```bash
# 1) 打 tag → GitHub Actions 构建推送 GHCR（推荐）
git tag v1.0.0 && git push origin v1.0.0

# 2) 打包 + 同步到服务器（也可一条命令）
FABRIC_INSTALL_BASE=http://172.81.57.29:18081 \
INSTALL_CDN_SSH=root@172.81.57.29 \
  ./scripts/publish-and-sync-install.sh 1.0.0

# 3) 若 API 镜像有更新，触发 QB deploy
curl -X POST "https://ops.zoom.ci/api/v1/deploy-hooks/<projectId>/fabric" \
  -H "X-API-Key: $QB_API_KEY" -H "Content-Type: application/json" \
  -d '{"gitRef":"main"}'
```

自检：

```bash
curl -fsSL http://172.81.57.29:18081/healthz
curl -fsSL http://172.81.57.29:18081/releases/latest/manifest.json | head
```

## 发给用户的命令

```bash
curl -fsSL http://172.81.57.29:18081/install.sh | bash
```

## GHCR

`fabric-api` / `fabric-web` / `fabric-table` 需对用户 **可 pull**（Public 或文档说明 login）。

## 独立 CDN（可选）

`deploy/cdn/docker-compose.yml` 仍可用于单独端口托管；默认推荐本方案（与 API 同端口）。
