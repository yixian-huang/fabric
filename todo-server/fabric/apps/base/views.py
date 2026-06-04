from django.shortcuts import render
from rest_framework import viewsets, status, parsers
from rest_framework.decorators import action, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.http import HttpResponse, Http404
import uuid
import jwt
from django.conf import settings

from .models import Image, User
from fabric.apps.fabrics.models import FabricFavorite
from .serializers import (
    ImageSerializer, ImageUploadSerializer, UserRegisterSerializer, EmailVerificationSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer
)
from .utils import MinioClient

available_file_exts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'jpg', 'jpeg', 'png']
is_check_file_ext = False

class ImageViewSet(viewsets.ModelViewSet):
    """图片视图集，提供图片相关的CRUD操作"""
    queryset = Image.objects.all()
    serializer_class = ImageSerializer
    
    def get_serializer_class(self):
        if self.action == 'upload':
            return ImageUploadSerializer
        return ImageSerializer
    
    def get_permissions(self):
        if self.action in ['download_file']:
            return [AllowAny()]
        return [IsAuthenticated()]
    
    @action(detail=False, methods=['post'], parser_classes=[parsers.MultiPartParser, parsers.FormParser])
    def upload(self, request):
        """处理图片上传"""
        serializer = self.get_serializer(data=request.data)
        
        if serializer.is_valid():
            file_obj = serializer.validated_data['file']
            file_original_name = file_obj.name
            file_ext = file_original_name.split('.')[-1]

            if is_check_file_ext and file_ext not in available_file_exts:
                return Response(
                    {"code": 400, "message": "文件类型不支持"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            content_type = file_obj.content_type
            
            username = request.user.username
            project_id = request.data.get('project_id')

            # 上传到MinIO
            minio_client = MinioClient()

            file_path = "images"
            if file_ext in ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip']:
                file_path = "files"

            object_name = f"{file_path}/{username}/{project_id}/{uuid.uuid4()}.{file_ext}"
            result = minio_client.upload_file(file_obj, content_type, object_name)
            
            if result:
                object_name = result['object_name']
                
                # 保存图片信息到数据库
                image = Image.objects.create(
                    file_id=uuid.uuid4(),
                    title=result['file_name'],
                    file_name=file_original_name,
                    file_ext=file_ext,
                    object_name=object_name,
                    content_type=result['content_type'],
                    size=result['size'],
                    url=object_name
                )
                
                # 使用模型序列化器返回结果
                response_serializer = ImageSerializer(image)
                return Response(
                    {
                        "code": 200,
                        "message": "图片上传成功",
                        "data": {
                            **response_serializer.data,
                            "url": object_name
                        }
                    }, 
                    status=status.HTTP_201_CREATED
                )
            
            return Response(
                {"code": 400, "message": "上传图片到存储服务失败"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response(
            {"code": 400, "message": "请求数据验证失败", "errors": serializer.errors}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=False, methods=['get'])
    def download_file(self, request):
        """下载文件流"""
        file_id = request.query_params.get('file_id')
        
        if not file_id:
            return Response(
                {"code": 400, "message": "file_id 参数是必需的"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 根据 file_id 查找文件记录
            image = Image.objects.get(file_id=file_id)
        except Image.DoesNotExist:
            raise Http404("文件不存在")
        
        # 从 MinIO 获取文件流
        minio_client = MinioClient()
        file_stream = minio_client.get_file_stream(image.object_name)
        
        if not file_stream:
            return Response(
                {"code": 500, "message": "无法获取文件流"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # 创建 HTTP 响应
        response = HttpResponse(file_stream.data, content_type=image.content_type)
        response['Content-Disposition'] = f'attachment; filename="{image.file_name}"'
        response['Content-Length'] = image.size
        
        return response

from .services.email_service import send_verification_email as send_user_verification_email, send_welcome_email

class UserViewSet(viewsets.ModelViewSet):
    """用户视图集，提供用户相关的CRUD操作"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'login':
            return LoginSerializer
        return UserSerializer
    
    def get_permissions(self):
        if self.action in ['create', 'login', 'register', 'verify_email', 'resend_verification']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    def create(self, request, *args, **kwargs):
        """创建用户/注册"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            {
                "code": 200,
                "message": "用户注册成功",
                "data": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """更新用户信息"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response(
            {
                "code": 200,
                "message": "更新用户信息成功",
                "data": UserSerializer(user).data
            }
        )
    
    def retrieve(self, request, *args, **kwargs):
        """获取用户详情"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response(
            {
                "code": 200,
                "message": "获取用户详情成功",
                "data": serializer.data
            }
        )
    
    def list(self, request, *args, **kwargs):
        """获取用户列表"""
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        return Response(
            {
                "code": 200,
                "message": "获取用户列表成功",
                "data": {
                    "items": serializer.data,
                    "total": queryset.count()
                }
            }
        )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def login(self, request):
        """用户登录"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = serializer.context['user']
        
        # 更新最后登录时间
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # 生成JWT令牌
        token = jwt.encode(
            {
                'user_id': str(user.user_id),
                'username': user.username,
                'exp': timezone.now() + timezone.timedelta(days=7)  # 7天有效期
            },
            settings.SECRET_KEY,
            algorithm='HS256'
        )
        
        return Response(
            {
                "code": 200,
                "message": "登录成功",
                "data": {
                    "token": token,
                    "user": UserSerializer(user).data
                }
            }
        )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """获取当前登录用户信息"""
        user = request.user
        return Response(
            {
                "code": 200,
                "message": "获取当前用户信息成功",
                "data": UserSerializer(user).data
            }
        )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        """用户注册"""
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # 生成验证令牌
        token = user.generate_verification_token()
        
        # 发送验证邮件
        email_sent = send_user_verification_email(user, token)
        if not email_sent:
            # 记录日志，但不影响注册流程
            pass
        
        return Response(
            {
                "code": 200,
                "message": "注册成功，请查收邮件进行验证",
                "data": UserSerializer(user).data
            },
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def verify_email(self, request):
        """邮箱验证"""
        serializer = EmailVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        
        # 查找对应的用户
        try:
            user = User.objects.get(verification_token=token)
        except User.DoesNotExist:
            return Response(
                {"code": 400, "message": "无效的验证令牌"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 验证邮箱
        if user.verify_email(token):
            # 发送欢迎邮件
            send_welcome_email(user)
            
            return Response(
                {
                    "code": 200,
                    "message": "邮箱验证成功，账号已激活",
                    "data": UserSerializer(user).data
                }
            )
        else:
            return Response(
                {"code": 400, "message": "验证令牌已过期"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def resend_verification(self, request):
        """重发验证邮件"""
        email = request.data.get('email')
        if not email:
            return Response(
                {"code": 400, "message": "请提供邮箱地址"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"code": 404, "message": "邮箱未注册"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if user.email_verified:
            return Response(
                {"code": 400, "message": "邮箱已经验证过了"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 生成新的验证令牌
        token = user.generate_verification_token()
        
        # 发送验证邮件
        email_sent = send_user_verification_email(user, token)
        if not email_sent:
            # 记录日志，但不影响重发流程
            pass
        
        return Response(
            {"code": 200, "message": "验证邮件已重新发送"}
        )
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def favorite_count(self, request):
        """获取用户收藏数量"""
        user = request.user
        count = FabricFavorite.objects.filter(user=user).count()
        return Response({
            "code": 200,
            "data": {"count": count}
        })
