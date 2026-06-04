from django.db import models
import uuid
from fabric.apps.base.models import Image

class OptionCategory(models.TextChoices):
    COMPONENT    = 'COMPONENT', '成分'
    CRAFT        = 'CRAFT',     '工艺'
    FABRIC_STYLE = 'FABRIC_STYLE', '布面风格'

class FabricType(models.IntegerChoices):
    KNITTED   = 1, '针织'
    WOVEN     = 2, '梭织'
    LACE      = 3, '蕾丝'
    VELVET    = 4, '天鹅绒'


class Fabric(models.Model):
    """面料模型"""
    WEIGHT_UNIT_CHOICES = [
        ('gsm', 'gsm'),
        ('mm', 'mm'),
    ]
    
    # 主键和标识
    fabric_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='面料唯一ID')
    
    # 基本信息
    code = models.CharField(max_length=100, verbose_name='面料编号', unique=True)
    merchant_code = models.CharField(max_length=100, blank=True, null=True, verbose_name='面料商编号')
    reference_code = models.CharField(max_length=100, unique=True, verbose_name='面料参考码', blank=True, null=True)
    
    # 图片信息
    image_url = models.CharField(max_length=255, blank=True, null=True, verbose_name='面料图片URL')
    # 关联图片信息
    main_image = models.OneToOneField(
        Image,
        on_delete=models.SET_NULL, # 或者 models.CASCADE 如果希望删除图片时也删除面料
        null=True,
        blank=True,
        related_name='fabric',
        verbose_name='主图片'
    )

    # 尺寸和物理特性
    width = models.CharField(max_length=50, blank=True, null=True, verbose_name='幅宽')
    yarn_count = models.CharField(max_length=50, blank=True, null=True, verbose_name='纱支')
    density = models.CharField(max_length=50, blank=True, null=True, verbose_name='密度')
    weight = models.FloatField(verbose_name='克重')
    weight_unit = models.CharField(max_length=5, choices=WEIGHT_UNIT_CHOICES, default='gsm', verbose_name='重量单位')
    
    # 类型信息 - 改为使用整数编码
    fabric_type = models.IntegerField(choices=FabricType.choices, default=FabricType.KNITTED, verbose_name='面料类型')
    
    # 选项编码数组（存储为JSON）
    style_codes = models.JSONField(default=list, blank=True, verbose_name='布面风格选项编码')
    process_codes = models.JSONField(default=list, blank=True, verbose_name='工艺选项编码')
    
    # 其他信息
    craft_options = models.JSONField(default=list, blank=True, verbose_name='工艺选项')
    remark = models.TextField(blank=True, null=True, verbose_name='备注')
    
    # 时间信息
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    
    class Meta:
        verbose_name = '面料'
        verbose_name_plural = '面料'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.code} - {self.reference_code}"



class Component(models.Model):
    """面料成分模型"""
    component_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='成分唯一ID')
    fabric = models.ForeignKey(Fabric, on_delete=models.CASCADE, related_name='components', verbose_name='所属面料')
    name = models.CharField(max_length=50, verbose_name='成分名称')
    percentage = models.FloatField(verbose_name='成分百分比')
    option_code = models.CharField(max_length=100, null=True, blank=True, verbose_name='成分选项编码')
    
    class Meta:
        verbose_name = '面料成分'
        verbose_name_plural = '面料成分'
    
    def __str__(self):
        return f"{self.name} {self.percentage}%"



class Option(models.Model):
    """通用选项模型，用于存储成分/工艺/风格等枚举选项"""
    option_id = models.UUIDField(
        default=uuid.uuid4,
        primary_key=True,
        editable=False,
        unique=True,
        verbose_name='选项唯一ID'
    )
    category_code = models.CharField(
        max_length=20,
        choices=OptionCategory.choices,
        default=OptionCategory.COMPONENT,
        verbose_name='选项类别'
    )
    option_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        unique=True,
        verbose_name='选项编码'
    )
    option_name = models.CharField(
        max_length=100,
        verbose_name='选项名称'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序顺序'
    )

    class Meta:
        verbose_name = '通用选项'
        verbose_name_plural = '通用选项'
        ordering = ['sort_order', 'category_code']

    def __str__(self):
        # get_category_code_display() 会返回中文"成分""工艺"等
        return f"{self.get_category_code_display()} – {self.option_name}"


class Vendor(models.Model):
    """供应商模型"""
    vendor_id = models.UUIDField(
        default=uuid.uuid4,
        primary_key=True,
        editable=False,
        unique=True,
        verbose_name='供应商唯一ID'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='供应商名称'
    )
    contact = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='联系人'
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name='联系电话'
    )
    address = models.TextField(
        blank=True,
        null=True,
        verbose_name='地址'
    )
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name='邮箱'
    )
    remark = models.TextField(
        blank=True,
        null=True,
        verbose_name='备注'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )

    class Meta:
        verbose_name = '供应商'
        verbose_name_plural = '供应商'
        ordering = ['name']

    def __str__(self):
        return self.name
        
    def save(self, *args, **kwargs):
        """保存前将名称转换为大写"""
        if self.name:
            self.name = self.name.upper()
        super().save(*args, **kwargs)


class VisitorLog(models.Model):
    """访客记录模型"""
    id = models.UUIDField(
        default=uuid.uuid4,
        primary_key=True,
        editable=False,
        unique=True,
        verbose_name='记录ID'
    )
    ip_address = models.CharField(
        max_length=50,
        verbose_name='IP地址'
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent'
    )
    referer = models.TextField(
        blank=True,
        null=True,
        verbose_name='来源页面'
    )
    page_viewed = models.CharField(
        max_length=100,
        verbose_name='访问页面',
        default='fabric_preview'
    )
    visit_time = models.DateTimeField(
        auto_now_add=True,
        verbose_name='访问时间'
    )
    
    class Meta:
        verbose_name = '访客记录'
        verbose_name_plural = '访客记录'
        ordering = ['-visit_time']
    
    def __str__(self):
        return f"{self.ip_address} - {self.visit_time}"


class FabricFavorite(models.Model):
    """面料收藏模型"""
    favorite_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='收藏ID')
    user = models.ForeignKey('base.User', on_delete=models.CASCADE, related_name='favorites', verbose_name='用户')
    fabric = models.ForeignKey(Fabric, on_delete=models.CASCADE, related_name='favorited_by', verbose_name='面料')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='收藏时间')
    
    class Meta:
        unique_together = ('user', 'fabric')
        verbose_name = '面料收藏'
        verbose_name_plural = '面料收藏'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.fabric.code}"


class FavoriteShare(models.Model):
    """收藏分享模型"""
    share_id = models.UUIDField(default=uuid.uuid4, primary_key=True, editable=False, unique=True, verbose_name='分享ID')
    user = models.ForeignKey('base.User', on_delete=models.CASCADE, related_name='shared_favorites', verbose_name='分享用户')
    share_token = models.CharField(max_length=50, unique=True, verbose_name='分享令牌')
    is_active = models.BooleanField(default=True, verbose_name='是否有效')
    view_count = models.IntegerField(default=0, verbose_name='查看次数')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='分享时间')
    expires_at = models.DateTimeField(blank=True, null=True, verbose_name='过期时间')
    
    class Meta:
        verbose_name = '收藏分享'
        verbose_name_plural = '收藏分享'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.share_token}"
    
    def save(self, *args, **kwargs):
        if not self.share_token:
            import secrets
            self.share_token = secrets.token_urlsafe(16)
        super().save(*args, **kwargs)
    
    def increment_view_count(self):
        """增加查看次数"""
        self.view_count += 1
        self.save(update_fields=['view_count'])
