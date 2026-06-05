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
ARG VITE_BASE_PATH=/grid/
ENV NODE_ENV=production
ENV VITE_I18N_DEBUG=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN pnpm run build


# 生产阶段
FROM nginx:stable-alpine as production-stage

# 复制构建产物到 Nginx 目录
COPY --from=build-stage /app/dist /usr/share/nginx/html

ENV API_UPSTREAM=http://host.docker.internal:18081
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 暴露 80 端口
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"] 