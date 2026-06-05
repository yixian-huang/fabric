# 构建阶段
FROM node:18-alpine as build-stage

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制 package.json
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install

# 复制项目文件
COPY . .

ARG VITE_API_BASE_URL=/api
ENV NODE_ENV=production
ENV VITE_I18N_DEBUG=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm run build:no-check


# 生产阶段
FROM nginx:stable-alpine as production-stage

# 复制构建产物到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

# API 反代目标（Docker 桥接默认可达宿主机映射端口；QB 可覆盖为 172.81.57.29）
ENV API_UPSTREAM_HOST=172.81.57.29
ENV API_UPSTREAM_PORT=18081
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"] 