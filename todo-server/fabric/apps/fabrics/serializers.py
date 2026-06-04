from rest_framework import serializers
from .models import Fabric, Component
from fabric.apps.base.models import Image
from fabric.apps.base.serializers import ImageSerializer
from django.conf import settings
import uuid
import datetime
from django.utils import timezone # 用于获取带时区的当前时间
from rest_framework.validators import UniqueTogetherValidator
from fabric.apps.base.utils import MinioClient, get_image_url, get_short_image_url, get_watermark_image_url, get_thumbnail_image_url # 确保导入 MinioClient和get_image_url
import json
from .models import Option, OptionCategory
from .models import Vendor
from .models import FabricFavorite, FavoriteShare


class ComponentSerializer(serializers.ModelSerializer):
    """面料成分序列化器"""
    class Meta:
        model = Component
        fields = ['component_id', 'name', 'percentage', 'option_code']
        read_only_fields = ['component_id']
        
class FabricSerializer(serializers.ModelSerializer):
    """面料序列化器"""
    components = ComponentSerializer(many=True, read_only=True)
    style_options = serializers.SerializerMethodField()
    process_options = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()
    image_file_id = serializers.SerializerMethodField()
    fabric_type_display = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    watermark_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Fabric
        fields = [
            'fabric_id', 'code', 'merchant_code', 'reference_code', 'image_url', 'image_file_id',
            'thumbnail_url', 'watermark_image_url',
            'width', 'yarn_count', 'density', 'weight', 'weight_unit',
            'fabric_type', 'fabric_type_display', 'style_codes', 'process_codes', 
            'style_options', 'process_options', 'craft_options', 'remark',
            'components', 'created_at', 'updated_at'
        ]
        read_only_fields = ['fabric_id', 'created_at', 'updated_at']

    def get_style_options(self, obj):
        """返回style_codes对应的选项详情"""
        if not obj.style_codes:
            return []
            
        # 如果是字符串类型的JSON，解析它
        if isinstance(obj.style_codes, str):
            try:
                code_list = json.loads(obj.style_codes)
            except (json.JSONDecodeError, TypeError):
                return []
        else:
            code_list = obj.style_codes
            
        # 查询选项详情
        if not code_list:
            return []
            
        options = Option.objects.filter(
            category_code=OptionCategory.FABRIC_STYLE,
            option_code__in=code_list
        )
        
        # 转换为选项详情
        return [
            {
                'code': option.option_code,
                'name': option.option_name,
                'id': str(option.option_id)
            }
            for option in options
        ]
        
    def get_process_options(self, obj):
        """返回process_codes对应的选项详情"""
        if not obj.process_codes:
            return []
            
        # 如果是字符串类型的JSON，解析它
        if isinstance(obj.process_codes, str):
            try:
                code_list = json.loads(obj.process_codes)
            except (json.JSONDecodeError, TypeError):
                return []
        else:
            code_list = obj.process_codes
            
        # 查询选项详情
        if not code_list:
            return []
            
        options = Option.objects.filter(
            category_code=OptionCategory.CRAFT,
            option_code__in=code_list
        )
        
        # 转换为选项详情
        return [
            {
                'code': option.option_code,
                'name': option.option_name,
                'id': str(option.option_id)
            }
            for option in options
        ]
            
    def get_fabric_type_display(self, obj):
        """返回面料类型的显示名称"""
        return obj.get_fabric_type_display()
          
    def get_image_url(self, obj):
        return get_image_url(obj.main_image.url) if obj.main_image else None
    
    def get_watermark_image_url(self, obj):
        return get_watermark_image_url(obj.main_image.url) if obj.main_image else None
    
    def get_thumbnail_url(self, obj):
        return get_thumbnail_image_url(obj.main_image.url) if obj.main_image else None

    def get_image_file_id(self, obj):
        return obj.main_image.file_id if obj.main_image else None
    
