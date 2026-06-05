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
| UI（登录表单） | 视环境 | 视环境 | 0 |
| **合计** | **36+** | **0** | **0** |

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

## 前后端契约修复记录

### 已修复

| 模块 | 问题 | 修复 |
|------|------|------|
| fabrics | 尾斜杠 404 | Go 路由补全；前端 URL 对齐 |
| Grid | `get_rows` 405 / URL 错误 | Go 路由 + 前端 `get_rows?project_id=` |
| Grid | 单元格样式只解析 `style` 字符串 | `gridTransform.ts` 优先 `style_data` |
| Grid | `batch_update` 路由不存在 | 前端改为循环 `PATCH /cells/update` |
| Grid | 隐藏行恢复不更新主表 | `HiddenRowsDialog` 使用 `useGridContext().restoreHiddenRow` |
| Grid | 供应商链接 URL 字段错误 | 使用 `shared_key` + `buildVendorShareUrl` |
| Grid | 行分享链接缺密码/供应商参数 | `buildProjectShareUrl` 统一生成 |
| Grid | 共享备注 API 路径错误 | `VendorNoteCell` 区分 `shared` / `vendor-share` |
| Grid | `vendorNote` 内容为单对象 | `parseVendorNotes` 兼容对象与数组 |
| options | `create_option` json tag | Go + 前端 `category_code` 映射 |
| favorites | 列表/分享/count 字段 | 前端解析 `data.items` / `favorite_count` |
| todo-table 登录 | 拦截器 envelope | `auth.ts` 使用 `unwrapApiData` |
| todo-web 供应商 | 页面 mock 数据 | `api/vendor.ts` + `supplier/index.vue` 对接 Go vendors API |
| todo-web 面料幅宽等 | Go 缺字段 | 迁移 `000006` + `width/yarn_count/density` |
| todo-web 收藏分享链 | 后端 host 为 API 端口 | `resolveFavoriteShareUrl` 优先前端 origin |
| todo-web 邮箱验证 | 误判 `response.data.code` | `VerifyEmail.vue` 读顶层 `code` |
| todo-web 用户/me | 登录后未拉 profile | `user.ts` + `unwrapData` 对齐 `/base/auth/me` |
| todo-table 代理 | 跨域 | `vite.config` `/api` 代理 |
| todo-web | setup 重定向阻塞登录 | 路由豁免 `/login`、`/share/*` |

### 待观察（环境相关）

- **e2e_tester 账号**：本地库无该用户时登录 E2E 返回 401，需先注册或 seed
- **setup 流程**：全新库 `setup_required: true` 时需先完成 setup 或使用已有用户 token 注入测试

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
