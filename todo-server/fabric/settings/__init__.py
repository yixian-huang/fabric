"""
根据环境变量选择配置文件
"""

import os
import logging

# 根据环境变量选择配置
environment = os.environ.get('DJANGO_ENV', 'development').lower()


logging.info(f"========== Environment: {environment}")

if environment == 'production':
    from .prod import *
else:
    from .dev import * 

# from .prod import *