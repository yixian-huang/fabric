from rest_framework import serializers
from .models import GridProject, GridColumn, GridRow, GridCell, GridShared, GridVendorShare
from fabric.apps.base.models import Image
from fabric.apps.fabrics.models import Vendor
from fabric.apps.fabrics.serializers import VendorSerializer
import json
from fabric.apps.base.utils import get_base_url # 确保导入 MinioClient和get_image_url
from fabric.apps.base.utils import MinioClient

class GridColumnSerializer(serializers.ModelSerializer):
    """网格列序列化器"""
    style_data = serializers.SerializerMethodField()
    rule_data = serializers.SerializerMethodField()
    
    class Meta:
        model = GridColumn
        fields = ['column_id', 'project', 'title', 'width', 'type',  'column_index', 'style', 'rule', 'style_data', 'rule_data', 'created_at', 'updated_at']
        read_only_fields = ['column_id', 'project', 'type', 'created_at', 'updated_at']
    
    def get_style_data(self, obj):
        """获取样式数据，将JSON字符串转换为字典"""
        if obj.style:
            try:
                return json.loads(obj.style)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def get_rule_data(self, obj):
        """获取规则数据，将JSON字符串转换为字典"""
        if obj.rule:
            try:
                return json.loads(obj.rule)
            except json.JSONDecodeError:
                return {}
        return {}
        

class GridRowSerializer(serializers.ModelSerializer):
    """网格行序列化器"""
    cells = serializers.SerializerMethodField()
    
    class Meta:
        model = GridRow
        fields = ['row_id', 'project', 'row_index', 'hidden', 'cells', 'created_at', 'updated_at']
        read_only_fields = ['row_id', 'row_index', 'project', 'created_at', 'updated_at']
    
    def get_cells(self, obj):
        """
        获取行的所有单元格，并根据需要构造缺失的单元格
        
        逻辑:
        1. 获取该行关联的所有实际存在的单元格
        2. 获取项目中所有的列
        3. 对于每个列，检查是否有对应的单元格:
           - 如果有，使用数据库中的单元格数据
           - 如果没有，构造一个临时的默认单元格（不保存到数据库）
        """
        # 获取实际存在于数据库中的单元格
        existing_cells = GridCell.objects.filter(row=obj)
        existing_cells_dict = {cell.column.column_id: cell for cell in existing_cells}
        
        # 获取所有列
        all_columns = GridColumn.objects.filter(project=obj.project).order_by('column_index')
        
        # 构建最终的单元格列表
        result_cells = []
        
        # 遍历所有列，确保每列都有对应的单元格
        for column in all_columns:
            # 检查是否有此列的单元格
            cell = existing_cells_dict.get(column.column_id)
            
            if cell:
                # 使用现有单元格
                result_cells.append(GridCellSerializer(cell).data)
            else:
                # 构造一个临时的默认单元格（不保存到数据库）
                temp_cell = {
                    'cell_id': None,  # 临时单元格没有ID
                    'row': obj.row_id,
                    'column': column.column_id,
                    'content': '',
                    'style': '{}',
                    'style_data': {},
                    'type': column.type,
                    'created_at': None,
                    'updated_at': None
                }
                result_cells.append(temp_cell)
        
        return result_cells

class GridProjectDetailSerializer(serializers.ModelSerializer):
    """网格项目详情序列化器"""
    columns = GridColumnSerializer(many=True, read_only=True)
    rows = serializers.SerializerMethodField()
    base_url = serializers.SerializerMethodField()
    
    class Meta:
        model = GridProject
        fields = ['project_id', 'name', 'description', 'creator', 'is_archived', 
                  'is_public', 'columns', 'rows', 'base_url', 'created_at', 'updated_at']
        read_only_fields = ['project_id', 'creator', 'created_at', 'updated_at']
    
    def get_rows(self, obj):
        """
        获取项目的所有行，并确保每一行都有对应所有列的单元格数据
        即使数据库中不存在某些单元格，也会为前端返回构造好的完整数据结构
        """
        rows = GridRow.objects.filter(project=obj, hidden=False).order_by('row_index')
        return GridRowSerializer(rows, many=True).data
    
    def get_base_url(self, obj):
        """
        获取基础URL
        """
        return get_base_url()

