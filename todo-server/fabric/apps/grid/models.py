from django.db import models
import uuid
import json
from fabric.apps.base.models import User

class GridProject(models.Model):
    """网格项目模型"""
    # 主键
    project_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='项目ID')
    
    # 基本信息
    name = models.CharField(max_length=200, verbose_name='项目名称')
    description = models.TextField(blank=True, null=True, verbose_name='项目描述')
    
    # 关联信息
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grid_projects', verbose_name='创建人')
    
    # 状态信息
    is_archived = models.BooleanField(default=False, verbose_name='是否归档')
    is_public = models.BooleanField(default=False, verbose_name='是否公开')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_project'
        verbose_name = '网格项目'
        verbose_name_plural = '网格项目'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """重写保存方法，在创建新项目时自动创建默认列和行"""
        is_new = self._state.adding  # 判断是否是新创建的记录，使用Django的_state.adding属性
        super().save(*args, **kwargs)
        
        if is_new:
            # 创建默认列
            self.create_default_columns()
            # 创建默认行
            self.create_default_row()
    
    def create_default_columns(self):
        """创建默认列"""
        default_columns = [
            {'id': str(uuid.uuid4()), 'title': '序号', 'width': 80, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '客户', 'width': 150, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '成衣款号', 'width': 150, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '样式图', 'width': 150, 'type': 'image'},
            {'id': str(uuid.uuid4()), 'title': '供应商', 'width': 150, 'type': 'vendor'},
            {'id': str(uuid.uuid4()), 'title': '文件', 'width': 200, 'type': 'file'},
            {'id': str(uuid.uuid4()), 'title': '单价', 'width': 100, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '主面料', 'width': 100, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '主辅料', 'width': 100, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '事宜', 'width': 150, 'type': 'text'},
            {'id': str(uuid.uuid4()), 'title': '完成日期', 'width': 150, 'type': 'date'},
            {'id': str(uuid.uuid4()), 'title': '备注', 'width': 200, 'type': 'vendorNote'},
        ]
        
        for index, column_data in enumerate(default_columns):
            GridColumn.objects.create(
                project=self,
                title=column_data['title'],
                width=column_data['width'],
                type=column_data['type'],
                column_index=index
            )
    
    def create_default_row(self):
        """创建默认行"""
        GridRow.objects.create(
            project=self,
            row_index=0
        )

class GridColumn(models.Model):
    """网格列模型"""
    COLUMN_TYPE_CHOICES = [
        ('text', '文本'),
        ('image', '图片'),
        ('file', '文件'),
        ('vendor', '供应商'),
        ('date', '日期'),
        ('vendorNote', '供应商备注'),
    ]
    
    # 主键
    column_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='列ID')
    
    # 关联信息
    project = models.ForeignKey(GridProject, on_delete=models.CASCADE, related_name='columns', verbose_name='所属项目')
    
    # 列信息
    title = models.CharField(max_length=100, verbose_name='列标题')
    width = models.IntegerField(default=100, verbose_name='列宽')
    type = models.CharField(max_length=20, choices=COLUMN_TYPE_CHOICES, default='text', verbose_name='列类型')
    column_index = models.IntegerField(verbose_name='列索引')
    
    # 新增字段
    style = models.TextField(blank=True, null=True, verbose_name='样式配置')
    rule = models.TextField(blank=True, null=True, verbose_name='限制规则')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_column'
        verbose_name = '网格列'
        verbose_name_plural = '网格列'
        ordering = ['column_index']
        unique_together = [['project', 'column_index']]
    
    def __str__(self):
        return f"{self.project.name} - {self.title}"
    
    def get_style(self):
        """获取样式，将JSON字符串转换为字典"""
        if self.style:
            return json.loads(self.style)
        return {}
    
    def set_style(self, style_dict):
        """设置样式，将字典转换为JSON字符串"""
        self.style = json.dumps(style_dict)
        
    def get_rule(self):
        """获取规则，将JSON字符串转换为字典"""
        if self.rule:
            return json.loads(self.rule)
        return {}
    
    def set_rule(self, rule_dict):
        """设置规则，将字典转换为JSON字符串"""
        self.rule = json.dumps(rule_dict)

class GridRow(models.Model):
    """网格行模型"""
    # 主键
    row_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='行ID')
    
    # 关联信息
    project = models.ForeignKey(GridProject, on_delete=models.CASCADE, related_name='rows', verbose_name='所属项目')
    
    # 行信息
    row_index = models.IntegerField(verbose_name='行索引')
    
    # 新增字段
    hidden = models.BooleanField(default=False, verbose_name='是否隐藏')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_row'
        verbose_name = '网格行'
        verbose_name_plural = '网格行'
        ordering = ['row_index']
        unique_together = [['project', 'row_index']]
    
    def __str__(self):
        return f"{self.project.name} - 行 {self.row_index}"

