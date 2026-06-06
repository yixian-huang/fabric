# Quick-Box AI Handoff 优化建议

> 来自 Fabric 项目（`7abe3dcb-758f-4614-bf0a-f91ed6086477`）的实际部署经验。  
> 目标：让 AI Handoff 能描述**非标准、多环境、异构编排**的部署，使 onboarding 后可直接「一键新建环境 + 部署」，而非每次靠 Agent 读仓库猜架构。

---

## 1. 背景：Fabric 的复杂度（Handoff 目前覆盖不足）

| 维度 | 测试 | 生产 |
|------|------|------|
| 服务器 | `172.81.57.29:22` | `Goddady - Fabric` · `92.205.17.202:57122` |
| 编排 | QB Docker（API + Web 容器） | 1Panel OpenResty 静态站 + `fabric-api` host 网络 |
| Web 落地 | 容器 `:18082` | 宿主机 `…/index/dist`（非容器内 nginx） |
| 服务数 | `fabric` + `fabric-web`（table 暂不维护） | 同上 + 已有 OpenResty 反代规则 |
| 升级路径 | deploy hook | 目前需 SSH 同步 dist 或未来 QB postDeploy |

当前 Handoff 输出仍是通用 onboarding brief（conventions → init-project → deploy hook），**未表达**：

- 同一 project 下多环境角色（test / prod）
- 各环境对应的 `deployServerNames`、端口、健康检查 URL
- 非 Docker 静态资源路径、postDeploy 同步需求
- 哪些服务在本期 in-scope / out-of-scope

AI 只能反复调 API 试探，或读仓库 `deploy/ENVIRONMENTS.md` 补全——Handoff 应成为**单一事实来源**。

---

## 2. 建议：扩展 `GET /projects/:id/ai-handoff` 结构

### 2.1 增加「部署拓扑」区块（machine-readable + markdown）

```yaml
deploymentTopology:
  monorepo: true
  repo: https://github.com/yixian-huang/fabric.git
  services:
    - slug: fabric
      dockerfile: todo-server-go/Dockerfile
      buildContext: todo-server-go
      inScope: true
    - slug: fabric-web
      dockerfile: todo-web/Dockerfile
      buildContext: todo-web
      inScope: true
    - slug: fabric-table
      inScope: false
      reason: "后期独立仓库维护"
  environments:
    - name: test
      displayName: 172 测试机
      serverRef: ce9808e6-ff4d-455a-8ecc-5e65298ffc31
      orchestration: docker_compose_like
      services: [fabric, fabric-web]
      healthChecks:
        fabric: http://172.81.57.29:18081/healthz
        fabric-web: http://172.81.57.29:18082/
      deployHooks:
        fabric: /deploy-hooks/{projectId}/fabric
        fabric-web: /deploy-hooks/{projectId}/fabric-web
    - name: production
      displayName: fabricoption.com
      serverRef: 46d13aa0-a38c-4194-b02e-2339395bc5ba
      orchestration: hybrid_openresty_static
      domain: https://fabricoption.com
      services:
        fabric:
          runtime: docker_host_network
          port: 8081
          healthCheck: https://fabricoption.com/api/healthz
        fabric-web:
          runtime: static_sync
          hostPath: /opt/1panel/.../index/dist
          postDeploy: "extract image or rsync dist"
      status: server_online_env_not_created
      blockers:
        - "需 init fabric-prod / fabric-web-prod 或 postDeploy 同步到 OpenResty"
```

AI 读到 `orchestration: hybrid_openresty_static` 后应**停止**假设「所有环境都是标准 Docker port map」。

### 2.2 区分「服务器已连通」与「环境已配置」

`allowed-servers` 已有 `online/offline`，建议 Handoff 显式汇总：

```json
{
  "serverConnectivity": {
    "Goddady - Fabric": { "status": "online", "environmentsBound": [] }
  },
  "environmentReadiness": {
    "test": { "ready": true, "missing": [] },
    "production": { "ready": false, "missing": ["fabric-prod env", "fabric-web-prod env"] }
  }
}
```

