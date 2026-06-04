# 邮件服务使用说明

## 概述

本模块提供了统一的邮件发送服务，支持多种类型的邮件发送，包括邮箱验证、密码重置、欢迎邮件和面料更新通知等。

## 功能特性

- 🎨 **精美的HTML邮件模板** - 支持HTML和纯文本两种格式
- 📧 **多种邮件类型** - 验证邮件、欢迎邮件、通知邮件等
- 🔧 **统一的服务接口** - 简单易用的API
- 📝 **完善的日志记录** - 详细的发送日志和错误处理
- 🎯 **模板化内容** - 使用Django模板系统管理邮件内容

## 支持的邮件类型

### 1. 邮箱验证邮件
用户注册后发送的邮箱验证邮件。

```python
from fabric.apps.base.services import send_verification_email

# 发送验证邮件
success = send_verification_email(user, verification_token)
```

### 2. 欢迎邮件
用户验证邮箱后发送的欢迎邮件。

```python
from fabric.apps.base.services import send_welcome_email

# 发送欢迎邮件
success = send_welcome_email(user)
```

### 3. 密码重置邮件
用户申请密码重置时发送的邮件。

```python
from fabric.apps.base.services import send_password_reset_email

# 发送密码重置邮件
success = send_password_reset_email(user, reset_token)
```

### 4. 面料更新通知
向订阅用户发送新面料上线通知。

```python
from fabric.apps.base.services import send_fabric_update_notification

# 准备面料信息
fabric_info = {
    'code': 'FAB001',
    'reference_code': 'REF001',
    'components': '100% Cotton',
    'weight': 150,
    'weight_unit': 'gsm',
    # ... 其他信息
}

# 获取订阅用户
users = User.objects.filter(email_subscription=True, email_verified=True)

# 发送通知
result = send_fabric_update_notification(users, fabric_info)
print(f"成功发送: {result['success_count']}, 失败: {result['failed_count']}")
```

## 邮件模板

邮件模板位于 `todo-server/fabric/templates/emails/` 目录下：

```
templates/emails/
├── verification_email.html          # 验证邮件HTML模板
├── verification_email.txt           # 验证邮件文本模板
├── welcome_email.html               # 欢迎邮件HTML模板
├── welcome_email.txt                # 欢迎邮件文本模板
├── password_reset_email.html        # 密码重置HTML模板
├── password_reset_email.txt         # 密码重置文本模板
├── fabric_update_notification.html  # 面料通知HTML模板
└── fabric_update_notification.txt   # 面料通知文本模板
```

### 模板变量

每个模板都可以使用以下变量：

#### 通用变量
- `site_name`: 网站名称
- `user`: 用户对象
- `username`: 用户名

#### 验证邮件变量
- `verification_url`: 验证链接
- `expires_hours`: 过期时间（小时）

#### 密码重置邮件变量
- `reset_url`: 重置链接
- `expires_hours`: 过期时间（小时）

#### 面料通知邮件变量
- `fabric_info`: 面料信息对象
- `unsubscribe_url`: 取消订阅链接

## 配置说明

### 1. 邮件服务器配置

在 `settings/base.py` 中配置邮件服务器：

```python
# 邮件配置
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@gmail.com'
EMAIL_HOST_PASSWORD = 'your-app-password'
DEFAULT_FROM_EMAIL = 'DAILY SILK FABRIC HUB <your-email@gmail.com>'
```

### 2. 前端URL配置

确保设置了正确的前端URL：

```python
FRONTEND_URL = 'http://localhost:3000'  # 开发环境
# FRONTEND_URL = 'https://yourdomain.com'  # 生产环境
```

## 管理命令

### 发送面料更新通知

使用管理命令批量发送面料更新通知：

```bash
# 实际发送
python manage.py send_fabric_notifications --fabric-id <fabric_id>

# 预览模式（不实际发送）
python manage.py send_fabric_notifications --fabric-id <fabric_id> --dry-run
```

## 开发和测试

### 开发环境配置

在开发环境中，可以使用控制台邮件后端来查看邮件内容：

```python
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

### 测试环境配置

在测试中，可以使用内存邮件后端：

```python
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
```

## 错误处理

邮件服务包含完善的错误处理机制：

- 发送失败会记录详细的错误日志
- 返回明确的成功/失败状态
- 批量发送时会统计成功和失败的数量
- 不会因为邮件发送失败而影响主要业务流程

## 日志记录

所有邮件发送操作都会记录日志：

```python
import logging
logger = logging.getLogger(__name__)

# 成功日志
logger.info(f"验证邮件已发送给用户 {user.username} ({user.email})")

# 错误日志
logger.error(f"发送验证邮件失败: {str(e)}, 用户: {user.username}")
```

## 最佳实践

1. **异步发送**: 在生产环境中建议使用 Celery 等任务队列异步发送邮件
2. **发送限制**: 实施邮件发送频率限制，防止滥用
3. **模板维护**: 定期检查和更新邮件模板，确保链接和内容的准确性
4. **监控**: 监控邮件发送成功率和错误率
5. **测试**: 在不同邮件客户端中测试邮件显示效果

## 扩展功能

如需添加新的邮件类型：

1. 在 `EmailService` 类中添加新的静态方法
2. 创建对应的HTML和文本模板
3. 在 `__init__.py` 中导出新的便利函数
4. 更新此文档

示例：

```python
@staticmethod
def send_order_confirmation_email(user, order_info):
    """发送订单确认邮件"""
    # 实现邮件发送逻辑
    pass
```
