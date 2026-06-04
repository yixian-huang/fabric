from django.contrib import admin
from .models import Image, User, UserConfig

@admin.register(UserConfig)
class UserConfigAdmin(admin.ModelAdmin):
    """用户配置管理"""
    list_display = ('user', 'key', 'value', 'created_at', 'updated_at')
    list_filter = ('key', 'created_at')
    search_fields = ('user', 'key', 'value')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('用户信息', {
            'fields': ('user',)
        }),
        ('配置信息', {
            'fields': ('key', 'value')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    """图片管理"""
    list_display = ('file_id', 'title', 'file_name', 'content_type', 'size', 'created_at')
    search_fields = ('title', 'file_name')
    readonly_fields = ('file_id', 'object_name', 'content_type', 'size', 'created_at', 'url')
    ordering = ('-created_at',)
    list_filter = ('content_type', 'created_at')
    fieldsets = (
        ('基本信息', {
            'fields': ('file_id', 'title', 'file_name')
        }),
        ('存储信息', {
            'fields': ('object_name', 'content_type', 'size', 'url')
        }),
        ('时间信息', {
            'fields': ('created_at',)
        }),
    )

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """用户管理"""
    list_display = ('user_id', 'username', 'email', 'status', 'created_at', 'last_login')
    list_filter = ('status', 'created_at')
    search_fields = ('username', 'email', 'nickname')
    readonly_fields = ('user_id', 'created_at', 'updated_at', 'last_login')
    ordering = ('-created_at',)
    fieldsets = (
        ('账号信息', {
            'fields': ('user_id', 'username', 'password', 'email')
        }),
        ('个人信息', {
            'fields': ('nickname', 'status')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at', 'last_login')
        }),
    )
