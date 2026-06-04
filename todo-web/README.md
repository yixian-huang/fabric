# 项目管理系统

基于 Vue 3 + Element Plus + Tailwind CSS + Pinia + Vite 的前端项目管理系统。

## 功能特点

- 项目管理：创建和管理项目，添加任务，跟踪进度
- 模板管理：创建和管理项目模板，快速应用到新项目
- 供应商管理：管理供应商信息和合作状态
- 支持列表视图和看板视图
- 自定义字段和筛选功能
- 响应式设计，适配不同设备

## 技术栈

- Vue 3：前端框架
- TypeScript：类型系统
- Vite：构建工具
- Pinia：状态管理
- Element Plus：UI组件库
- Tailwind CSS：原子化CSS框架
- Vue Router：路由管理

## 安装与运行

```bash
# 安装依赖
npm install

# 开发环境运行
npm run dev

# 构建生产环境
npm run build

# 预览生产环境构建
npm run preview
```

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # 公共组件
├── layout/          # 布局组件
├── router/          # 路由配置
├── stores/          # Pinia状态
├── utils/           # 工具函数
└── views/           # 页面视图
    ├── project/     # 项目管理
    ├── template/    # 模板管理
    └── supplier/    # 供应商管理
```

## 开发指南

### 添加新页面

1. 在 `src/views` 目录下创建新的页面目录和组件
2. 在 `src/router/index.ts` 添加路由配置
3. 如果需要状态管理，在 `src/stores` 添加相应的 Pinia store

## 贡献

欢迎提交问题和功能需求，或者直接提交Pull Request。

## 许可证

MIT 