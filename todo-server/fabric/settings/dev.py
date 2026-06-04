"""
开发环境设置
"""

from .base import *

# 开发环境配置

# 开发环境日志配置 - 继承基础配置并修改根日志级别为DEBUG
LOGGING['root'] = {
    'handlers': ['console', 'file'],
    'level': 'DEBUG',  # 开发环境使用DEBUG级别，输出所有日志
}

# 为特定应用设置更详细的日志级别
LOGGING['loggers'].update({
    'django.db.backends': {
        'handlers': ['console'],
        'level': 'DEBUG',  # 在开发环境中记录SQL查询
        'propagate': False,
    },
})

# 开发环境其他设置
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

# —— 以下是让开发环境下不做任何来源限制 ——  
CORS_ALLOW_ALL_ORIGINS = True   # 等价于允许所有 Host


# 开发环境额外应用
INSTALLED_APPS += [
    # 'django_extensions',  # 如果已安装
]
FRONTEND_URL = 'http://localhost:3000'

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "fabric",
        "USER": "postgres",
        "PASSWORD": "123456",
        "HOST": "127.0.0.1",
        "PORT": "5432",
    }
}

# 开发环境中使用Django Debug Toolbar
try:
    import debug_toolbar
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']
except ImportError:
    pass 
