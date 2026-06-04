from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ImageViewSet, UserViewSet

router = DefaultRouter()
router.register(r'images', ImageViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    
    # 添加用户认证相关URL
    path('auth/login', UserViewSet.as_view({'post': 'login'}), name='user-login'),
    path('auth/me', UserViewSet.as_view({'get': 'me'}), name='user-me'),
    path('auth/register', UserViewSet.as_view({'post': 'register'}), name='user-register'),
    path('auth/verify-email', UserViewSet.as_view({'post': 'verify_email'}), name='user-verify-email'),
    path('auth/resend-verification', UserViewSet.as_view({'post': 'resend_verification'}), name='user-resend-verification'),
    path('me/favorite-count', UserViewSet.as_view({'get': 'favorite_count'}), name='user-favorite-count'),
] 