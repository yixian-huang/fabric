from django.contrib import admin
from .models import Fabric, Component, VisitorLog

class ComponentInline(admin.TabularInline):
    """面料成分内联管理"""
    model = Component
    extra = 1

@admin.register(Fabric)
class FabricAdmin(admin.ModelAdmin):
    """面料管理"""
    list_display = ('fabric_id', 'code', 'reference_code', 'fabric_type', 'weight', 'created_at')
    list_filter = ('fabric_type', 'created_at')
    search_fields = ('code', 'reference_code', 'merchant_code')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ComponentInline]
    fieldsets = (
        ('基本信息', {
            'fields': ('code', 'merchant_code', 'reference_code', 'main_image')
        }),
        ('面料特性', {
            'fields': ('width', 'yarn_count', 'density', 'weight', 'weight_unit', 'fabric_type')
        }),
        ('工艺和风格', {
            'fields': ('style', 'process', 'craft_options')
        }),
        ('其他信息', {
            'fields': ('remark', 'created_at', 'updated_at')
        }),
    )

@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    """面料成分管理"""
    list_display = ('component_id', 'fabric', 'name', 'percentage')
    list_filter = ('name',)
    search_fields = ('fabric__code', 'fabric__reference_code', 'name') 


@admin.register(VisitorLog)
class VisitorLogAdmin(admin.ModelAdmin):
    """访客记录管理"""
    list_display = ('id', 'ip_address', 'user_agent', 'referer', 'page_viewed', 'visit_time')
    list_filter = ('page_viewed', 'visit_time')
    search_fields = ('ip_address', 'user_agent', 'referer')
