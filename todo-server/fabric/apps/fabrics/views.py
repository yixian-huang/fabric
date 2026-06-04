from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Fabric, Option, OptionCategory, Component, Vendor, VisitorLog
from .serializers import (
    FabricSerializer, 
    FabricCreateSerializer, 
    FabricListWithFavoriteSerializer,
    ComponentSerializer,
    VendorSerializer
)
from fabric.apps.base.utils import MinioClient
from django.db.models import Q, F
import json
import logging
import redis
import hashlib
import time
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from django.db import transaction
from fabric.apps.fabrics.models import FabricFavorite, FavoriteShare
from fabric.apps.fabrics.serializers import FabricFavoriteSerializer, FavoriteShareSerializer, FavoriteToggleSerializer

# Redis客户端连接
# 需要在settings.py中配置REDIS相关参数
redis_client = redis.Redis(
    host=getattr(settings, 'REDIS_HOST', 'localhost'),
    port=getattr(settings, 'REDIS_PORT', 6379),
    db=getattr(settings, 'REDIS_DB', 0),
    password=getattr(settings, 'REDIS_PASSWORD', None)
)

# 添加Option序列化器
from rest_framework import serializers
class OptionSerializer(serializers.ModelSerializer):
    """选项序列化器"""
    category_display = serializers.SerializerMethodField()
    
    class Meta:
        model = Option
        fields = ['option_id', 'category_code', 'category_display', 'option_code', 'option_name', 'sort_order']
    
    def get_category_display(self, obj):
        return obj.get_category_code_display()

# 添加 Option 编辑序列化器
class OptionEditSerializer(serializers.ModelSerializer):
    """选项编辑序列化器，只允许编辑名称和排序"""
    class Meta:
        model = Option
        fields = ['option_name', 'sort_order']

# 添加 Option 创建序列化器
class OptionCreateSerializer(serializers.ModelSerializer):
    """选项创建序列化器"""
    class Meta:
        model = Option
        fields = ['category_code', 'option_name', 'sort_order']
    
    def create(self, validated_data):
        category_code = validated_data.get('category_code')
        
        # 查找该分类下的最大编码值
        latest_option = Option.objects.filter(category_code=category_code).order_by('-option_code').first()
        
        # 生成新的编码
        if latest_option and latest_option.option_code:
            # 提取编码中的数字部分
            try:
                category_prefix = ''.join(filter(str.isalpha, latest_option.option_code))
                number_part = ''.join(filter(str.isdigit, latest_option.option_code))
                if number_part:
                    new_number = int(number_part) + 1
                    new_code = f"{category_prefix}{new_number:03d}"  # 使用3位数格式
                else:
                    # 如果无法解析编号，使用默认值
                    new_code = f"{category_code}001"
            except Exception:
                new_code = f"{category_code}001"
        else:
            # 如果该分类下没有选项，创建第一个
            new_code = f"{category_code}001"
        
        validated_data['option_code'] = new_code
        return super().create(validated_data)

