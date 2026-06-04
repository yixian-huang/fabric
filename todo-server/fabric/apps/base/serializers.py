from rest_framework import serializers
from .models import Image, User
from .utils import get_image_url, get_short_image_url


class ImageSerializer(serializers.ModelSerializer):
    """图片序列化器"""
    url = serializers.SerializerMethodField()
    class Meta:
        model = Image
        fields = [
                'file_id', 'title', 'file_name', 'content_type', 'size', 'created_at', 'url',
                ]
        read_only_fields = ['file_id', 'file_name', 'object_name', 'content_type', 'size', 'created_at']
    
    def get_url(self, obj):
        return get_image_url(obj.url)
        

class ImageUploadSerializer(serializers.Serializer):
    """图片上传序列化器"""
    file = serializers.FileField()

class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""
    class Meta:
        model = User
        fields = [
            'user_id', 'username', 'email', 'nickname', 
            'status',  
            'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['user_id', 'created_at', 'updated_at', 'last_login']

class UserCreateSerializer(serializers.ModelSerializer):
    """用户创建序列化器"""
    password_confirm = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'password_confirm', 'email', 
            'nickname', 'status'
        ]
    
    def validate(self, data):
        # 验证两次密码是否一致
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "两次密码不一致"})
        
        # 验证用户名唯一性
        username = data.get('username')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "用户名已存在"})
        
        # 验证邮箱唯一性
        email = data.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "邮箱已被注册"})
            
        return data
    
    def create(self, validated_data):
        # 移除确认密码字段
        validated_data.pop('password_confirm', None)

        # 创建用户
        user = User(**validated_data)
        user.save()  # save方法会自动处理密码哈希
        
        return user

class UserUpdateSerializer(serializers.ModelSerializer):
    """用户更新序列化器"""
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)
    new_password_confirm = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = [
            'nickname', 'email', 'current_password', 'new_password', 
            'new_password_confirm', 'status'
        ]
    
    def validate(self, data):
        # 如果要修改密码
        if 'new_password' in data:
            # 确保提供了当前密码
            if 'current_password' not in data:
                raise serializers.ValidationError({"current_password": "修改密码需要提供当前密码"})
                
            # 确保提供了确认密码
            if 'new_password_confirm' not in data:
                raise serializers.ValidationError({"new_password_confirm": "请确认新密码"})
                
            # 验证当前密码是否正确
            if not self.instance.check_password(data['current_password']):
                raise serializers.ValidationError({"current_password": "当前密码不正确"})
                
            # 验证两次新密码是否一致
            if data['new_password'] != data['new_password_confirm']:
                raise serializers.ValidationError({"new_password_confirm": "两次密码不一致"})
        
        # 如果要修改邮箱，验证新邮箱是否已被使用
        if 'email' in data and data['email'] != self.instance.email:
            if User.objects.filter(email=data['email']).exists():
                raise serializers.ValidationError({"email": "邮箱已被注册"})
                
        return data
    
    def update(self, instance, validated_data):
        # 处理密码更新
        if 'new_password' in validated_data:
            instance.set_password(validated_data.pop('new_password'))
            validated_data.pop('current_password', None)
            validated_data.pop('new_password_confirm', None)
        
        # 更新其他字段
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

class LoginSerializer(serializers.Serializer):
    """登录序列化器"""
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError({"username": "用户名不存在"})
        
        if not user.check_password(password):
            raise serializers.ValidationError({"password": "密码不正确"})
            
        if user.status == 'blocked':
            raise serializers.ValidationError({"status": "账号已被封禁"})
            
        # 将验证通过的用户添加到上下文
        self.context['user'] = user
        return data 

class UserRegisterSerializer(serializers.ModelSerializer):
    """用户注册序列化器"""
    password_confirm = serializers.CharField(write_only=True, required=True)
    email_subscription = serializers.BooleanField(default=False)
    
    class Meta:
        model = User
        fields = [
            'username', 'password', 'password_confirm', 'email',
            'nickname', 'email_subscription'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }
    
    def validate(self, data):
        # 验证两次密码是否一致
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "两次密码不一致"})
        
        # 验证用户名唯一性
        username = data.get('username')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "用户名已存在"})
        
        # 验证邮箱唯一性
        email = data.get('email')
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "邮箱已被注册"})
        
        # 邮箱格式验证
        from django.core.validators import validate_email
        try:
            validate_email(email)
        except Exception:
            raise serializers.ValidationError({"email": "邮箱格式不正确"})
            
        return data
    
    def create(self, validated_data):
        # 移除确认密码字段
        validated_data.pop('password_confirm', None)
        
        # 创建用户，默认状态为inactive，需要邮箱验证
        user = User(**validated_data)
        user.status = 'inactive'
        user.save()  # save方法会自动处理密码哈希
        
        return user


class EmailVerificationSerializer(serializers.Serializer):
    """邮箱验证序列化器"""
    token = serializers.CharField(required=True) 