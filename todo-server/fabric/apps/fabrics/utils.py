from minio import Minio
from minio.error import S3Error
from django.conf import settings
import uuid

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
    
    def upload_file(self, file_obj, content_type):
        """上传文件到MinIO"""
        # 生成唯一的对象名
        object_name = "images/" + f"{uuid.uuid4()}.{file_obj.name.split('.')[-1]}"
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