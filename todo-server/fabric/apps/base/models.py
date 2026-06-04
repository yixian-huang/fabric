from django.db import models
import uuid
from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
import secrets

class Image(models.Model):
    """图片存储模型"""
    file_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='文件ID')
    title = models.CharField(max_length=200, verbose_name='图片标题')
    file_name = models.CharField(max_length=255, verbose_name='文件名称')
    file_ext = models.CharField(max_length=10, null=True, blank=True, verbose_name='文件扩展名')
    object_name = models.CharField(max_length=255, unique=True, verbose_name='对象存储名称')
    content_type = models.CharField(max_length=100, default='', verbose_name='内容类型')
    size = models.IntegerField(default=0, verbose_name='文件大小(字节)')
    url = models.URLField(max_length=1000, blank=True, null=True, verbose_name='访问URL')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        db_table = 'base_image'
        verbose_name = '图片'
        verbose_name_plural = '图片'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class User(models.Model):
    """用户模型"""
    USER_STATUS_CHOICES = [
        ('active', '活跃'),
        ('inactive', '未激活'),
        ('blocked', '已封禁'),
    ]
    
    # 主键
    user_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='用户ID')
    
    # 认证信息
    username = models.CharField(max_length=100, unique=True, verbose_name='用户名')
    password = models.CharField(max_length=255, verbose_name='密码')
    email = models.EmailField(max_length=255, unique=True, verbose_name='邮箱')
    
    # 基本信息
    nickname = models.CharField(max_length=100, blank=True, null=True, verbose_name='昵称')
    # 状态信息
    status = models.CharField(max_length=20, choices=USER_STATUS_CHOICES, default='inactive', verbose_name='状态')
    
    # 新增字段 - 邮箱验证和订阅
    email_verified = models.BooleanField(default=False, verbose_name='邮箱已验证')
    email_subscription = models.BooleanField(default=False, verbose_name='邮件订阅布料更新')
    verification_token = models.CharField(max_length=100, blank=True, null=True, verbose_name='邮箱验证令牌')
    verification_token_expires = models.DateTimeField(blank=True, null=True, verbose_name='验证令牌过期时间')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    last_login = models.DateTimeField(blank=True, null=True, verbose_name='最后登录时间')
    
    # Django 认证系统所需属性
    @property
    def is_authenticated(self):
        """
        始终返回 True。这是一种告诉用户已通过身份验证的方式。
        """
        return True
        
    @property
    def is_anonymous(self):
        """
        始终返回 False。这是用户未通过身份验证的标志。
        """
        return False
    
    class Meta:
        db_table = 'base_user'
        verbose_name = '用户'
        verbose_name_plural = '用户'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.username
    
    def set_password(self, raw_password):
        """设置密码，对原始密码进行哈希处理"""
        self.password = make_password(raw_password)
    
    def check_password(self, raw_password):
        """验证密码"""
        return check_password(raw_password, self.password)
    
    def save(self, *args, **kwargs):
        # 如果是新用户或密码已修改且未经哈希处理
        if not self.user_id or not self.password.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.set_password(self.password)
        super().save(*args, **kwargs)

    def generate_verification_token(self):
        """生成邮箱验证令牌"""
        self.verification_token = secrets.token_urlsafe(32)
        self.verification_token_expires = timezone.now() + timezone.timedelta(hours=24)
        self.save(update_fields=['verification_token', 'verification_token_expires'])
        return self.verification_token
    
    def verify_email(self, token):
        """验证邮箱"""
        if (self.verification_token == token and 
            self.verification_token_expires and 
            self.verification_token_expires > timezone.now()):
            self.email_verified = True
            self.status = 'active'
            self.verification_token = None
            self.verification_token_expires = None
            self.save(update_fields=['email_verified', 'status', 'verification_token', 'verification_token_expires'])
            return True
        return False

class ConfigKeyEnum:
    """配置键枚举类"""
    TODO_ID = 'todo_id'
    DEFAULT_PROJECT = 'default_project'
    THEME = 'theme'
    LANGUAGE = 'language'
    NOTIFICATION = 'notification'
    
    @classmethod
    def choices(cls):
        """返回所有配置键的选项"""
        return [
            (cls.TODO_ID, '待办事项项目ID'),
            (cls.DEFAULT_PROJECT, '默认项目'),
            (cls.THEME, '主题设置'),
            (cls.LANGUAGE, '语言设置'),
            (cls.NOTIFICATION, '通知设置'),
        ]

class UserConfig(models.Model):
    """用户配置模型"""
    config_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='配置ID')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='configs', verbose_name='用户')
    key = models.CharField(max_length=50, verbose_name='配置键')
    value = models.TextField(blank=True, null=True, verbose_name='配置值')
    description = models.CharField(max_length=255, blank=True, null=True, verbose_name='配置描述')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'base_user_config'
        verbose_name = '用户配置'
        verbose_name_plural = '用户配置'
        ordering = ['-updated_at']
        # 同一用户的同一配置键只能有一个值
        unique_together = ['user', 'key']
    
    def __str__(self):
        return f"{self.user.username} - {self.key}"