class GridProjectSerializer(serializers.ModelSerializer):
    """网格项目序列化器"""

    class Meta:
        model = GridProject
        fields = ['project_id', 'name', 'description', 'creator', 'is_archived', 
                  'is_public', 'created_at', 'updated_at']
        read_only_fields = ['project_id', 'creator', 'created_at', 'updated_at']


class GridCellSerializer(serializers.ModelSerializer):
    """网格单元格序列化器"""
    style_data = serializers.SerializerMethodField()
    
    class Meta:
        model = GridCell
        fields = ['cell_id', 'project', 'row', 'column', 'content', 'style', 'style_data', 'type', 'created_at', 'updated_at']
        read_only_fields = ['cell_id', 'created_at', 'updated_at']
    
    def get_style_data(self, obj):
        """获取样式数据，将JSON字符串转换为字典"""
        if obj.style:
            try:
                return json.loads(obj.style)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def validate(self, data):
        """验证数据，确保row和column属于同一个项目"""
        row = data.get('row')
        column = data.get('column')
        
        if row and column and row.project.project_id != column.project.project_id:
            raise serializers.ValidationError("行和列必须属于同一个项目")
        
        return data

class GridCellCreateSerializer(serializers.ModelSerializer):
    """网格单元格创建序列化器"""
    style_data = serializers.JSONField(write_only=True, required=False)
    
    class Meta:
        model = GridCell
        fields = ['project', 'row', 'column', 'content', 'type', 'style_data']
        # 彻底禁用 unique_together 校验
        validators = []
    
    def validate(self, data):
        """验证数据，确保row和column属于同一个项目，并处理唯一性约束"""
        row = data.get('row')
        column = data.get('column')
        content = data.get('content')
        
        # 首先检查行和列是否属于同一个项目
        if row and column and row.project.project_id != column.project.project_id:
            raise serializers.ValidationError("行和列必须属于同一个项目")
            
        # 检查列规则约束
        if column and column.rule and content:
            try:
                rule_data = json.loads(column.rule)
                
                # 检查长度限制
                if 'length' in rule_data and column.type == 'text':
                    max_length = rule_data['length']
                    if len(content) > max_length:
                        raise serializers.ValidationError(f"内容长度不能超过 {max_length} 个字符")
                
                # 可以在这里添加更多的规则检查...
                
            except json.JSONDecodeError:
                pass  # 如果rule不是有效的JSON，则忽略规则检查
        
        # 检查是否已存在相同行列的单元格
        try:
            existing_cell = GridCell.objects.get(row=row, column=column)
            # 如果是更新操作，传递现有单元格到上下文中，供后续处理
            self.context['existing_cell'] = existing_cell
        except GridCell.DoesNotExist:
            # 不存在就保持正常创建流程
            pass
            
        return data
    
    def create(self, validated_data):
        """创建单元格，处理style_data，并处理已存在单元格的情况"""
        # 检查是否有已存在的单元格
        existing_cell = self.context.get('existing_cell')
        if existing_cell:
            # 如果有，调用update方法而不是create
            return self.update(existing_cell, validated_data)
            
        # 否则正常创建
        style_data = validated_data.pop('style_data', None)
        cell = GridCell(**validated_data)
        
        if style_data:
            cell.style = json.dumps(style_data)
        
        cell.save()
        return cell
    
    def update(self, instance, validated_data):
        """更新单元格，处理style_data"""
        style_data = validated_data.pop('style_data', None)
        new_content = validated_data.pop('content', None)
        # 如果单元格类型为图片，并且有新的内容，则删除旧的内容
        if instance.content != '' and (instance.type == 'image' or instance.type == 'file'):
            file_contents = FileObject.from_json(json.loads(instance.content))
            if new_content is None or new_content == '':
                new_file_contents = FileObject.from_json(json.loads('[]'))
            else:
                new_file_contents = FileObject.from_json(json.loads(new_content))
            distinct_file_ids = set([file.file_id for file in file_contents])
            distinct_new_file_ids = set([file.file_id for file in new_file_contents])
            if distinct_file_ids != distinct_new_file_ids:
                for file_id in distinct_file_ids:
                    if file_id not in distinct_new_file_ids:
                        file = Image.objects.get(file_id=file_id)
                        minio_client = MinioClient()
                        minio_client.delete_file(file.object_name)
                        file.delete()
            instance.content = FileObject.to_json(new_file_contents)

        elif instance.type == 'vendorNote' and new_content:
            real_content = []
            vendor_cells = GridCell.objects.filter(row=instance.row, type='vendor')
            if len(vendor_cells) == 1:
                vendors = json.loads(vendor_cells[0].content)
                vendor_ids = []
                if isinstance(vendors, list):
                    for vendor in vendors:
                        vendor_id = vendor.get('id')
                        if vendor_id:
                            vendor_ids.append(vendor_id)

                vendor_note_json = json.loads(new_content)
                if isinstance(vendor_note_json, list):
                    for vendor_content in vendor_note_json:
                        if vendor_content.get('vendorId') in vendor_ids:
                            real_content.append(vendor_content)
                instance.content = json.dumps(real_content)

        else:
            instance.content = new_content

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if style_data:
            instance.style = json.dumps(style_data)
        
        instance.save()
        return instance

 # 定义一个简单的文件对象结构
