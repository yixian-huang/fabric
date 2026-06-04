"""
生产环境设置
"""

from .base import *
import os
import stat

# 生产环境日志配置 - 继承基础配置并修改根日志级别为WARNING
LOGGING['root'] = {
    'handlers': ['console', 'file'],
    'level': 'WARNING',  # 生产环境只记录WARNING及以上级别的日志
}

# 为关键应用保留更详细的日志级别
LOGGING['loggers'].update({
    'django.security': {
        'handlers': ['console', 'file'],
        'level': 'INFO',  # 安全相关日志保持INFO级别
        'propagate': False,
    },
})

# 生产环境设置
DEBUG = False

# 生产环境安全设置
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', SECRET_KEY)

# 启用HTTPS设置
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# 使用PostgreSQL数据库
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'fabric'),
        'USER': os.environ.get('DB_USER', 'fabric'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'dkHzk45HhwmfiyC4'),
        'HOST': os.environ.get('DB_HOST', '37.114.52.157'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# 使用whitenoise管理静态文件
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# MinIO生产环境配置
MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT', 'fs.coagent.work')
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY', 'G31wkDvXqZNkF5FlNcdf')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY', 'SBTxwkIk3gCkLCmOFfX1HjiFFMkZlgMjPJRcaGmC')
MINIO_BUCKET_NAME = os.environ.get('MINIO_BUCKET_NAME', 'fabric')
MINIO_SECURE = True  # 生产环境使用HTTPS
OSS_ENDPOINT = os.environ.get('OSS_ENDPOINT', 'https://fabricoption.com')

# 增强文件日志记录器的安全性
LOGGING['handlers']['file'].update({
    'backupCount': 5,  # 保留5个备份文件
    'maxBytes': 10485760,  # 10MB
    'class': 'logging.handlers.RotatingFileHandler',  # 使用轮转文件处理器
})

# 生产环境中确保日志目录权限正确
log_path = os.path.join(BASE_DIR, 'logs')
if os.path.exists(log_path):
    os.chmod(log_path, stat.S_IRWXU | stat.S_IRGRP | stat.S_IXGRP)  # 设置权限为750

# CORS 配置
CORS_ALLOWED_ORIGINS = [
    "https://todo.dev.cx",  # 允许你的前端源
    "https://todoa.dev.cx",
]

ALLOWED_HOSTS = [
    "s.dailysilkfashion.com",
    "todoa.dev.cx",
    "localhost",
    "127.0.0.1",
    "23.146.72.239",
    'fabricoption.com',
]

CSRF_TRUSTED_ORIGINS = [
    'http://127.0.0.1:8000',
    "https://todo.dev.cx",  # 允许你的前端源
    "https://todoa.dev.cx",
]

# 或者，如果你想允许所有源（开发时可以，生产环境慎用）:
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_ALL_HEADERS = True

REDIS_HOST = os.environ.get('REDIS_HOST', '127.0.0.1')
REDIS_PORT = os.environ.get('REDIS_PORT', 6379)
REDIS_DB = os.environ.get('REDIS_DB', 0)
REDIS_PASSWORD = os.environ.get('REDIS_PASSWORD', 'redis_4YB6G4')

# （可选）允许凭证（如 cookies）
# CORS_ALLOW_CREDENTIALS = True

# （可选）允许特定的请求头
# CORS_ALLOW_HEADERS = [
#     'accept',
#     'accept-encoding',
#     'authorization',
#     'content-type',
#     'dnt',
#     'origin',
#     'user-agent',
#     'x-csrftoken',
#     'x-requested-with',
# ]