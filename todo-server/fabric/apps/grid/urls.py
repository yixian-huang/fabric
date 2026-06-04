from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GridProjectViewSet, GridColumnViewSet, GridRowViewSet, GridCellViewSet, GridSharedViewSet, GridVendorShareViewSet

router = DefaultRouter()
router.register(r'projects', GridProjectViewSet)
router.register(r'columns', GridColumnViewSet)
router.register(r'rows', GridRowViewSet)
router.register(r'cells', GridCellViewSet)
router.register(r'shared', GridSharedViewSet)
router.register(r'vendor-share', GridVendorShareViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('rows/get_rows', GridRowViewSet.as_view({'get': 'get_rows'}), name='get-rows'),
    # path('cells/batch/', GridCellViewSet.as_view({'post': 'batch_update'}), name='batch-update-cells'),
    path('cells/update', GridCellViewSet.as_view({'patch': 'create_or_update'}), name='create-or-update-cell'),
    path('shared/access', GridSharedViewSet.as_view({'get': 'access'}), name='access-shared-link'),
    path('shared/project_access', GridSharedViewSet.as_view({'get': 'project_access'}), name='access-shared-project'),
    path('shared/update_vendor_remark', GridSharedViewSet.as_view({'post': 'update_vendor_remark'}), name='update-vendor-remark'),
    path('vendor-share/access', GridVendorShareViewSet.as_view({'get': 'access'}), name='access-vendor-share'),
    path('vendor-share/generate', GridVendorShareViewSet.as_view({'post': 'generate_vendor_links'}), name='generate-vendor-links'),
    path('vendor-share/vendor_access', GridVendorShareViewSet.as_view({'get': 'vendor_access'}), name='vendor-access'),
    path('vendor-share/update_vendor_remark', GridVendorShareViewSet.as_view({'post': 'update_vendor_remark'}), name='update-vendor-remark'),
] 