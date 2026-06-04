from minio import Minio
from minio.error import S3Error
from django.conf import settings
import uuid
import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone

from .models import User

class MinioClient:
    """MinIO客户端工具类"""
    
    def __init__(self):
        self.client = Minio(
            endpoint=settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket_name = settings.MINIO_BUCKET_NAME
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """确保存储桶存在，不存在则创建"""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                # 设置存储桶策略为公开读
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Principal": {"AWS": "*"},
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"]
                        }
                    ]
                }
                self.client.set_bucket_policy(self.bucket_name, policy)
        except S3Error as e:
            print(f"Error creating bucket: {e}")
    
    def upload_file(self, file_obj, content_type, object_name):
        """上传文件到MinIO"""
        # 生成唯一的对象名
        try:
            self.client.put_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                data=file_obj,
                length=file_obj.size,
                content_type=content_type
            )
            return {
                "file_name": file_obj.name,
                "object_name": object_name,
                "size": file_obj.size,
                "content_type": content_type
            }
        except S3Error as e:
            print(f"Error uploading file: {e}")
            return None
    
    def get_file_url(self, object_name):
        """获取文件的访问URL"""
        try:
            # 生成预签名URL，有效期为7天
            url = self.client.presigned_get_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                expires=7*24*60*60  # 7天
            )
            return url
        except S3Error as e:
            print(f"Error getting file URL: {e}")
            return None
            
    def delete_file(self, object_name):
        """删除MinIO中的文件"""
        try:
            self.client.remove_object(
                bucket_name=self.bucket_name,
                object_name=object_name
            )
            return True
        except S3Error as e:
            print(f"Error deleting file: {e}")
            return False
    
    def get_file_stream(self, object_name):
        """获取文件流"""
        try:
            response = self.client.get_object(
                bucket_name=self.bucket_name,
                object_name=object_name
            )
            return response
        except S3Error as e:
            print(f"Error getting file stream: {e}")
            return None

def get_bucket_name():
    return settings.MINIO_BUCKET_NAME

IMAGE_PATH = 'images/admin/None'
OSS_PATH = 'oss'
SPLIT_SEG = "/"

def get_file_path(object_name):
    if IMAGE_PATH in object_name:
        object_name = object_name.replace(IMAGE_PATH, "")
    return SPLIT_SEG + OSS_PATH + SPLIT_SEG + settings.MINIO_BUCKET_NAME + object_name

def get_watermark_image_url(object_name):
    """ 返回水印图 """
    return settings.OSS_ENDPOINT + "/proxy/mark" + get_file_path(object_name)

def get_thumbnail_image_url(object_name):
    """ 返回缩略图 """
    return settings.OSS_ENDPOINT + "/proxy/thumb/" + get_file_path(object_name)

def get_short_image_url(object_name):
    """ 缩短 path """
    return settings.OSS_ENDPOINT + get_file_path(object_name)

def get_base_url():
    base_url = settings.MINIO_ENDPOINT
    bucket = settings.MINIO_BUCKET_NAME
    # 否则构建URL
    protocol = 'https' if settings.MINIO_SECURE else 'http'
    return f"{protocol}://{base_url}/{bucket}"

def get_image_url(object_name):
    """获取图片URL的辅助函数"""
    if not object_name:
        return None
        
    base_url = settings.MINIO_ENDPOINT
    bucket = settings.MINIO_BUCKET_NAME
    
    # 如果是完整URL，直接返回
    if object_name.startswith(('http://', 'https://')):
        return object_name
        
    # 否则构建URL
    base_url = get_base_url()
    return f"{base_url}/{object_name}"

class JWTAuthentication(BaseAuthentication):
    """JWT认证类"""
    
    def authenticate(self, request):
        """验证用户身份"""
        # 从请求头中获取token
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        
        try:
            # 解码JWT
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=['HS256']
            )
            
            # 检查令牌是否过期
            exp = payload.get('exp')
            if exp and exp < timezone.now().timestamp():
                raise AuthenticationFailed('认证令牌已过期，请重新登录')
                
            # 获取用户
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('无效的认证令牌')
                
            try:
                user = User.objects.get(user_id=user_id)
                
                # 检查用户状态
                if user.status == 'blocked':
                    raise AuthenticationFailed('用户账号已被封禁')
                    
                return (user, token)
                
            except User.DoesNotExist:
                raise AuthenticationFailed('用户不存在')
                
        except jwt.DecodeError:
            raise AuthenticationFailed('无效的认证令牌')
        except jwt.ExpiredSignatureError:            
            raise AuthenticationFailed('认证令牌已过期，请重新登录')
            
        return None 