class FabricPagination(PageNumberPagination):
    """面料分页器"""
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class FabricViewSet(viewsets.ModelViewSet):
    """面料视图集，提供面料相关的CRUD操作"""
    queryset = Fabric.objects.all().order_by('-created_at')
    pagination_class = FabricPagination
    
    def get_permissions(self):
        if self.action in ['list_public', 'get_options', 'record_visit', 'shared_favorites']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        """根据不同的action返回不同的序列化器"""
        if self.action in ['create', 'update', 'partial_update']:
            return FabricCreateSerializer
        # if self.action == 'list' and self.request.user.is_authenticated:
        #     return FabricListWithFavoriteSerializer
        return FabricListWithFavoriteSerializer
    
    def get_options(self, request):
        """获取所有选项字典"""
        # 获取分类过滤参数
        category_filter = request.query_params.get('category_code')
        
        # 基础查询集
        options_query = Option.objects.all()
        
        # 如果存在分类过滤参数，则应用过滤
        if category_filter:
            options_query = options_query.filter(category_code=category_filter)
        
        # 按类别和排序值排序
        options_query = options_query.order_by('category_code', 'sort_order', 'option_code')
        
        # 序列化结果
        serializer = OptionSerializer(options_query, many=True)
        
        return Response({
            "code": 200,
            "message": "获取选项字典成功",
            "data": serializer.data
        })
    
    def filter_queryset(self, queryset):
        """自定义过滤逻辑，处理各种搜索条件"""
        request = self.request
        params = request.query_params
        
        # 6. 过滤参考号 
        reference_code = params.get('reference_code')
        if reference_code:
            return queryset.filter(reference_code__icontains=reference_code)
            
        # 7. 过滤面料编号
        fabric_code = params.get('fabric_code')
        if fabric_code:
            return queryset.filter(code__icontains=fabric_code)
            
        # 1. 过滤面料类型
        fabric_type = params.get('fabric_type')
        if fabric_type and fabric_type.isdigit():
            queryset = queryset.filter(fabric_type=int(fabric_type))
            
        # 2. 过滤克重范围
        weight_min = params.get('weight_min')
        weight_max = params.get('weight_max')
        if weight_min:
            try:
                queryset = queryset.filter(weight__gte=float(weight_min))
            except ValueError:
                pass
        if weight_max:
            try:
                queryset = queryset.filter(weight__lte=float(weight_max))
            except ValueError:
                pass
        weight_unit = params.get('weight_unit')
        if weight_unit:
            try:
                queryset = queryset.filter(weight_unit=weight_unit)
            except ValueError:
                pass

                
        # 3. 过滤布面风格 (多选)
        style_codes = params.get('style_codes').split(',') if params.get('style_codes') else []
        style_enabled_or = params.get('style_enabled_or')
        if style_codes:
            # 使用JSON包含任一值的过滤条件
            style_query = Q()
            if style_enabled_or == 'true':
                for code in style_codes:
                    style_query |= Q(style_codes__contains=[code])
            else:
                for code in style_codes:
                    style_query &= Q(style_codes__contains=[code])
            
            queryset = queryset.filter(style_query)
            
        # 4. 过滤工艺选项 (多选)
        process_codes = params.get('process_codes').split(',') if params.get('process_codes') else []
        process_enabled_or = params.get('process_enabled_or')
        if process_codes:
            # 使用JSON包含任一值的过滤条件
            process_query = Q()
            if process_enabled_or == 'true':
                for code in process_codes:
                    process_query |= Q(process_codes__contains=[code])
            else:
                for code in process_codes:
                    process_query &= Q(process_codes__contains=[code])
            queryset = queryset.filter(process_query)
            
        # 5. 过滤成分名称和百分比范围
        component_code = params.get('component_code')
        component_percentage_min = params.get('component_percentage_min')
        component_percentage_max = params.get('component_percentage_max')
        
        if component_code or component_percentage_min or component_percentage_max:
            # 先构建成分的查询条件
            component_query = Q()
            
            if component_code:
                component_query &= Q(option_code__icontains=component_code)
                
            if component_percentage_min:
                try:
                    component_query &= Q(percentage__gte=float(component_percentage_min))
                except ValueError:
                    pass
                    
            if component_percentage_max:
                try:
                    component_query &= Q(percentage__lte=float(component_percentage_max))
                except ValueError:
                    pass
            
            # 找出符合条件的成分所属的面料ID
            component_fabric_ids = Component.objects.filter(component_query).values_list('fabric_id', flat=True)
            queryset = queryset.filter(fabric_id__in=component_fabric_ids)
            

        return queryset
    
    def list(self, request, *args, **kwargs):
        """获取面料列表，支持分页和过滤"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "code": 200,
                "message": "获取面料列表成功",
                "data": {
                    "items": serializer.data,
                    "total": queryset.count(),
                }
            }
        )
    
    def list_public(self, request, *args, **kwargs):
        """获取公开面料列表，支持分页和过滤"""
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(
            {
                "code": 200,
                "message": "获取公开面料列表成功",
                "data": {
                    "items": serializer.data,
                    "total": queryset.count(),
                }
            }
        )   
            
    def retrieve(self, request, *args, **kwargs):
        """获取面料详情"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(
            {
                "code": 200,
                "message": "获取面料详情成功",
                "data": serializer.data
            }
        )
    
    @action(detail=False, methods=['get'])
    def check_fabric_code(self, request, *args, **kwargs):
        """检查面料编号是否存在"""
        fabric_code = request.query_params.get('fabric_code')
        if fabric_code:
            queryset = self.get_queryset()
            queryset = queryset.filter(code=fabric_code)
            return Response({"code": 200, "data": queryset.exists()})
        return Response({"code": 200, "data": False})
    
    def create(self, request, *args, **kwargs):
        """创建面料"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        # 使用FabricSerializer返回完整数据，包括自动生成的参考码
        return Response(
            {
                "code": 200,
                "message": "创建面料成功",
                "data": FabricSerializer(serializer.instance).data
            },
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """更新面料"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(
            {
                "code": 200,
                "message": "更新面料成功",
                "data": FabricSerializer(instance).data
            }
        )
    
    def destroy(self, request, *args, **kwargs):
        """删除面料"""
        instance = self.get_object()
        image_to_delete = instance.main_image
        object_name_to_delete = None

        if image_to_delete:
            object_name_to_delete = image_to_delete.object_name

        try:
            # 先删除 Fabric 记录 (数据库会自动处理 SET_NULL)
            self.perform_destroy(instance)

            # 如果有关联图片，再删除 Image 记录和 MinIO 对象
            if image_to_delete and object_name_to_delete:
                 # 删除 MinIO 对象
                 minio_client = MinioClient()
                 delete_success = minio_client.delete_file(object_name_to_delete)
                 if not delete_success:
                      # 记录日志或返回警告，但通常不阻止 Fabric 删除完成
                      print(f"Warning: Failed to delete MinIO object {object_name_to_delete}")

                 # 删除 Image 数据库记录
                 image_to_delete.delete()

            return Response(
                {"code": 200, "message": "删除面料成功"},
                status=status.HTTP_200_OK
            )
        except Exception as e:
             # 处理可能的删除异常
             return Response(
                 {"code": 500, "message": f"删除面料时发生错误: {e}"},
                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
             ) 

    @action(detail=False, methods=['post'])
    def record_visit(self, request, *args, **kwargs):
        """记录访客信息，使用Redis防止同一访客短时间内重复记录"""
        try:
            # 获取访客信息
            ip_address = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            referer = request.META.get('HTTP_REFERER', '')
            page_viewed = request.data.get('page', 'fabric_preview')
            
            # 创建访客唯一标识 (IP + UserAgent的哈希)
            visitor_key = f"{ip_address}:{user_agent}"
            visitor_hash = hashlib.md5(visitor_key.encode()).hexdigest()
            redis_key = f"visitor:{visitor_hash}:{page_viewed}"
            
            # 检查Redis中是否存在此访客记录
            if not redis_client.exists(redis_key):
                # 不存在则创建新记录
                visitor_log = VisitorLog.objects.create(
                    ip_address=ip_address,
                    user_agent=user_agent,
                    referer=referer,
                    page_viewed=page_viewed
                )
                
                # 在Redis中设置标记，过期时间10分钟
                redis_client.setex(redis_key, 600, 1)
                
                return Response({
                    "code": 200, 
                    "message": "访客记录已保存"
                })
            else:
                # 已存在记录，但不需要任何操作
                return Response({
                    "code": 200, 
                    "message": "访客已记录在案"
                })
                
        except redis.RedisError as e:
            logging.error(f"Redis错误: {str(e)}")
            # Redis错误时，仍然记录访客信息
            VisitorLog.objects.create(
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referer=request.META.get('HTTP_REFERER', ''),
                page_viewed=request.data.get('page', 'fabric_preview')
            )
            return Response({
                "code": 200,
                "message": "访客记录已保存(Redis异常)"
            })
        except Exception as e:
            logging.error(f"记录访客信息时出错: {str(e)}")
            return Response({
                "code": 500,
                "message": f"记录访客信息失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _get_client_ip(self, request):
        """获取客户端真实IP地址"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        logging.info(f"x_forwarded_for: {x_forwarded_for}")
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        elif request.META.get('HTTP_X_REAL_IP'):
            logging.info(f"HTTP_X_REAL_IP: {request.META.get('HTTP_X_REAL_IP')}")
            ip = request.META.get('HTTP_X_REAL_IP')
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip

    @action(detail=False, methods=['get'])
    def visitor_stats(self, request, *args, **kwargs):
        """获取访客统计数据"""
        from django.utils import timezone
        from django.db.models import Count
        from datetime import datetime, time
        
        try:
            # 获取今天的开始和结束时间
            today = timezone.now().date()
            today_start = timezone.make_aware(datetime.combine(today, time.min))
            today_end = timezone.make_aware(datetime.combine(today, time.max))
            
            # 查询今天的访客数
            today_visitors = VisitorLog.objects.filter(
                visit_time__range=(today_start, today_end)
            ).count()
            
            # 查询总访客数
            total_visitors = VisitorLog.objects.count()
            
            # 获取今天不同IP的访客数
            unique_visitors_today = VisitorLog.objects.filter(
                visit_time__range=(today_start, today_end)
            ).values('ip_address').distinct().count()
            
            # 获取总的不同IP访客数
            total_unique_visitors = VisitorLog.objects.values('ip_address').distinct().count()
            
            return Response({
                "code": 200,
                "message": "获取访客统计成功",
                "data": {
                    "today_visitors": today_visitors,
                    "total_visitors": total_visitors,
                    "unique_visitors_today": unique_visitors_today,
                    "total_unique_visitors": total_unique_visitors
                }
            })
        except Exception as e:
            logging.error(f"获取访客统计时出错: {str(e)}")
            return Response({
                "code": 500,
                "message": f"获取访客统计失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def create_option(self, request, *args, **kwargs):
        """创建选项"""
        serializer = OptionCreateSerializer(data=request.data)
        if serializer.is_valid():
            try:
                option = serializer.save()
                return Response({
                    "code": 200,
                    "message": "创建选项成功",
                    "data": OptionSerializer(option).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({
                    "code": 500,
                    "message": f"创建选项失败: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response({
                "code": 400,
                "message": "创建选项失败",
                "errors": serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['put'], url_path='update_option/(?P<option_id>[^/.]+)')
    def update_option(self, request, option_id=None, *args, **kwargs):
        """更新选项，只允许修改名称和排序"""
        try:
            option = Option.objects.get(option_id=option_id)
            serializer = OptionEditSerializer(option, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "code": 200,
                    "message": "更新选项成功",
                    "data": OptionSerializer(option).data
                })
            else:
                return Response({
                    "code": 400,
                    "message": "更新选项失败",
                    "errors": serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
        except Option.DoesNotExist:
            return Response({
                "code": 404,
                "message": "选项不存在"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "code": 500,
                "message": f"更新选项失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['delete'], url_path='delete_option/(?P<option_id>[^/.]+)')
    def delete_option(self, request, option_id=None, *args, **kwargs):
        """删除选项，需要检查是否存在关联数据"""
        try:
            option = Option.objects.get(option_id=option_id)
            
            # 检查是否有关联的面料数据
            option_code = option.option_code
            
            # 检查面料表中的style_codes和process_codes字段是否包含此选项
            fabric_style_count = Fabric.objects.filter(style_codes__contains=[option_code]).count()
            fabric_process_count = Fabric.objects.filter(process_codes__contains=[option_code]).count()
            
            # 检查组件表中是否有关联此选项的记录
            component_count = Component.objects.filter(option_code=option_code).count()
            
            # 如果存在关联数据，则不允许删除
            if fabric_style_count > 0 or fabric_process_count > 0 or component_count > 0:
                return Response({
                    "code": 400,
                    "message": "选项已被使用，无法删除",
                    "data": {
                        "fabric_style_count": fabric_style_count,
                        "fabric_process_count": fabric_process_count,
                        "component_count": component_count
                    }
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # 无关联数据，可以安全删除
            option.delete()
            return Response({
                "code": 200,
                "message": "删除选项成功"
            })
        except Option.DoesNotExist:
            return Response({
                "code": 404,
                "message": "选项不存在"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "code": 500,
                "message": f"删除选项失败: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_favorite(self, request):
        """切换收藏状态"""
        serializer = FavoriteToggleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        fabric_id = serializer.validated_data['fabric_id']
        
        try:
            fabric = Fabric.objects.get(fabric_id=fabric_id)
        except Fabric.DoesNotExist:
            return Response(
                {"code": 404, "message": "面料不存在"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 检查是否已收藏
        favorite, created = FabricFavorite.objects.get_or_create(
            user=request.user,
            fabric=fabric
        )
        
        if not created:
            # 已存在则删除（取消收藏）
            favorite.delete()
            is_favorited = False
            message = "取消收藏成功"
        else:
            is_favorited = True
            message = "收藏成功"
        
        return Response({
            "code": 200,
            "message": message,
            "data": {
                "fabric_id": str(fabric_id),
                "is_favorited": is_favorited
            }
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_favorites(self, request):
        """获取我的收藏列表"""
        favorites = FabricFavorite.objects.filter(user=request.user)
        
        # 分页
        page = self.paginate_queryset(favorites)
        if page is not None:
            serializer = FabricFavoriteSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = FabricFavoriteSerializer(favorites, many=True)
        return Response({
            "code": 200,
            "message": "获取收藏列表成功",
            "data": serializer.data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def share_favorites(self, request):
        """生成收藏分享链接"""
        # 检查是否已有有效的分享链接
        existing_share = FavoriteShare.objects.filter(
            user=request.user,
            is_active=True
        ).first()
        
        if existing_share:
            serializer = FavoriteShareSerializer(
                existing_share, 
                context={'request': request}
            )
            return Response({
                "code": 200,
                "message": "获取分享链接成功",
                "data": serializer.data
            })
        
        # 创建新的分享链接
        share = FavoriteShare.objects.create(user=request.user)
        serializer = FavoriteShareSerializer(
            share,
            context={'request': request}
        )
        
        return Response({
            "code": 201,
            "message": "创建分享链接成功",
            "data": serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def shared_favorites(self, request):
        """获取分享的收藏列表（公开访问）"""
        share_token = request.query_params.get('token')
        if not share_token:
            return Response(
                {"code": 400, "message": "缺少分享令牌"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            share = FavoriteShare.objects.get(
                share_token=share_token,
                is_active=True
            )
        except FavoriteShare.DoesNotExist:
            return Response(
                {"code": 404, "message": "分享链接无效或已过期"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 增加查看次数
        share.increment_view_count()
        
        # 获取该用户的收藏列表
        favorites = FabricFavorite.objects.filter(user=share.user)
        
        serializer = FabricFavoriteSerializer(favorites, many=True)
        return Response({
            "code": 200,
            "message": "获取分享收藏列表成功",
            "data": {
                "share_info": {
                    "username": share.user.username,
                    "shared_at": share.created_at,
                    "view_count": share.view_count
                },
                "favorites": serializer.data
            }
        })
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def export_favorites_pdf(self, request):
        """导出收藏为PDF"""
        # 获取用户收藏的面料
        favorites = FabricFavorite.objects.filter(
            user=request.user
        ).select_related('fabric')
        
        if not favorites:
            return Response(
                {"code": 400, "message": "您还没有收藏任何面料"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 创建PDF
        buffer = io.BytesIO()
        
        # 创建PDF文档
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # 内容容器
        elements = []
        
        # 样式
        styles = getSampleStyleSheet()
        
        # 注册中文字体（需要在服务器上安装中文字体）
        # pdfmetrics.registerFont(TTFont('SimSun', 'simsun.ttc'))
        
        # 标题
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#333333'),
            spaceAfter=30,
            alignment=1  # 居中
        )
        elements.append(Paragraph('我的面料收藏', title_style))
        
        # 用户信息
        info_style = ParagraphStyle(
            'Info',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            spaceAfter=20,
            alignment=1
        )
        elements.append(
            Paragraph(
                f'收藏者：{request.user.username} | 导出时间：{timezone.now().strftime("%Y-%m-%d %H:%M")}',
                info_style
            )
        )
        
        # 创建表格数据
        data = [['参考编号', '面料编号', '成分', '克重', '工艺', '收藏时间']]
        
        for fav in favorites:
            fabric = fav.fabric
            # 格式化成分
            components = ', '.join([
                f"{comp.name} {comp.percentage}%"
                for comp in fabric.components.all()
            ])
            # 格式化工艺
            processes = ', '.join([
                opt.get('name', '')
                for opt in fabric.process_options
            ]) if fabric.process_options else '-'
            
            data.append([
                fabric.reference_code or '-',
                fabric.code,
                components,
                f"{fabric.weight} {fabric.weight_unit}",
                processes,
                fav.created_at.strftime('%Y-%m-%d')
            ])
        
        # 创建表格
        table = Table(data, repeatRows=1)
        
        # 表格样式
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # 生成PDF
        doc.build(elements)
        
        # 准备响应
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="fabric_favorites_{timezone.now().strftime("%Y%m%d")}.pdf"'
        
        return response

class VendorViewSet(viewsets.ModelViewSet):
    """供应商视图集"""
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            "code": 200,
            "message": "获取供应商列表成功",
            "data": serializer.data
        })
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({
            "code": 200,
            "message": "获取供应商详情成功",
            "data": serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({
            "code": 200,
            "message": "创建供应商成功",
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
            "message": "更新供应商成功",
            "data": serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            "code": 200,
            "message": "删除供应商成功"
        }, status=status.HTTP_200_OK) 