class FabricCreateSerializer(serializers.ModelSerializer):
    """面料创建/更新序列化器"""
    components = ComponentSerializer(many=True)
    style_codes = serializers.ListField(child=serializers.CharField(), required=False)
    process_codes = serializers.ListField(child=serializers.CharField(), required=False)
    image_file_id = serializers.UUIDField(required=False, write_only=True, allow_null=True)
    
    class Meta:
        model = Fabric
        fields = [
            'fabric_id', 'code', 'merchant_code', 'reference_code', 'image_file_id',
            'width', 'yarn_count', 'density', 'weight', 'weight_unit',
            'fabric_type', 'style_codes', 'process_codes', 
            'craft_options', 'remark', 'components'
        ]
        read_only_fields = ['fabric_id', 'reference_code']
        validators = [
            UniqueTogetherValidator(
                queryset=Fabric.objects.all(),
                fields=['code'],
                message="面料编号已存在，请使用其他编号。"
            )
        ]
    
    def generate_reference_code(self):
        """
        生成面料参考码: 年份后两位 + 月份两位 + 日期两位 + 3位数序号
        """
        # 使用本地时区时间
        now = timezone.localtime()
        year = now.strftime("%y")   # 年份后两位
        month = now.strftime("%m")  # 月份两位
        day = now.strftime("%d")    # 日期两位

        today = timezone.localdate()
        # 仅匹配当天且以年月日开头的 reference_code，按倒序取第一条
        last = (
            Fabric.objects
            .filter(created_at__date=today, reference_code__startswith=f"{year}{month}{day}")
            .order_by('-reference_code')
            .first()
        )

        if last:
            # 取最后三位，转为整数后加一
            last_seq = int(last.reference_code[-3:])
            next_seq = last_seq + 1
        else:
            next_seq = 1

        sequence_str = str(next_seq).zfill(3)  # 格式化为 3 位，不足补零
        return f"{year}{month}{day}{sequence_str}"
    

    def _process_components(self, fabric_instance, components_data):
        """处理面料成分的创建"""
        # 先删除旧的（如果是更新操作）
        fabric_instance.components.all().delete()
        # 创建新的
        components_to_create = []
        for component_data in components_data:
            # 获取成分名称和百分比
            component = {
                'fabric': fabric_instance,
                'name': component_data.get('name'),
                'percentage': component_data.get('percentage'),
                'option_code': component_data.get('option_code')
            }
            components_to_create.append(Component(**component))
        if components_to_create:
            Component.objects.bulk_create(components_to_create)

    def create(self, validated_data):
        # 保存style_codes和process_codes
        style_codes = validated_data.get('style_codes', [])
        process_codes = validated_data.get('process_codes', [])
        
        # 处理图片关联
        image_file_id = validated_data.pop('image_file_id', None)
        main_image = None
        if image_file_id:
            try:
                main_image = Image.objects.get(file_id=image_file_id)
            except Image.DoesNotExist:
                raise serializers.ValidationError({"image_file_id": "无效的图片ID"})

        # 提取components数据
        components_data = validated_data.pop('components', [])

        # 自动生成参考码
        if not validated_data.get('reference_code'):
            validated_data['reference_code'] = self.generate_reference_code()
        
        # 创建面料实例
        fabric = Fabric.objects.create(
            main_image=main_image, 
            **validated_data
        )
        
        # 处理面料成分
        self._process_components(fabric, components_data)

        return fabric
    
    def update(self, instance, validated_data):
        """更新面料实例，并处理旧图片的删除"""

        # 1. 保存旧图片信息，以便后续比较和删除
        old_main_image: Image | None = instance.main_image
        old_object_name_to_delete: str | None = old_main_image.object_name if old_main_image else None
        
        # 2. 处理图片关联
        new_main_image: Image | None = old_main_image # 默认保持不变
        image_changed = False # 标记图片是否发生变化
        # 检查 'image_file_id' 是否在传入的原始数据中（即使值为 None 也算传入）
        if 'image_file_id' in self.initial_data:
            image_file_id = validated_data.pop('image_file_id', None)
            if image_file_id: # 如果传入了新的 file_id
                try:
                    fetched_image = Image.objects.get(file_id=image_file_id)
                    if fetched_image != old_main_image: # 只有当新图片和旧图片不同时才更新
                        new_main_image = fetched_image
                        image_changed = True
                except Image.DoesNotExist:
                    raise serializers.ValidationError({"image_file_id": "无效的图片ID"})
            else: # 如果传入的是 null 或空
                if old_main_image is not None: # 只有当原本有关联图片时才算变化
                    new_main_image = None
                    image_changed = True

        # 3. 处理 components 数据
        components_data = validated_data.pop('components', [])

        # 4. 更新面料实例的其他字段
        for attr, value in validated_data.items():
            if attr not in ['reference_code']: # reference_code 不允许更新
                setattr(instance, attr, value)

        # 5. 更新 main_image 关联 (如果发生了变化)
        if image_changed:
             instance.main_image = new_main_image

        # 6. 保存面料实例的更改
        instance.save()

        # 7. 处理面料成分 (更新或创建)
        self._process_components(instance, components_data)

        # 8. 如果图片发生了变化，且旧图片存在，则删除旧图片资源
        if image_changed and old_main_image and old_object_name_to_delete:
            try:
                # 删除 MinIO 对象
                minio_client = MinioClient()
                delete_success = minio_client.delete_file(old_object_name_to_delete)
                if not delete_success:
                    print(f"Warning: Failed to delete MinIO object {old_object_name_to_delete} during Fabric update.")
                    # 这里可以添加更健壮的错误处理或日志记录

                # 删除旧的 Image 数据库记录
                old_main_image.delete()
            except Exception as e:
                 print(f"Error deleting old image resources for Fabric {instance.pk}: {e}")
                 # 记录删除旧图片失败的日志，但不影响更新操作的成功返回

        # 9. 返回更新后的实例
        return instance