class FileObject:
    def __init__(self, file_id=None, name=None, url=None):
        self.file_id = file_id
        self.name = name
        self.url = url
    
    @classmethod
    def from_json(cls, json_data):
        if isinstance(json_data, list) and len(json_data) > 0:
            result = []
            for data in json_data:
                result.append(cls(
                    file_id=data.get('file_id'),
                    name=data.get('name'),
                    url=data.get('url')
                ))
            return result
        return []
    
    @classmethod
    def to_json(cls, file_objects): 
        """
        将文件对象列表转换为JSON字符串
        
        Args:
            file_objects: FileObject对象列表
            
        Returns:
            str: JSON字符串
        """
        if not file_objects:
            return "[]"
            
        result = []
        for file_obj in file_objects:
            if hasattr(file_obj, 'file_id') and hasattr(file_obj, 'name') and hasattr(file_obj, 'url'):
                result.append({
                    'file_id': file_obj.file_id,
                    'name': file_obj.name,
                    'url': file_obj.url
                })
        
        return json.dumps(result)

class GridRowCreateSerializer(serializers.ModelSerializer):
    """网格行创建序列化器"""
    class Meta:
        model = GridRow
        fields = ['project', 'row_index']
    
    def create(self, validated_data):
        """创建行"""
        # 检查是否已存在相同索引的行
        project = validated_data.get('project')
        row_index = validated_data.get('row_index')
        
        if GridRow.objects.filter(project=project, row_index=row_index).exists():
            raise serializers.ValidationError(f"项目 {project.name} 中已存在索引为 {row_index} 的行")
        
        return GridRow.objects.create(**validated_data)

