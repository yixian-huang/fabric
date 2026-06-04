#!/bin/bash
set -e

echo "==================== 容器启动 ===================="
echo "当前工作目录: $(pwd)"
echo "列出当前目录文件:"
ls -la

# 确保当前目录在Python路径中
export PYTHONPATH=$PYTHONPATH:/app
echo "PYTHONPATH: $PYTHONPATH"

# 打印Python路径
echo "Python路径信息:"
python -c "import sys; print(sys.path)"

# 检查是否可以导入settings模块
echo "尝试导入fabric.settings:"
python -c "import fabric.settings; print('成功导入fabric.settings')" || echo "导入失败"

# echo "==================== 数据库迁移 ===================="
# 执行数据库迁移
# python manage.py migrate

echo "==================== 启动应用 ===================="
# 验证WSGI模块是否可导入 (可选)
# python -c "import fabric.wsgi; print('成功导入fabric.wsgi')" || exit 1 # 如果失败则退出

# 启动 Gunicorn 服务
# 确保 gunicorn 在 requirements/prod.txt 中
# --workers 数量可以根据 CPU 调整
exec gunicorn fabric.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --log-level info \
    --access-logfile '-' \
    --error-logfile '-'

# 移除 runserver 命令
# exec python manage.py runserver 0.0.0.0:8000

# 如果上面的失败，尝试直接使用gunicorn
# exec gunicorn --pythonpath /app --bind 0.0.0.0:8000 mysite.wsgi:application 