class VendorSerializer(serializers.ModelSerializer):
    """供应商序列化器"""
    name = serializers.CharField()
    
    class Meta:
        model = Vendor
        fields = [
            'vendor_id', 'name', 'contact', 'phone', 
            'address', 'email', 'remark', 'created_at', 'updated_at'
        ]
        read_only_fields = ['vendor_id', 'created_at', 'updated_at']
        
    def to_representation(self, instance):
        """格式化输出"""
        representation = super().to_representation(instance)
        representation['name'] = instance.name.upper()  # 将名称转换为大写
        return representation
        
    def validate_name(self, value):
        """验证并处理名称字段，将其转换为大写"""
        if value:
            return value.upper()
        return value


class FabricFavoriteSerializer(serializers.ModelSerializer):
    """面料收藏序列化器"""
    fabric = FabricSerializer(read_only=True)
    
    class Meta:
        model = FabricFavorite
        fields = ['favorite_id', 'fabric', 'created_at']
        read_only_fields = ['favorite_id', 'created_at']


class FavoriteToggleSerializer(serializers.Serializer):
    """切换收藏状态序列化器"""
    fabric_id = serializers.UUIDField(required=True)


class FavoriteShareSerializer(serializers.ModelSerializer):
    """收藏分享序列化器"""
    share_url = serializers.SerializerMethodField()
    
    class Meta:
        model = FavoriteShare
        fields = ['share_id', 'share_token', 'share_url', 'created_at', 'expires_at', 'view_count']
        read_only_fields = ['share_id', 'share_token', 'created_at', 'view_count']
    
    def get_share_url(self, obj):
        """生成完整的分享URL"""
        request = self.context.get('request')
        if request:
            return f"{request.scheme}://fabricoption.com/share/{obj.share_token}"
        return f"/share/{obj.share_token}"


class FabricListWithFavoriteSerializer(FabricSerializer):
    """带收藏状态的面料列表序列化器"""
    is_favorited = serializers.SerializerMethodField()
    
    class Meta(FabricSerializer.Meta):
        fields = FabricSerializer.Meta.fields + ['is_favorited']
    
    def get_is_favorited(self, obj):
        """获取当前用户是否收藏了该面料"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return FabricFavorite.objects.filter(
                user=request.user,
                fabric=obj
            ).exists()
        return False