class GridCell(models.Model):
    """网格单元格模型"""
    CELL_TYPE_CHOICES = [
        ('text', '文本'),
        ('image', '图片'),
        ('file', '文件'),
        ('vendor', '供应商'),
        ('date', '日期'),
        ('vendorNote', '供应商备注'),
    ]
    
    # 主键
    cell_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='单元格ID')
    
    # 关联信息
    project = models.ForeignKey(GridProject, on_delete=models.CASCADE, related_name='cells', verbose_name='所属项目')
    row = models.ForeignKey(GridRow, on_delete=models.CASCADE, related_name='cells', verbose_name='所属行')
    column = models.ForeignKey(GridColumn, on_delete=models.CASCADE, related_name='cells', verbose_name='所属列')
    
    # 单元格内容
    content = models.TextField(blank=True, null=True, verbose_name='内容')
    style = models.TextField(blank=True, null=True, verbose_name='样式')
    type = models.CharField(max_length=20, choices=CELL_TYPE_CHOICES, default='text', verbose_name='单元格类型')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_cell'
        verbose_name = '网格单元格'
        verbose_name_plural = '网格单元格'
        unique_together = [['project', 'row', 'column']]
    
    def __str__(self):
        return f"{self.row.project.name} - 行 {self.row.row_index} - 列 {self.column.title}"
    
    def set_style(self, style_dict):
        """设置样式，将字典转换为JSON字符串"""
        self.style = json.dumps(style_dict)
    
    def get_style(self):
        """获取样式，将JSON字符串转换为字典"""
        if self.style:
            return json.loads(self.style)
        return {}

class GridShared(models.Model):
    """网格共享模型"""
    # 主键
    shared_id = models.CharField(max_length=8, primary_key=True, unique=True, verbose_name='共享ID')
    shared_key = models.CharField(max_length=8, unique=True, verbose_name='共享密钥')
    shared_password = models.CharField(max_length=4, verbose_name='共享密码')
    
    # 关联信息
    project = models.ForeignKey(GridProject, on_delete=models.CASCADE, related_name='shared_links', verbose_name='所属项目')
    
    # 共享信息
    vender = models.CharField(max_length=100, blank=True, null=True, verbose_name='厂商')
    vender_id = models.CharField(max_length=100, blank=True, null=True, verbose_name='厂商ID')
    row_ids = models.TextField(blank=True, null=True, verbose_name='行IDs')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_shared'
        verbose_name = '网格共享'
        verbose_name_plural = '网格共享'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.project.name} - {self.shared_id}"
    
    def get_row_ids(self):
        """获取行IDs列表"""
        if self.row_ids:
            return json.loads(self.row_ids)
        return []
    
    def set_row_ids(self, row_ids_list):
        """设置行IDs列表"""
        self.row_ids = json.dumps(row_ids_list)
    
    def save(self, *args, **kwargs):
        """重写保存方法，确保ID长度符合要求"""
        import random
        import string
        
        if not self.shared_id:
            # 生成8位随机字符作为shared_id
            chars = string.ascii_uppercase + string.digits
            self.shared_id = ''.join(random.choice(chars) for _ in range(8))
            
        if not self.shared_key:
            # 生成8位随机字符作为shared_key
            chars = string.ascii_uppercase + string.digits
            self.shared_key = ''.join(random.choice(chars) for _ in range(8))
            
        if not self.shared_password:
            # 生成4位随机数字作为shared_password
            self.shared_password = ''.join(random.choice(string.digits) for _ in range(4))
            
        super().save(*args, **kwargs)

class GridVendorShare(models.Model):
    """网格供应商共享模型"""
    # 主键和共享标识
    vendor_share_id = models.CharField(max_length=8, primary_key=True, unique=True, verbose_name='供应商共享ID')
    shared_key = models.CharField(max_length=8, unique=True, verbose_name='共享密钥')
    shared_password = models.CharField(max_length=4, verbose_name='共享密码')
    
    # 关联信息
    project = models.ForeignKey(GridProject, on_delete=models.CASCADE, related_name='vendor_shares', verbose_name='所属项目')
    vendor = models.ForeignKey('fabrics.Vendor', on_delete=models.CASCADE, related_name='grid_shares', verbose_name='供应商')
    
    # 共享选项
    is_active = models.BooleanField(default=True, null=True, verbose_name='是否激活')
    expires_at = models.DateTimeField(blank=True, null=True, verbose_name='过期时间')
    
    # 共享内容
    row_ids = models.TextField(blank=True, null=True, verbose_name='行IDs')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        db_table = 'grid_vendor_share'
        verbose_name = '网格供应商共享'
        verbose_name_plural = '网格供应商共享'
        unique_together = [['project', 'vendor']]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.project.name} - {self.vendor.name} - {self.vendor_share_id}"
    
    def get_row_ids(self):
        """获取行IDs列表"""
        if self.row_ids:
            return json.loads(self.row_ids)
        return []
    
    def set_row_ids(self, row_ids_list):
        """设置行IDs列表"""
        self.row_ids = json.dumps(row_ids_list)
    
    def save(self, *args, **kwargs):
        """重写保存方法，确保ID长度符合要求"""
        import random
        import string
        
        if not self.vendor_share_id:
            # 生成8位随机字符作为vendor_share_id
            chars = string.ascii_uppercase + string.digits
            self.vendor_share_id = ''.join(random.choice(chars) for _ in range(8))
            
        if not self.shared_key:
            # 生成8位随机字符作为shared_key
            chars = string.ascii_uppercase + string.digits
            self.shared_key = ''.join(random.choice(chars) for _ in range(8))
            
        if not self.shared_password:
            # 生成4位随机数字作为shared_password
            self.shared_password = ''.join(random.choice(string.digits) for _ in range(4))
            
        super().save(*args, **kwargs)
