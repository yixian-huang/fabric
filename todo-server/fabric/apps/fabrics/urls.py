from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FabricViewSet, VendorViewSet

router = DefaultRouter()
router.register(r'fabrics', FabricViewSet)
router.register(r'vendors', VendorViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('list', FabricViewSet.as_view({'get': 'list'}), name='fabric-list'),
    path('list_public', FabricViewSet.as_view({'get': 'list_public'}), name='fabric-list-public'),
    path('get_options', FabricViewSet.as_view({'get': 'get_options'}), name='get-options'),
    path('check_fabric_code', FabricViewSet.as_view({'get': 'check_fabric_code'}), name='check-fabric-code'),
    path('record_visit', FabricViewSet.as_view({'post': 'record_visit'}), name='record-visit'),
    path('visitor_stats', FabricViewSet.as_view({'get': 'visitor_stats'}), name='visitor-stats'),
    path('create_option', FabricViewSet.as_view({'post': 'create_option'}), name='create-option'),
    path('update_option/<uuid:option_id>', FabricViewSet.as_view({'put': 'update_option'}), name='update-option'),
    path('delete_option/<uuid:option_id>', FabricViewSet.as_view({'delete': 'delete_option'}), name='delete-option'),
    path('toggle_favorite', FabricViewSet.as_view({'post': 'toggle_favorite'}), name='toggle-favorite'),
] 