避免 AI 看到 server online 就误以为「可以 `./qb-deploy.sh` 更新生产」。

### 2.3 内联现有环境快照（含 env ID、hook 是否启用）

Handoff 目前只列环境名列表。建议附带：

- `environmentId`
- `deployHookEnabled` / `deployHookUrl`（若启用）
- `buildServerId` / 实际 `deployServerNames`
- `healthCheckUrl`（及是否会导致误报失败）
- `lastDeployStatus` + `lastDeployId`

减少 AI 额外请求 `GET /environments` 再拼装。

### 2.4 项目级「AI 操作剧本」（playbook）

除通用 Workflow 外，允许项目在 QB 控制台或仓库 `.quickbox/handoff.yaml` 中定义：

```yaml
playbooks:
  deploy_test:
    steps:
      - post: /deploy-hooks/{projectId}/fabric
      - post: /deploy-hooks/{projectId}/fabric-web
    verify:
      - curl http://172.81.57.29:18081/healthz
  deploy_production_web:
    when: env.production.ready == false
    humanApproval: true
    steps:
      - run: scripts/upgrade-fabricoption-prod.sh
    note: "生产 Web 走 OpenResty 静态目录，暂不用 hook"
  bootstrap_production_qb:
    when: env.production.ready == false
    steps:
      - initEnvironment: fabric-prod
      - initEnvironment: fabric-web-prod
```

Handoff 返回 `recommendedPlaybook: deploy_test`，AI 不必从 monorepo 文档反推。

---

## 3. 建议：`init-project` / 环境 API 增强

### 3.1 支持「异构 runtime」模板

除 `deployMethod: docker` 外，增加枚举或扩展字段：

| `runtime` | 含义 |
|-----------|------|
| `docker` | 现有行为 |
| `static_path` | 构建物同步到宿主机路径（OpenResty / CDN） |
| `docker_host_network` | 生产 API 常见 |
| `compose_stack` | 多服务一次 init |

`postDeployScript` 在 Handoff conventions 里应说明：**可用变量**（`$DEPLOY_HOST`、`$IMAGE`、`$STATIC_PATH`）。

### 3.2 多环境 init 一次提交

```json
POST /projects/:id/environments/batch-init
{
  "environments": [
    { "name": "fabric-prod", "serverRef": "...", "template": "fabric", "overrides": { "ports": ["8081:8080"], "network": "host" } },
    { "name": "fabric-web-prod", "runtime": "static_path", "staticPath": "/opt/1panel/.../index/dist", "buildFrom": "fabric-web" }
  ]
}
```

避免 AI 对同一 project 多次猜 init body。

### 3.3 环境「克隆 / 派生」

从 `fabric`（测试）克隆为 `fabric-prod`，仅改：

- `deployServerNames`
- `healthCheckUrl`
- `buildArgs`（如 `VITE_API_BASE_URL=https://fabricoption.com/api`）
- `volumes` / `network`

---

## 4. 建议：Handoff 文档与 AI 约束

### 4.1 按 orchestration 类型分支 brief

Handoff 正文不应只有一套 Workflow。建议：

- **Standard Docker**：现有 5 步
- **Hybrid Static**：强调 postDeploy、OpenResty、勿假设 container port
- **Monorepo Multi-service**：列出 in-scope slugs，默认 deploy 顺序

### 4.2 明确「AI 不应做」清单

Fabric 场景示例：

- 勿对生产调用测试机的 deploy hook
- 勿在 bulk PATCH env 时覆盖未列出的 secret
- 勿将 `status: success` 当作健康结论
- 勿 deploy `fabric-table`（项目标记 out-of-scope）

### 4.3 关联仓库文档（可选）

```json
{
  "repoDocs": [
    { "path": "deploy/ENVIRONMENTS.md", "role": "environment_matrix" },
    { "path": "deploy/QUICKBOX.md", "role": "qb_hooks" }
  ]
}
```

Handoff 仍应以 QB 数据为准，仓库文档为补充。

---

