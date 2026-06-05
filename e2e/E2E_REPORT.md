# Fabric 全栈 E2E 测试报告

**执行时间**: 2026-06-04  
**环境**: 本地  
**API**: `http://127.0.0.1:8000`（`todo-server-go`，`STORAGE_MODE=local`）  
**前端**: `todo-web` `:3000`，`todo-table` `:5173`  
**数据库**: `postgres@127.0.0.1:55432/fabric`  
**测试账号**: `e2e_tester` / `E2eTest123!`

## 汇总

| 类别 | 通过 | 失败 | 跳过 |
|------|------|------|------|
| API（Playwright request） | 33 | 0 | 0 |
| UI（token 注入 + 页面导航） | 3 | 0 | 0 |
| UI（登录表单，已知问题） | 0 | 0 | 2 |
| **合计** | **36** | **0** | **2** |

HTML 报告路径: `e2e/playwright-report/index.html`

## 覆盖范围

### 图片
- `POST /api/base/images/upload/` 上传
- `GET /api/base/images/download_file` 下载
- 未授权上传返回 401

### 面料（fabrics）
- 选项 `create_option` / `update_option` / `delete_option`
- 供应商 CRUD
- 面料创建 / 列表 / 详情 / 更新 / 收藏 / 删除
- `check_fabric_code`、`get_options`、`list_public`、`visitor_stats`、`record_visit`

### Todo / Grid
- 默认 Todo 项目 `GET /api/grid/projects/todo`
- 项目 CRUD
- 列 CRUD
- 行创建 / `get_rows` / 隐藏切换 / 删除
- 单元格 `PATCH /api/grid/cells/update`

### 认证与系统
- `GET /healthz`
- 登录、`/api/base/auth/me`、`favorite-count`
- `GET /api/base/setup/status`
- 公开列表、访客记录、注册

### UI 冒烟
- todo-web：`/fabric`、`/menu/supplier`、`/fabric/add`（API token 注入）
- todo-table：`/`、`/todo`（API token 注入）

## 发现的问题（API / 前端契约）

### 已修复（P0）

1. **面料尾斜杠 404** — Go `fabrics/binder.go` 为 `{fabric_id}` 的 GET/PUT/PATCH/DELETE 增加带 `/` 路由，与 vendors 一致；前端 `fabric.ts` 无需改动。
2. **`get_rows` 405** — Go 增加 `GET /rows/get_rows/`；`todo-table` `projectService.ts` 改为 `get_rows?project_id=...`（去掉 `?` 前多余 `/`）。

### 待处理

3. **`POST /api/fabrics/create_option` JSON 字段**  
   `OptionInput` 无 `json` tag，仅接受 PascalCase（`CategoryCode`、`OptionName`）；前端若发 `category_code` 会报 `category_code and option_name are required`。

4. **todo-table 登录**  
   `auth.ts` 从 `response.data` 解构 `token`，但 axios 拦截器返回 `{ data: ... }`，表单登录无法写入 `localStorage`（E2E 已 `fixme` 记录）。

5. **todo-web 首次 setup**  
   `setup_required: true` 时路由会重定向到 `/setup`，阻塞 `/login` 表单 E2E（已 `fixme`）。

6. **bootstrap admin**  
   库中已有用户时不会创建 `admin`；本地使用注册的 `e2e_tester` 账号。

## 如何复现

```bash
# 1. 依赖
cd todo-server-go && docker compose up -d postgres redis

# 2. API（端口 8000，与前端 .env.development 一致）
cd todo-server-go && \
  HTTP_ADDR=:8000 STORAGE_MODE=local DATA_DIR=.local-data \
  LOCAL_STORAGE_PATH=.local-data/files \
  POSTGRES_DSN='postgres://postgres:postgres@127.0.0.1:55432/fabric?sslmode=disable' \
  REDIS_ADDR=127.0.0.1:6381 JWT_SECRET=dev-e2e-secret \
  BOOTSTRAP_ADMIN_PASSWORD=admin123 \
  go run ./cmd/api

# 3. 前端
cd todo-web && npm run dev      # :3000
cd todo-table && npm run dev -- --port 5173

# 4. 测试
cd e2e && ./scripts/run-e2e.sh
npx playwright show-report
```

## 建议修复优先级

| 优先级 | 项 | 影响 |
|--------|-----|------|
| ~~P0~~ | ~~面料/Grid 尾斜杠~~ | 已修复 |
| ~~P0~~ | ~~get_rows URL~~ | 已修复 |
| P1 | `OptionInput` 增加 json tag | 选项创建失败 |
| P1 | todo-table `auth.ts` 适配拦截器 | 无法表单登录 |
| P2 | setup 完成后或 dev 跳过 setup 重定向 | 本地登录/E2E |
