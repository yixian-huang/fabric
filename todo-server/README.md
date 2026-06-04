# 图片上传服务

这是一个基于Django和MinIO的图片上传和预览服务。

## 功能特点

- 支持图片上传到MinIO对象存储
- 提供图片预览链接生成
- RESTful API接口
- 支持图片管理（查询、删除）

## 项目结构

```
todo-server/                   # 项目根目录
├── apps/                      # 应用集中管理目录
│   ├── __init__.py
│   └── images/                # 图片应用
│       ├── __init__.py
│       ├── admin.py           # 管理界面配置
│       ├── apps.py            # 应用配置
│       ├── models.py          # 数据模型
│       ├── serializers.py     # 序列化器
│       ├── utils.py           # 工具函数
│       ├── views.py           # 视图函数
│       ├── urls.py            # URL配置
│       ├── tests/             # 测试文件目录
│       ├── templates/         # 模板文件
│       │   └── images/
│       └── static/            # 静态文件
│           └── images/
├── fabric/                    # 项目配置目录
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py                # 主URL配置
│   └── settings/              # 分离的设置文件
│       ├── __init__.py
│       ├── base.py            # 基础设置
│       ├── dev.py             # 开发环境配置
│       └── prod.py            # 生产环境配置
├── static/                    # 全局静态文件
├── media/                     # 用户上传文件
├── templates/                 # 全局模板
├── logs/                      # 日志文件目录
├── requirements/              # 依赖管理
│   ├── base.txt               # 基础依赖
│   ├── dev.txt                # 开发环境依赖
│   └── prod.txt               # 生产环境依赖
├── manage.py                  # Django管理脚本
├── .env.example               # 环境变量示例
└── README.md                  # 项目说明
```

## 安装和设置

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/yourusername/todo-server.git
cd todo-server
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
# 安装开发环境依赖
pip install -r requirements/dev.txt
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置必要的环境变量
```

### 3. MinIO设置

确保您已经安装并运行了MinIO服务。默认情况下，配置使用以下参数：

```
MINIO_ENDPOINT = 'localhost:9000'
MINIO_ACCESS_KEY = 'minioadmin'
MINIO_SECRET_KEY = 'minioadmin'
MINIO_BUCKET_NAME = 'images'
MINIO_SECURE = False
```

### 4. 运行迁移

```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. 创建超级用户

```bash
python manage.py createsuperuser
```

### 6. 运行服务

```bash
# 开发环境
python manage.py runserver

# 生产环境
export DJANGO_ENV=production
gunicorn fabric.wsgi:application --bind 0.0.0.0:8000
```

## API使用说明

### 上传图片

**POST** `/api/images/upload/`

**请求体 (multipart/form-data):**
```
title: 图片标题
file: 图片文件
```

**响应:**
```json
{
  "id": 1,
  "title": "示例图片",
  "file_name": "example.jpg",
  "content_type": "image/jpeg",
  "size": 12345,
  "created_at": "2023-07-15T12:30:45Z",
  "url": "http://localhost:9000/images/uuid-filename.jpg?X-Amz-Algorithm=..."
}
```

### 获取所有图片

**GET** `/api/images/`

### 获取单个图片详情

**GET** `/api/images/{id}/`

### 删除图片

**DELETE** `/api/images/{id}/`

## 开发者指南

### 运行测试

```bash
# 运行所有测试
pytest

# 运行特定应用的测试
pytest apps/images/
```

### 代码格式化

```bash
# 使用black格式化代码
black .

# 运行flake8检查代码质量
flake8
```

## 注意事项

- 请确保MinIO服务已经启动并可访问
- 默认图片URL有效期为7天
- 图片内容存储在MinIO中，而元数据保存在数据库中

## 日志系统配置

本项目实现了完善的多环境日志系统，可以帮助开发者在不同环境中获取合适级别的日志信息。

### 日志配置说明

1. **为什么将 `LOGGING` 配置放在 base.py 中**
   
   将基础日志配置放在 `settings/base.py` 中，可以确保所有环境共享相同的基础日志结构，包括格式化器、处理器和基本的记录器设置。这遵循了 "不要重复自己" (DRY) 的原则，同时各环境配置文件可以通过继承和覆盖来定制自己的日志行为。

2. **环境特定的日志配置**

   - **开发环境 (settings/dev.py)**：设置根日志级别为 `DEBUG`，同时启用 SQL 查询日志记录，便于开发调试。
   - **生产环境 (settings/prod.py)**：设置根日志级别为 `WARNING`，减少日志量，仅记录重要信息。同时使用轮转文件处理器确保日志文件不会无限增长。

3. **如何在不同环境切换日志级别**

   通过设置 `DJANGO_SETTINGS_MODULE` 环境变量来切换配置文件：
   
   ```bash
   # 开发环境
   export DJANGO_SETTINGS_MODULE=fabric.settings.dev
   
   # 生产环境
   export DJANGO_SETTINGS_MODULE=fabric.settings.prod
   ```

### 日志目录设置

确保日志目录存在并具有适当的权限：

```bash
# 创建日志目录
mkdir -p logs

# 设置适当的权限
chmod 750 logs
```

在生产环境中，请确保运行 Django 的用户对 `logs` 目录有写入权限。

### 如何验证日志配置

1. **控制台日志**：
   
   运行 Django 开发服务器，观察控制台输出：
   
   ```bash
   python manage.py runserver
   ```

2. **文件日志**：
   
   查看日志文件内容：
   
   ```bash
   tail -f logs/django.log
   ```

3. **示例代码**：

   在视图或其他代码中使用日志记录器：
   
   ```python
   import logging
   
   # 获取应用的日志记录器
   logger = logging.getLogger("myapp")
   
   # 记录不同级别的日志
   logger.debug("调试信息")
   logger.info("普通信息")
   logger.warning("警告信息")
   logger.error("错误信息")
   
   # 记录异常
   try:
       # 可能引发异常的代码
       result = 1 / 0
   except Exception as e:
       logger.error("发生异常", exc_info=True)
   ```

通过这些配置，你可以在开发过程中获得详细的调试信息，同时在生产环境中仅记录重要的警告和错误，从而优化性能和存储空间使用。 