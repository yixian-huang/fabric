"""
邮件配置示例文件
复制此文件并重命名为 email_settings.py，然后根据实际情况修改配置
"""

# Gmail SMTP 配置示例
GMAIL_SMTP_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
    'EMAIL_HOST': 'smtp.gmail.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'your-email@gmail.com',
    'EMAIL_HOST_PASSWORD': 'your-app-password',  # 使用应用专用密码
    'DEFAULT_FROM_EMAIL': 'DAILY SILK FABRIC HUB <your-email@gmail.com>',
}

# 腾讯企业邮箱配置示例
TENCENT_SMTP_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
    'EMAIL_HOST': 'smtp.exmail.qq.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'your-email@yourcompany.com',
    'EMAIL_HOST_PASSWORD': 'your-password',
    'DEFAULT_FROM_EMAIL': 'DAILY SILK FABRIC HUB <your-email@yourcompany.com>',
}

# 阿里云企业邮箱配置示例
ALIYUN_SMTP_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
    'EMAIL_HOST': 'smtp.mxhichina.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'your-email@yourcompany.com',
    'EMAIL_HOST_PASSWORD': 'your-password',
    'DEFAULT_FROM_EMAIL': 'DAILY SILK FABRIC HUB <your-email@yourcompany.com>',
}

# 开发环境配置（邮件输出到控制台）
DEVELOPMENT_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.console.EmailBackend',
}

# 测试环境配置（邮件保存到内存）
TEST_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.locmem.EmailBackend',
}

# 生产环境推荐配置
PRODUCTION_CONFIG = {
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
    'EMAIL_HOST': 'your-smtp-server.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_HOST_USER': 'your-email@yourcompany.com',
    'EMAIL_HOST_PASSWORD': 'your-secure-password',
    'DEFAULT_FROM_EMAIL': 'DAILY SILK FABRIC HUB <noreply@yourcompany.com>',
    'EMAIL_TIMEOUT': 30,  # 邮件发送超时时间（秒）
}

"""
使用说明：

1. 创建 email_settings.py 文件
2. 从上述配置中选择一个适合的配置
3. 在 settings/dev.py 或 settings/prod.py 中导入并应用：

from .email_settings import GMAIL_SMTP_CONFIG
locals().update(GMAIL_SMTP_CONFIG)

或者直接在设置文件中定义：

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
# ... 其他配置

安全注意事项：
- 不要将邮件密码直接写在代码中
- 使用环境变量存储敏感信息
- Gmail 需要使用应用专用密码，不能使用普通密码
- 生产环境建议使用专门的邮件服务提供商
"""
