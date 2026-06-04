from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Max
import json
import logging
from fabric.apps.base.utils import get_base_url
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import GridProject, GridColumn, GridRow, GridCell, GridShared, GridVendorShare
from fabric.apps.fabrics.models import Vendor
from fabric.apps.base.models import UserConfig, ConfigKeyEnum
from .serializers import (
    GridProjectSerializer, 
    GridProjectDetailSerializer,
    GridColumnSerializer,
    GridRowSerializer,
    GridRowCreateSerializer,
    GridCellSerializer,
    GridCellCreateSerializer,
    GridSharedSerializer,
    GridSharedCreateSerializer,
    GridVendorShareSerializer,
    GridVendorShareCreateSerializer,
    VendorSerializer
)

# 创建应用专用的logger
logger = logging.getLogger("myapp")

class GridProjectViewSet(viewsets.ModelViewSet):
    """网格项目视图集"""
    queryset = GridProject.objects.all()
    serializer_class = GridProjectSerializer
    
    def get_serializer_class(self):
        if self.action == 'retrieve' or self.action == 'todo':
            return GridProjectDetailSerializer
        return GridProjectSerializer
    
    def perform_create(self, serializer):
        # 添加日志记录
        logger.debug("开始创建新的网格项目")
        logger.info(f"用户 {self.request.user} 正在创建网格项目")
        
        # 获取当前用户并兼容不同类型的 User 模型
        # 方法一：将当前用户直接作为 creator
        try:
            serializer.save(creator=self.request.user)
            logger.info(f"成功创建网格项目，使用用户: {self.request.user}")
        except ValueError as e:
            logger.warning(f"使用当前用户创建项目时出现问题: {str(e)}")
            # 如果出现错误，尝试方法二：获取自定义 User 模型并查找匹配的用户
            try:
                from fabric.apps.base.models import User
                # 尝试使用 username 查找匹配的用户
                user = User.objects.get(username=self.request.user.username)
                serializer.save(creator=user)
                logger.info(f"使用匹配的用户创建项目: {user}")
            except (AttributeError, User.DoesNotExist) as e:
                logger.error(f"查找匹配用户时出错: {str(e)}", exc_info=True)
                # 如果仍然失败，记录错误并返回一个合理的响应
                from django.contrib.auth.models import User as DjangoUser
                # 尝试创建一个默认的管理员用户作为 creator
                try:
                    user, created = User.objects.get_or_create(
                        username='admin',
                        defaults={
                            'email': 'admin@example.com',
                            'status': 'active'
                        }
                    )
                    if created:
                        user.set_password('admin123')
                        user.save()
                        logger.warning("已创建默认管理员用户")
                    serializer.save(creator=user)
                    logger.info("使用默认管理员用户创建项目")
                except Exception as e:
                    logger.error("创建默认用户时出现严重错误", exc_info=True)
                    raise
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        
        # 过滤当前用户的项目
        # if not request.user.is_superuser:
        queryset = queryset.filter(creator=request.user)
            
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取项目列表成功",
            "data": serializer.data
        })

    def retrieve(self, request, *args, **kwargs):
        # 记录访问日志
        logger.info(f"用户 {request.user} 正在查看项目 ID: {kwargs.get('pk')}")
        
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response({
                "code": 200,
                "message": "获取项目详情成功",
                "data": serializer.data
            })
        except Exception as e:
            # 记录异常
            logger.error(f"获取项目详情时出错: {str(e)}", exc_info=True)
            return Response({
                "code": 500,
                "message": f"获取项目详情失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def todo(self, request):
        """
        获取待办事项项目详情
        """
        try:
            # 获取当前用户的待办事项项目ID
            user_config = UserConfig.objects.filter(
                user=request.user,
                key=ConfigKeyEnum.TODO_ID
            ).first()
            
            # 如果找不到待办事项项目ID配置，返回错误
            if not user_config or not user_config.value:
                # 创建一个新的待办事项项目
                todo_project = GridProject.objects.create(
                    name="待办事项",
                    description="默认的待办事项管理项目",
                    creator=request.user
                )
                
                # 创建默认的待办事项列
                GridColumn.objects.create(
                    project=todo_project,
                    title="待办事项",
                    column_index=0,
                    type="text"
                )
                
                GridColumn.objects.create(
                    project=todo_project,
                    title="截止日期",
                    column_index=1,
                    type="date"
                )
                
                GridColumn.objects.create(
                    project=todo_project,
                    title="状态",
                    column_index=2,
                    type="text"
                )
                
                # 保存待办事项项目ID到用户配置
                if not user_config:
                    UserConfig.objects.create(
                        user=request.user,
                        key=ConfigKeyEnum.TODO_ID,
                        value=str(todo_project.project_id),
                        description="待办事项项目ID"
                    )
                else:
                    user_config.value = str(todo_project.project_id)
                    user_config.save()
                
                # 返回新创建的待办事项项目
                serializer = GridProjectDetailSerializer(todo_project)
                return Response({
                    "code": 200,
                    "message": "创建并获取待办事项项目成功",
                    "data": serializer.data
                })
            
            # 如果找到待办事项项目ID配置，获取对应的项目
            todo_project_id = user_config.value
            todo_project = GridProject.objects.get(project_id=todo_project_id)
            
            # 返回待办事项项目详情
            serializer = self.get_serializer(todo_project)
            return Response({
                "code": 200,
                "message": "获取待办事项项目详情成功",
                "data": serializer.data
            })
        except Exception as e:
            # 记录异常
            logger.error(f"获取待办事项项目详情时出错: {str(e)}", exc_info=True)
            return Response({
                "code": 500,
                "message": f"获取待办事项项目详情失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "code": 200,
            "message": "创建项目成功",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({
            "code": 200,
            "message": "更新项目成功",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            "code": 200,
            "message": "删除项目成功"
        }, status=status.HTTP_200_OK)

class GridColumnViewSet(viewsets.ModelViewSet):
    """网格列视图集"""
    queryset = GridColumn.objects.all()
    serializer_class = GridColumnSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project__project_id=project_id)
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取列列表成功",
            "data": serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project_id')
        if not project_id:
            return Response({
                "code": 400,
                "message": "缺少project_id参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            project = GridProject.objects.get(project_id=project_id)
        except GridProject.DoesNotExist:
            return Response({
                "code": 404,
                "message": "项目不存在"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 获取最大的column_index
        max_index = GridColumn.objects.filter(project=project).aggregate(Max('column_index'))['column_index__max'] or -1
        new_index = max_index + 1
        
        serializer = self.get_serializer(data={
            **request.data,
            'project': project.pk,
            'column_index': new_index
        })
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        return Response({
            "code": 200,
            "message": "创建列成功",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object()
        
        # 项目不可修改
        data = request.data.copy()
        if 'project' in data:
            del data['project']
            
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            "code": 200,
            "message": "更新列成功",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        
        # 重新排序其他列
        project = instance.project
        columns = GridColumn.objects.filter(project=project, column_index__gt=instance.column_index)
        for column in columns:
            column.column_index -= 1
            column.save()
            
        return Response({
            "code": 200,
            "message": "删除列成功"
        }, status=status.HTTP_200_OK)

class GridRowViewSet(viewsets.ModelViewSet):
    """网格行视图集"""
    queryset = GridRow.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return GridRowCreateSerializer
        return GridRowSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        # 默认不返回隐藏的行，除非明确请求
        include_hidden = self.request.query_params.get('include_hidden', 'false').lower() == 'true'
        
        if project_id:
            queryset = queryset.filter(project__project_id=project_id)
            
        # 如果不包含隐藏行，则过滤掉隐藏的行
        if not include_hidden:
            queryset = queryset.filter(hidden=False)
            
        return queryset
    

    @action(detail=False, methods=['get'])
    def get_rows(self, request):
        """获取隐藏的行"""
        project_id = request.query_params.get('project_id')
        hidden = request.query_params.get('hidden', 'false').lower() == 'true'
        queryset = super().get_queryset()
        queryset = queryset.filter(project__project_id=project_id, hidden=hidden)
        serializer = GridRowSerializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取隐藏的行成功",
            "data": serializer.data
        })

    @action(detail=False, methods=['post'])
    def toggle_hidden(self, request):
        """切换行的隐藏状态"""
        row_ids = request.data.get('row_ids', [])
        hidden = request.data.get('hidden', True)
        
        if not row_ids:
            return Response({
                "code": 400,
                "message": "缺少row_ids参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        rows = GridRow.objects.filter(row_id__in=row_ids)
        updated_count = rows.update(hidden=hidden)
        
        return Response({
            "code": 200,
            "message": f"已{('隐藏' if hidden else '显示')} {updated_count} 行",
            "data": {
                "updated_count": updated_count,
                "row_ids": row_ids
            }
        })
    
    def create(self, request, *args, **kwargs):
        project_id = request.data.get('project_id')
        if not project_id:
            return Response({
                "code": 400,
                "message": "缺少project_id参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            project = GridProject.objects.get(project_id=project_id)
        except GridProject.DoesNotExist:
            return Response({
                "code": 404,
                "message": "项目不存在"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 获取最大的row_index
        max_index_value = GridRow.objects.filter(project=project).aggregate(Max('row_index'))
        max_index = max_index_value['row_index__max'] if max_index_value else -1
        new_index = max_index + 1
        
        serializer = self.get_serializer(data={
            **request.data,
            'project': project.pk,
            'row_index': new_index
        })
        serializer.is_valid(raise_exception=True)
        row = serializer.save()
        return Response({
            "code": 200,
            "message": "创建行成功",
            "data": GridRowSerializer(row).data
        }, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            # 删除行
            self.perform_destroy(instance)
            
            # 重新排序其他行
            project = instance.project
            rows = GridRow.objects.filter(project=project, row_index__gt=instance.row_index)
            for row in rows:
                row.row_index -= 1
                row.save()
        
        return Response({
            "code": 200,
            "message": "删除行成功"
        }, status=status.HTTP_200_OK)

class GridCellViewSet(viewsets.ModelViewSet):
    """网格单元格视图集"""
    queryset = GridCell.objects.all()
    
    def get_serializer_class(self):
        if self.action in ['create_or_update', 'update', 'partial_update']:
            return GridCellCreateSerializer
        return GridCellSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        row_id = self.request.query_params.get('row_id')
        column_id = self.request.query_params.get('column_id')
        
        if row_id:
            queryset = queryset.filter(row__row_id=row_id)
        if column_id:
            queryset = queryset.filter(column__column_id=column_id)
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取单元格列表成功",
            "data": serializer.data
        })
    
    @action(detail=False, methods=['patch'])
    def create_or_update(self, request, *args, **kwargs):
        """
        创建单元格，如果提供的行和列组合已存在单元格，则更新现有单元格
        
        逻辑:
        1. 检查请求中提供的行和列是否已存在对应的单元格
        2. 如果存在，则更新现有单元格
        3. 如果不存在，则创建新的单元格
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 2. 保存（内部会调用 GridCellCreateSerializer.create 或 update）
        cell = serializer.save()
        # 3. 根据 context 判断是更新还是创建
        existing = serializer.context.get('existing_cell') is not None
        return Response({
            "code": 200,
            "message": "更新单元格成功" if existing else "创建单元格成功",
            "data": self.get_serializer(cell).data
        }, status=status.HTTP_200_OK)
    


def filter_vendor_content(cell_data, vendor_id):
    if cell_data['type'] == 'vendor':
        vendor_content = json.loads(cell_data['content'])
        for item in vendor_content:
            if item['id'] == vendor_id:
                cell_data['content'] = json.dumps([{
                    'id': vendor_id,
                    'name': item['name']
                }])
                return

def filter_vendor_remark(cell_data, vendor_id):
    if cell_data['type'] == 'vendorNote':
        if cell_data['content']:
            remark_data = json.loads(cell_data['content'])
            for remark in remark_data:
                if remark['vendorId'] == vendor_id:
                    cell_data['content'] = json.dumps({
                        'vendorId': vendor_id,
                        'content': remark['content']
                    })
                    return
        else:
            cell_data['content'] = json.dumps({
                        'vendorId': vendor_id,
                        'content': ''
                    })
            return

class GridSharedViewSet(viewsets.ModelViewSet):
    """网格共享视图集"""
    queryset = GridShared.objects.all()

    def get_permissions(self):
        if self.action == 'project_access' or self.action == 'update_vendor_remark':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return GridSharedCreateSerializer
        return GridSharedSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        if project_id:
            queryset = queryset.filter(project__project_id=project_id)
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取共享链接列表成功",
            "data": serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "code": 200,
            "message": "获取共享链接详情成功",
            "data": serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # 获取序列化器上下文中保存的所有创建的记录
        all_created_records = serializer.context.get('all_created_records', [])
        
        # 使用 GridSharedSerializer 序列化所有记录
        response_data = GridSharedSerializer(all_created_records, many=True).data
        
        return Response({
            "code": 200,
            "message": f"成功创建 {len(all_created_records)} 个共享链接",
            "data": response_data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 更新不允许修改 shared_id, shared_key, shared_password 字段
        data = request.data.copy()
        for field in ['shared_id', 'shared_key', 'shared_password']:
            if field in data:
                del data[field]
        
        # 处理 row_ids_list 字段
        row_ids_list = data.pop('row_ids_list', None)
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # 如果有 row_ids_list，更新 row_ids
        if row_ids_list is not None:
            instance.set_row_ids(row_ids_list)
        
        self.perform_update(serializer)
        return Response({
            "code": 200,
            "message": "更新共享链接成功",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            "code": 200,
            "message": "删除共享链接成功"
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def access(self, request):
        """访问共享链接"""
        shared_id = request.query_params.get('shared_id')
        shared_key = request.query_params.get('shared_key')
        password = request.query_params.get('password')
        
        if not shared_id or not shared_key:
            return Response({
                "code": 400,
                "message": "缺少必要参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            shared = GridShared.objects.get(shared_id=shared_id, shared_key=shared_key)
        except GridShared.DoesNotExist:
            return Response({
                "code": 404,
                "message": "共享链接不存在或已失效"
            }, status=status.HTTP_404_NOT_FOUND)
        
        # 检查密码
        if shared.shared_password and shared.shared_password != password:
            return Response({
                "code": 403,
                "message": "密码错误"
            }, status=status.HTTP_403_FORBIDDEN)
        
        # 获取项目信息
        project = shared.project
        project_data = GridProjectDetailSerializer(project).data
        
        # 如果有指定行，只返回指定行
        row_ids = shared.get_row_ids()
        if row_ids:
            filtered_rows = []
            for row in project_data['rows']:
                if row['row_id'] in row_ids:
                    filtered_rows.append(row)
            project_data['rows'] = filtered_rows
        
        return Response({
            "code": 200,
            "message": "访问共享链接成功",
            "data": {
                "project": project_data,
                "shared": GridSharedSerializer(shared).data
            }
        })
    
    @action(detail=False, methods=['post'])
    def update_vendor_remark(self, request):
        """更新供应商备注"""
        shared_key = request.data.get('shared_key')
        password = request.data.get('password')
        shared = GridShared.objects.get(shared_key=shared_key)
        if shared.shared_password != password:
            return Response({
                "code": 403,
                "message": "密码错误"
            }, status=status.HTTP_403_FORBIDDEN)
        
        vendor_content = request.data.get('content')
        vendor_id = request.data.get('vendorId')
        row = request.data.get('row')
        column = request.data.get('column')

        project_id = shared.project.project_id
        cell = GridCell.objects.get(project_id=project_id, row=row, column=column)
        if cell.content:
            cell_content = json.loads(cell.content)
        else:
            cell_content = []
        for item in cell_content:
            if item['vendorId'] == vendor_id:
                item['content'] = vendor_content
                break
        else:
            cell_content.append({
                'vendorId': vendor_id,
                'content': vendor_content
            })
        cell.content = json.dumps(cell_content)
        cell.save()
        return Response({
            "code": 200,
            "message": "更新供应商备注成功"
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def project_access(self, request):
        """访问共享项目
        
        参数:
            project_id: 项目ID
            shared_key: 共享密钥
            shared_password: 共享密码
        """
        shared_key = request.query_params.get('shared_key')
        shared_password = request.query_params.get('shared_password')
        
        if not shared_key or not shared_password:
            return Response({
                "code": 400,
                "message": "缺少必要参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 查找匹配的共享记录
            shared = GridShared.objects.get(shared_key=shared_key)
            
            # 验证密码
            if shared.shared_password != shared_password:
                return Response({
                    "code": 403,
                    "message": "密码错误"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 获取项目信息
            project = shared.project
            
            # 获取项目的列信息
            columns = GridColumn.objects.filter(project=project).order_by('column_index')
            columns_data = GridColumnSerializer(columns, many=True).data
            
            # 获取共享的行信息
            row_ids = shared.get_row_ids()
            
            # 如果没有指定行IDs，则获取项目的所有行
            if not row_ids:
                rows = GridRow.objects.filter(project=project).order_by('row_index')
            else:
                rows = GridRow.objects.filter(project=project, row_id__in=row_ids).order_by('row_index')
            
            vendor_id = shared.vender_id
            # 序列化行数据
            rows_data = GridRowSerializer(rows, many=True).data


                        
            def filter_vendor_remark(row_data):
                for cell in row_data['cells']:
                    filter_vendor_content(cell, vendor_id)
                    filter_vendor_remark(cell, vendor_id)
                           
            for row in rows_data:
                filter_vendor_remark(row)
 
            # 构造项目详情数据
            project_data = {
                'project_id': str(project.project_id),
                'name': project.name,
                'description': project.description,
                'creator': str(project.creator.user_id) if project.creator else None,
                'is_archived': project.is_archived,
                'is_public': project.is_public,
                'created_at': project.created_at,
                'updated_at': project.updated_at,
                'columns': columns_data,
                'rows': rows_data,
                'base_url': get_base_url()
            }
            
            # 返回数据
            return Response({
                "code": 200,
                "message": "访问共享项目成功",
                "data": {
                    "project": project_data,
                    "shared": GridSharedSerializer(shared).data
                }
            })
            
        except GridShared.DoesNotExist:
            return Response({
                "code": 404,
                "message": "共享链接不存在或已失效"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(e.with_traceback())
            return Response({
                "code": 500,
                "message": f"服务器错误: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GridVendorShareViewSet(viewsets.ModelViewSet):
    """网格供应商共享视图集"""
    queryset = GridVendorShare.objects.all()
    def get_permissions(self):
        if self.action == 'vendor_access' or self.action == 'update_vendor_remark':
            return [AllowAny()]
        return [IsAuthenticated()]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return GridVendorShareCreateSerializer
        return GridVendorShareSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        project_id = self.request.query_params.get('project_id')
        vendor_id = self.request.query_params.get('vendor_id')
        
        if project_id:
            queryset = queryset.filter(project__project_id=project_id)
        if vendor_id:
            queryset = queryset.filter(vendor__vendor_id=vendor_id)
            
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取供应商共享列表成功",
            "data": serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "code": 200,
            "message": "获取供应商共享详情成功",
            "data": serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "code": 200,
            "message": "创建供应商共享成功",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # 更新不允许修改某些字段
        data = request.data.copy()
        for field in ['vendor_share_id', 'shared_key', 'shared_password']:
            if field in data:
                del data[field]
        
        # 处理 row_ids_list 字段
        row_ids_list = data.pop('row_ids_list', None)
        
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # 如果有 row_ids_list，更新 row_ids
        if row_ids_list is not None:
            instance.set_row_ids(row_ids_list)
        
        self.perform_update(serializer)
        return Response({
            "code": 200,
            "message": "更新供应商共享成功",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            "code": 200,
            "message": "删除供应商共享成功"
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def access(self, request):
        """访问供应商共享项目
        
        参数:
            shared_key: 共享密钥
            shared_password: 共享密码
        """
        shared_key = request.query_params.get('shared_key')
        shared_password = request.query_params.get('shared_password')
        
        if not shared_key or not shared_password:
            return Response({
                "code": 400,
                "message": "缺少必要参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 查找匹配的共享记录
            shared = GridVendorShare.objects.get(shared_key=shared_key)
            
            # 验证密码
            if shared.shared_password != shared_password:
                return Response({
                    "code": 403,
                    "message": "密码错误"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 验证是否过期
            from django.utils import timezone
            if shared.expires_at and shared.expires_at < timezone.now():
                return Response({
                    "code": 403,
                    "message": "共享链接已过期"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 验证是否激活
            if not shared.is_active:
                return Response({
                    "code": 403,
                    "message": "共享链接已停用"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 获取项目信息
            project = shared.project
            
            # 获取项目的列信息
            columns = GridColumn.objects.filter(project=project).order_by('column_index')
            columns_data = GridColumnSerializer(columns, many=True).data
            
            # 获取共享的行信息
            row_ids = shared.get_row_ids()
            
            # 如果没有指定行IDs，则获取项目的所有行
            if not row_ids:
                rows = GridRow.objects.filter(project=project, hidden=False).order_by('row_index')
            else:
                rows = GridRow.objects.filter(project=project, row_id__in=row_ids, hidden=False).order_by('row_index')
            
            # 序列化行数据
            rows_data = GridRowSerializer(rows, many=True).data
            
            # 构造项目详情数据
            project_data = {
                'project_id': str(project.project_id),
                'name': project.name,
                'description': project.description,
                'creator': str(project.creator.user_id) if project.creator else None,
                'is_archived': project.is_archived,
                'is_public': project.is_public,
                'created_at': project.created_at,
                'updated_at': project.updated_at,
                'columns': columns_data,
                'rows': rows_data,
                'base_url': get_base_url()
            }
            
            # 返回数据
            return Response({
                "code": 200,
                "message": "访问供应商共享项目成功",
                "data": {
                    "project": project_data,
                    "shared": GridVendorShareSerializer(shared).data
                }
            })
            
        except GridVendorShare.DoesNotExist:
            return Response({
                "code": 404,
                "message": "共享链接不存在或已失效"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(f"访问供应商共享项目失败: {str(e)}")
            return Response({
                "code": 500,
                "message": f"服务器错误: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def generate_vendor_links(self, request):
        """为项目中的所有供应商生成共享链接
        
        参数:
            project_id: 项目ID
        """
        project_id = request.data.get('project_id')
        
        if not project_id:
            return Response({
                "code": 400,
                "message": "缺少project_id参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 查找项目
            project = GridProject.objects.get(project_id=project_id)
            
            # 获取项目中所有的供应商信息
            vendor_ids = set()
            rows = GridRow.objects.filter(project=project, hidden=False)
            
            for row in rows:
                vendor_cells = GridCell.objects.filter(row=row, type='vendor')
                
                for cell in vendor_cells:
                    if cell.content:
                        try:
                            content = json.loads(cell.content)
                            if isinstance(content, list):
                                for vendor in content:
                                    vendor_id = vendor.get('id')
                                    if vendor_id:
                                        vendor_ids.add(vendor_id)
                        except json.JSONDecodeError:
                            pass
            
            # 创建或更新供应商共享链接
            created_links = []
            
            # 获取现有的所有供应商共享
            existing_shares = GridVendorShare.objects.filter(project=project)
            existing_vendor_ids = set(str(share.vendor.vendor_id) for share in existing_shares)
            
            # 需要删除的共享链接
            to_delete_vendor_ids = existing_vendor_ids - vendor_ids
            
            # 需要创建的共享链接
            to_create_vendor_ids = vendor_ids - existing_vendor_ids
            
            # 执行删除操作
            if to_delete_vendor_ids:
                GridVendorShare.objects.filter(
                    project=project, 
                    vendor__vendor_id__in=to_delete_vendor_ids
                ).delete()
            
            # 执行创建操作
            for vendor_id in to_create_vendor_ids:
                try:
                    from fabric.apps.fabrics.models import Vendor
                    vendor = Vendor.objects.get(vendor_id=vendor_id)
                    
                    # 创建新的共享链接
                    vendor_share = GridVendorShare(
                        project=project,
                        vendor=vendor,
                        is_active=True
                    )
                    vendor_share.save()
                    created_links.append(vendor_share)
                except Exception as e:
                    logging.error(f"为供应商 {vendor_id} 创建共享链接时出错: {str(e)}")
            
            # 序列化结果
            all_shares = GridVendorShare.objects.filter(project=project)
            serializer = self.get_serializer(all_shares, many=True)
            
            return Response({
                "code": 200,
                "message": f"已生成 {len(all_shares)} 个供应商共享链接",
                "data": serializer.data
            })
            
        except GridProject.DoesNotExist:
            return Response({
                "code": 404,
                "message": "项目不存在"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(f"生成供应商共享链接时出错: {str(e)}")
            return Response({
                "code": 500,
                "message": f"服务器错误: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def vendor_access(self, request):
        """访问供应商共享项目
        
        参数:
            shared_key: 共享密钥
            shared_password: 共享密码
        """
        shared_key = request.query_params.get('shared_key')
        shared_password = request.query_params.get('shared_password')
        
        if not shared_key or not shared_password:
            return Response({
                "code": 400,
                "message": "缺少必要参数"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # 查找匹配的共享记录
            # 尝试通过shared_key查找，如果找不到则尝试通过vendor名称查找
            try:
                shared = GridVendorShare.objects.get(shared_key=shared_key)
            except GridVendorShare.DoesNotExist:
                # 尝试通过vendor名称查找
                try:
                    vendor = Vendor.objects.get(name=shared_key.upper())
                    shared = GridVendorShare.objects.get(vendor=vendor)
                except (Vendor.DoesNotExist, GridVendorShare.DoesNotExist):
                    return Response({
                        "code": 404,
                        "message": "共享链接不存在"
                    }, status=status.HTTP_404_NOT_FOUND)
            # 验证密码
            if shared.shared_password != shared_password:
                return Response({
                    "code": 403,
                    "message": "密码错误"
                }, status=status.HTTP_403_FORBIDDEN)
            
            # 获取项目信息
            project = shared.project
            vendor = shared.vendor
            
            # 获取项目的列信息
            columns = GridColumn.objects.filter(project=project).order_by('column_index')
            
            # 获取项目中与该供应商相关的行
            relevant_rows = []
            rows = GridRow.objects.filter(project=project, hidden=False).order_by('row_index')
            vendor_id = str(vendor.vendor_id)
            for row in rows:
                vendor_cells = GridCell.objects.filter(row=row, type='vendor')
                is_relevant = False
                
                for cell in vendor_cells:

                    if cell.content:
                        try:
                            content = json.loads(cell.content)
                            if isinstance(content, list):
                                for vendor_item in content:
                                    if vendor_item.get('id') == vendor_id:
                                        is_relevant = True
                                        break
                        except json.JSONDecodeError:
                            pass
                
                if is_relevant:
                    relevant_rows.append(row)
            
            def is_self(column):
                if column.rule:
                    rule = json.loads(column.rule)
                    if rule.get("self"):
                        return True
                return False
            # 序列化行数据
            rows_data = GridRowSerializer(relevant_rows, many=True).data
            columns_map = {column.column_id: column for column in columns}
            for row in rows_data:
                cell_arr = row['cells']
                cells = []
                for cell in cell_arr:
                    column = columns_map.get(cell['column'])
                    if column and is_self(column):
                        continue
                    
                    filter_vendor_content(cell, vendor_id)
                    filter_vendor_remark(cell, vendor_id)
                    cells.append(cell)
                row['cells'] = cells

            # 构造项目详情数据
            project_data = {
                'project_id': str(project.project_id),
                'name': project.name,
                'description': project.description,
                'creator': str(project.creator.user_id) if project.creator else None,
                'is_archived': project.is_archived,
                'is_public': project.is_public,
                'created_at': project.created_at,
                'updated_at': project.updated_at,
                'columns': GridColumnSerializer([column for column in columns if not is_self(column)], many=True).data,
                'rows': rows_data,
                'base_url': get_base_url(),
                'vendor': VendorSerializer(vendor).data
            }
            
            # 返回数据
            return Response({
                "code": 200,
                "message": "访问供应商共享项目成功",
                "data": {
                    "project": project_data,
                    "shared": GridVendorShareSerializer(shared).data
                }
            })
            
        except GridVendorShare.DoesNotExist:
            return Response({
                "code": 404,
                "message": "共享链接不存在或已失效"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logging.error(f"访问供应商共享项目失败: {str(e)}")
            return Response({
                "code": 500,
                "message": f"服务器错误: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def update_vendor_remark(self, request):
        """更新供应商备注"""
        shared_key = request.data.get('shared_key')
        password = request.data.get('password')
        shared = GridVendorShare.objects.get(shared_key=shared_key)
        if shared.shared_password != password:
            return Response({
                "code": 403,
                "message": "密码错误"
            }, status=status.HTTP_403_FORBIDDEN)
        
        vendor_content = request.data.get('content')
        vendor_id = request.data.get('vendorId')
        row = request.data.get('row')
        column = request.data.get('column')

        project_id = shared.project.project_id
        cells = GridCell.objects.filter(project_id=project_id, row=row, column=column)
        if len(cells) == 0:
            row = GridRow.objects.get(project_id=project_id, row_id=row)
            column = GridColumn.objects.get(project_id=project_id, column_id=column)
            cell = GridCell(project_id=project_id, row=row, column=column)
            cell.save()
        else:
            cell = cells[0]

        if cell.content:
            cell_content = json.loads(cell.content)
        else:
            cell_content = []
        for item in cell_content:
            if item['vendorId'] == vendor_id:
                item['content'] = vendor_content
                break
        else:
            cell_content.append({
                'vendorId': vendor_id,
                'content': vendor_content
            })
        cell.content = json.dumps(cell_content)
        cell.save()
        return Response({
            "code": 200,
            "message": "更新供应商备注成功"
        }, status=status.HTTP_200_OK)


