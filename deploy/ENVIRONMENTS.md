# Fabric 部署环境

两套环境**架构不同**，不要混用同一套命令。

| | 测试 · Quick-Box | 生产 · fabricoption.com |
|--|------------------|-------------------------|
| **主机** | `172.81.57.29:22` | `92.205.17.202`（SSH `57122`；不稳定时可走跳板 `23.146.4.16:52322`） |
| **域名** | IP + 端口 | https://fabricoption.com |
| **编排** | Quick-Box Docker（compose 风格） | 1Panel OpenResty 静态站 + 独立 `fabric-api` 容器 |
| **Web** | `fabric-web` 容器 `:18082` | OpenResty `…/index/dist` |
| **API** | `fabric` 容器 `:18081` | `fabric-api`，`--network host`，`:8081` |
| **Table** | QB 有 `fabric-table`（**暂不在此维护**） | 1Panel `/grid/`（**暂不在此维护**） |
| **日常升级** | `./scripts/qb-deploy.sh main` | `./scripts/upgrade-fabricoption-prod.sh`（当前） |
| **QB 服务器** | `172.81.57.29:22` · online | **`Goddady - Fabric`** · `92.205.17.202:57122` · **online** |
| **QB 环境** | `fabric` + `fabric-web` 已配置 | 尚未建 prod 环境（仍走 1Panel + SSH 脚本） |

## 测试环境（172.81.57.29）

Quick-Box project：`7abe3dcb-758f-4614-bf0a-f91ed6086477`

```bash
cp deploy/.env.qb.example deploy/.env.qb   # 填入 QB_API_KEY
./scripts/qb-deploy.sh main               # 仅 fabric + fabric-web
```

验证：

```bash
curl -fsS http://172.81.57.29:18081/healthz
curl -fsSI http://172.81.57.29:18082/ | head -5
```

Deploy hook 与 env ID 见 [QUICKBOX.md](./QUICKBOX.md)。

**注意：** QB 返回 `status: success` 不等于容器健康，需看 deployment 的 `healthcheck` 步骤或自行 curl。

## 生产环境（fabricoption.com）

Quick-Box 已拉通生产机 **Goddady - Fabric**（`92.205.17.202:57122`，server id `46d13aa0-a38c-4194-b02e-2339395bc5ba`）。  
当前 QB 里的 `fabric` / `fabric-web` 环境仍部署在 **172 测试机**；生产站仍是 **1Panel OpenResty 静态目录**，与 QB Docker 栈不同，因此日常升级继续用 SSH 脚本：

- 首次迁移：`scripts/migrate-fabricoption-server.sh`（在服务器上执行，一次性）
- **日常升级**（API + Web，不含 table）：

```bash
cp deploy/.env.prod.example deploy/.env.prod   # SSH 与路径
./scripts/upgrade-fabricoption-prod.sh         # 默认：本地构建 web + 同步 dist
./scripts/upgrade-fabricoption-prod.sh --api   # 额外重启 API 镜像/二进制
```

- 用户自助安装/升级（与生产站无关）：`deploy/install.sh` → `curl get.fabricoption.com/install.sh | bash`

**后续（可选）：** 在 QB 为生产新建 `fabric-prod` / `fabric-web-prod` 环境，`deployServerNames` 指向 `Goddady - Fabric`，并用 `postDeployScript` 把 web 静态同步到 1Panel `index/dist`，或逐步把生产迁到与测试一致的 Docker 反代栈。

## todo-table

本期 **不纳入** 测试/生产升级脚本；QB 上保留 `fabric-table` 环境仅为历史兼容。后续可能拆成独立仓库再接入 QB。

## CI/CD 建议

| 事件 | 测试 (172.81.57.29) | 生产 (fabricoption.com) |
|------|------------------------|-------------------------|
| push `main` | GHA 调 `qb-deploy.sh`（可选） | `upgrade-fabricoption-prod.sh` 或未来 QB prod hook |
| tag `v*` | GHCR + release bundle | 同上 + 按需拉 API 镜像 |

### QB allowed-servers（project `7abe3dcb-…`）

| 名称 | Host | Port | 状态 | 用途 |
|------|------|------|------|------|
| `172.81.57.29` | 172.81.57.29 | 22 | online | 测试 build + deploy |
| `Goddady - Fabric` | 92.205.17.202 | 57122 | online | 生产 build + deploy |
| `92.205.17.202`（旧条目） | 92.205.17.202 | 57122 | offline | 可忽略，用 Goddady 条目 |

QB API Key 放 `deploy/.env.qb`（gitignore），**勿提交仓库**；约 30 天轮换：https://ops.zoom.ci/settings/api-keys
