FROM python:3.13-slim

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=fabric.settings
ENV PYTHONPATH=/app

# 安装系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 安装Python依赖
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 复制entrypoint脚本 - 先复制它确保它存在
COPY entrypoint.sh /app/entrypoint.sh
# 使用更安全的方式设置权限
RUN chmod 755 /app/entrypoint.sh && \
    # 显示权限以验证
    ls -la /app/entrypoint.sh

# 复制项目文件
COPY . /app/

# 确保静态文件目录存在
RUN mkdir -p /app/staticfiles

# 调试Python导入
RUN echo "检查Python路径:" && \
    python -c "import sys; print(sys.path)" && \
    echo "检查是否可以导入settings:" && \
    python -c "import fabric.settings; print('成功导入fabric.settings')" || echo "导入失败，但继续构建"

# 输出调试信息
RUN ls -la /app && \
    echo "检查关键文件是否存在:" && \
    test -f /app/manage.py && echo "manage.py存在" || echo "manage.py不存在" && \
    test -f /app/entrypoint.sh && echo "entrypoint.sh存在" || echo "entrypoint.sh不存在" && \
    # 再次确认entrypoint.sh有执行权限
    ls -la /app/entrypoint.sh

# 暴露端口
EXPOSE 8000

# 设置入口点
ENTRYPOINT ["/app/entrypoint.sh"] 