class GridSharedSerializer(serializers.ModelSerializer):
    """网格共享序列化器"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    row_ids_list = serializers.SerializerMethodField()
    
    class Meta:
        model = GridShared
        fields = ['shared_id', 'shared_key', 'shared_password', 'project', 
                 'project_name', 'vender', 'row_ids', 'row_ids_list', 
                 'created_at', 'updated_at']
        read_only_fields = ['shared_id', 'shared_key', 'shared_password', 
                           'created_at', 'updated_at']
    
    def get_row_ids_list(self, obj):
        """获取行IDs列表"""
        return obj.get_row_ids()

class GridSharedCreateSerializer(serializers.ModelSerializer):
    """网格共享创建序列化器"""
    row_ids_list = serializers.ListField(write_only=True, required=False)
    
    class Meta:
        model = GridShared
        fields = ['project', 'row_ids_list', 'shared_id', 
                 'shared_key', 'shared_password']
        read_only_fields = ['shared_id', 'shared_key', 'shared_password']
    
    def create(self, validated_data):
        """创建共享链接"""
        row_ids_list = validated_data.pop('row_ids_list', None)
        project = validated_data.get('project')
        
        # 如果提供了 row_ids_list，分析每个 row 的 vendor 信息
        all_created_records = []
        
        if row_ids_list:
            # 查询所有符合条件的行
            rows = GridRow.objects.filter(row_id__in=row_ids_list, project=project)
            
            # 提取供应商信息，格式为 {vendor_name: [row_id1, row_id2, ...]}
            vendor_rows_map = {}
            vendor_ids_map = {}
            rows_with_vendors = set()  # 记录哪些行有供应商信息
            
            for row in rows:
                # 查找该行中的 vendor 类型单元格
                vendor_cells = row.cells.filter(column__type='vendor')
                has_vendor = False
                
                for vendor_cell in vendor_cells:
                    if vendor_cell.content:
                        try:
                            # 尝试解析供应商信息
                            vendors = json.loads(vendor_cell.content)
                            if isinstance(vendors, list) and vendors:
                                has_vendor = True
                                rows_with_vendors.add(str(row.row_id))
                                
                                # 为每个供应商添加这个行ID
                                for vendor in vendors:
                                    vendor_name = vendor.get('name')
                                    vendor_id = vendor.get('id')
                                    if vendor_id:
                                        if vendor_id not in vendor_rows_map:
                                            vendor_rows_map[vendor_id] = [str(row.row_id)]
                                        elif str(row.row_id) not in vendor_rows_map[vendor_id]:
                                            vendor_rows_map[vendor_id].append(str(row.row_id))
                                        vendor_ids_map[vendor_id] = vendor_name
                        except (json.JSONDecodeError, AttributeError):
                            # 解析失败，忽略这个单元格
                            pass
                
                # 验证逻辑：如果有行没有供应商，抛出验证错误
                if not has_vendor:
                    raise serializers.ValidationError(f"行 {row.row_id} 未设置供应商，无法创建共享链接")
            
            # 为每个供应商创建一个共享链接
            for vendor_id, vendor_row_ids in vendor_rows_map.items():
                vendor_data = validated_data.copy()
                vendor_data['vender'] = vendor_ids_map[vendor_id]
                vendor_data['vender_id'] = vendor_id
                shared = GridShared(**vendor_data)
                shared.set_row_ids(vendor_row_ids)
                shared.save()
                all_created_records.append(shared)
        else:
            # 如果没有提供 row_ids_list，抛出验证错误
            raise serializers.ValidationError("请选择要分享的行")
        
        # 将所有创建的记录保存到上下文中，以便视图可以访问
        self.context['all_created_records'] = all_created_records
        
        # 仍然返回第一条记录作为默认结果
        return all_created_records[0] if all_created_records else None 

class GridVendorShareSerializer(serializers.ModelSerializer):
    """网格供应商共享序列化器"""
    project_name = serializers.CharField(source='project.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    row_ids_list = serializers.SerializerMethodField()
    
    class Meta:
        model = GridVendorShare
        fields = [
            'vendor_share_id', 'shared_key', 'shared_password', 
            'project', 'project_name', 'vendor', 'vendor_name', 'vendor_detail',
            'is_active', 'expires_at', 'row_ids', 'row_ids_list',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'vendor_share_id', 'shared_key', 'shared_password',
            'created_at', 'updated_at'
        ]
    
    def get_row_ids_list(self, obj):
        """获取行IDs列表"""
        return obj.get_row_ids()

class GridVendorShareCreateSerializer(serializers.ModelSerializer):
    """网格供应商共享创建序列化器"""
    row_ids_list = serializers.ListField(write_only=True, required=False)
    
    class Meta:
        model = GridVendorShare
        fields = [
            'project', 'vendor', 'row_ids_list', 
            'vendor_share_id', 'shared_key', 'shared_password',
            'is_active', 'expires_at'
        ]
        read_only_fields = ['vendor_share_id', 'shared_key', 'shared_password']
    
    def create(self, validated_data):
        """创建供应商共享链接"""
        row_ids_list = validated_data.pop('row_ids_list', None)
        
        # 创建共享记录
        vendor_share = GridVendorShare(**validated_data)
        
        # 设置行IDs
        if row_ids_list:
            vendor_share.set_row_ids(row_ids_list)
        
        vendor_share.save()
        return vendor_share 