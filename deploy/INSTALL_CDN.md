# 用自有服务器做 Fabric 官方安装源

目标：用户在你机器（例如 Quick-Box `172.81.57.29`）上下载 `install.sh`，在**他们自己的 Docker 环境**里一键安装；业务仍从 **GHCR** 拉镜像，不是你的 QB API 端口。

## 架构

```
你的服务器 172.81.57.29
├── :18090  fabric-cdn (nginx)     ← 只托管 install.sh + releases/*
├── :18081  fabric-api (QB 演示)   ← 可选，与安装分发无关
├── :18082  fabric-web
└── :18083  fabric-table

用户机器
  curl http://172.81.57.29:18090/install.sh | bash
    → 下载 manifest / compose
    → docker pull ghcr.io/yixian-huang/fabric-* 
    → 用户本机 compose up（独立一套 Postgres/Minio/网关）
```

## 一次性：在发布机上起 CDN

SSH 到 `172.81.57.29`：

```bash
mkdir -p /opt/fabric-cdn/www
cd /path/to/fabric   # 或只拷贝 deploy/cdn 目录
INSTALL_CDN_DIR=/opt/fabric-cdn/www INSTALL_CDN_PORT=18090 \
  docker compose -f deploy/cdn/docker-compose.yml up -d
```

防火墙放行 **18090**（仅静态文件，无敏感业务数据）。

## 每次发版（维护者）

### 1. 构建并推送镜像（GitHub 推荐）

```bash
git tag v1.0.0 && git push origin v1.0.0
# Actions: .github/workflows/release.yml → GHCR
```

或本地：

```bash
./scripts/publish-release.sh 1.0.0 --push
```

### 2. 打包安装清单（install_base 指向你的 CDN）

```bash
FABRIC_INSTALL_BASE=http://172.81.57.29:18090 \
FABRIC_REGISTRY=ghcr.io/yixian-huang \
  ./scripts/publish-release.sh 1.0.0 --bundle-only
```

### 3. 上传到发布机

```bash
FABRIC_INSTALL_BASE=http://172.81.57.29:18090 \
INSTALL_CDN_SSH=root@172.81.57.29 \
INSTALL_CDN_DIR=/opt/fabric-cdn/www \
  ./scripts/sync-install-cdn.sh
```

### 4. 自检

```bash
curl -fsSL http://172.81.57.29:18090/healthz
curl -fsSL http://172.81.57.29:18090/releases/latest/manifest.json | head
curl -fsSL http://172.81.57.29:18090/install.sh | head -5
```

## 发给用户的官方命令

```bash
curl -fsSL http://172.81.57.29:18090/install.sh | bash
```

非交互、指定端口：

```bash
curl -fsSL http://172.81.57.29:18090/install.sh | bash -s -- --port 8088 -y
```

安装完成后用户访问 **自己机器** 的 `http://<他的IP>:8088/`，不是你的 18081/82/83。

## GHCR 镜像必须可拉

在 https://github.com/yixian-huang/fabric/packages 将 `fabric-api` / `fabric-web` / `fabric-table` 设为 **Public**，或文档中说明 `docker login ghcr.io`。

私有包时用户需先登录再执行 install。

## 绑定域名（可选）

DNS `get.fabricoption.com` → `172.81.57.29`，CDN 仍用 18090，或反代 443 → 18090。

发版时改：

```bash
FABRIC_INSTALL_BASE=https://get.fabricoption.com
```

用户命令变为：

```bash
curl -fsSL https://get.fabricoption.com/install.sh | bash
```

（需在 443 终止 TLS 的 nginx/caddy 反代到 `127.0.0.1:18090`。）

## 与 Quick-Box 业务环境的关系

| 服务 | 作用 |
|------|------|
| fabric-cdn `:18090` | **分发安装包** |
| fabric / fabric-web / fabric-table | **你的在线演示或自用实例** |

二者可同机共存，互不影响。