## 5. 建议：Deploy 可观测性

| 现状痛点 | 建议 |
|----------|------|
| success ≠ healthy | Handoff 置顶；deployment 返回 `healthcheck.passed` 布尔 |
| 跨机构建+传 dist 慢 | deployment 展示 build / transfer / deploy 分阶段耗时 |
| 失败难定位 | `/logs` 按 step 分段；Handoff 给出最近一次失败 deployment id |
| 多服务 deploy | `POST /deploy-hooks/:projectId/_batch` body: `{ gitRef, services: ["fabric","fabric-web"] }` |

---

## 6. 建议：Secrets 与 env 变量 UX

已有单 key PATCH 很好。Handoff 可补充：

- 每个环境**必需变量清单**（名 + 是否 secret + 描述），未设置则 `environmentReadiness.ready=false`
- 示例：`POSTGRES_DSN`、`JWT_SECRET`、`REDIS_PASSWORD`（Fabric 生产曾遇 NOAUTH）

---

## 7. 验收标准（QB 优化完成后，Fabric 侧期望）

AI 仅读 Handoff + conventions，即可：

1. 判断测试 / 生产各自是否可 deploy
2. 对测试执行：`fabric` + `fabric-web` hook，并 curl 正确 health URL
3. 对生产：若 `hybrid`，走 playbook `deploy_production_web` 或执行 batch-init 后 hook + postDeploy
4. **不** deploy table、**不**把 172 的 hook 打到 202
5. 新建 prod 环境时，init body 从 Handoff 模板生成，无需读 monorepo 脚本

---

## 8. 联系方式 / 试点

- 试点项目：Fabric · `7abe3dcb-758f-4614-bf0a-f91ed6086477`
- 典型异构点：1Panel OpenResty 静态 Web + host 网络 API + 双服务器 test/prod
- 仓库参考：`deploy/ENVIRONMENTS.md`、`scripts/qb-deploy.sh`、`scripts/upgrade-fabricoption-prod.sh`

欢迎 QB 团队在 Handoff schema 定稿后，我们配合在 Fabric 仓库添加 `.quickbox/handoff.yaml` 做端到端验证。

---

## 9. Round 2 验证反馈（Handoff JSON 已上线）

**验证日期：** 2026-06-06 · **项目：** Fabric `7abe3dcb-…`

### 已改善（感谢）

- `GET .../ai-handoff?format=json` 提供 `deploymentTopology`、`serverConnectivity`、`environmentReadiness`、环境快照、`playbooks`、`integration-snippets` URL — **显著减少 AI 猜架构**
- `integration-snippets` 可直接拿到 init/deploy curl，实测 deploy hook **可用**
- 测试机 `fabric` + `fabric-web` deploy ~30s，healthCheck 200

### 仍待修复

| 项 | 现象 | 建议 |
|----|------|------|
| readiness 误报 | 三个环境 `ready=false`（缺 deployTrigger），但 hook deploy **成功** | readiness 与 hook 可用性对齐，或在 hook 可用时 `ready=true` |
| PATCH deployHook | `PATCH /environments/{id}` + `deployHookEnabled` → 422 `UNKNOWN_FIELDS` | 文档/playbook 要求 fix deployTrigger，但 API 无对应字段 |
| 生产未建模 | `Goddady - Fabric` online，`environmentsBound=[]` | 支持 prod 环境 + `hybrid_openresty` orchestration |
| inScope | `fabric-table` 仍为 `inScope: true` | 项目级 override（如 `.quickbox/handoff.yaml`） |
| repoDocs | 返回 `[]` | 允许链到 `deploy/ENVIRONMENTS.md` |
| 批量 deploy | 多服务需多次 POST | `POST /deploy-hooks/{pid}/_batch` 或 playbook 内可执行 step 类型 |

### Fabric 侧后续

- 已将 `scripts/qb-handoff.sh` 接入 JSON Handoff（commit `3eed879` 起）
- push `main` 后执行 `./scripts/qb-handoff.sh main` 即可让 QB 构建含详情页修复的最新代码
