from django.contrib import admin
from .models import GridProject, GridColumn, GridRow, GridCell, GridShared

class GridColumnInline(admin.TabularInline):
    """网格列内联管理"""
    model = GridColumn
    extra = 0
    fields = ('title', 'width', 'type', 'column_index')


@admin.register(GridProject)
class GridProjectAdmin(admin.ModelAdmin):
    """网格项目管理"""
    list_display = ('project_id', 'name', 'creator', 'is_archived', 'is_public', 'created_at')
    list_filter = ('is_archived', 'is_public', 'created_at')
    search_fields = ('name', 'description', 'creator__username')
    readonly_fields = ('project_id', 'created_at', 'updated_at')
    inlines = [GridColumnInline]
    fieldsets = (
        ('基本信息', {
            'fields': ('project_id', 'name', 'description', 'creator')
        }),
        ('状态信息', {
            'fields': ('is_archived', 'is_public')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(GridColumn)
class GridColumnAdmin(admin.ModelAdmin):
    """网格列管理"""
    list_display = ('column_id', 'project', 'title', 'width', 'type', 'column_index')
    list_filter = ('type', 'created_at')
    search_fields = ('title', 'project__name')
    readonly_fields = ('column_id', 'created_at', 'updated_at')
    fieldsets = (
        ('基本信息', {
            'fields': ('column_id', 'project', 'title', 'width', 'type', 'column_index')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )

class GridCellInline(admin.TabularInline):
    """网格单元格内联管理"""
    model = GridCell
    extra = 0
    fields = ('column', 'content', 'type')
    max_num = 10  # 限制最多显示10个单元格

@admin.register(GridRow)
class GridRowAdmin(admin.ModelAdmin):
    """网格行管理"""
    list_display = ('row_id', 'project', 'row_index')
    list_filter = ('project__name', 'created_at')
    readonly_fields = ('row_id', 'created_at', 'updated_at')
    inlines = [GridCellInline]
    fieldsets = (
        ('基本信息', {
            'fields': ('row_id', 'project', 'row_index')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )

@admin.register(GridCell)
class GridCellAdmin(admin.ModelAdmin):
    """网格单元格管理"""
    list_display = ('cell_id', 'row', 'column', 'type', 'content_preview')
    list_filter = ('type', 'created_at')
    search_fields = ('content', 'row__project__name')
    readonly_fields = ('cell_id', 'created_at', 'updated_at')
    fieldsets = (
        ('基本信息', {
            'fields': ('cell_id', 'row', 'column', 'type')
        }),
        ('内容信息', {
            'fields': ('content', 'style')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def content_preview(self, obj):
        """内容预览，显示前50个字符"""
        if obj.content:
            return obj.content[:50] + ('...' if len(obj.content) > 50 else '')
        return "-"
    content_preview.short_description = '内容预览'


@admin.register(GridShared)
class GridSharedAdmin(admin.ModelAdmin):
    """网格共享管理"""
    list_display = ('shared_id', 'project', 'vender', 'created_at')
    list_filter = ('project__name', 'created_at')
    readonly_fields = ('shared_id', 'created_at', 'updated_at')
    fieldsets = (
        ('基本信息', {
            'fields': ('shared_id', 'project', 'vender')
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at')
        }),
    )