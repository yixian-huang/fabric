<template>
    <el-drawer
      v-model="visible"
      :title="$t('favorite.myFavorites')"
      direction="rtl"
      size="60%"
      @open="fetchFavorites"
    >
      <div class="favorite-header">
        <div class="favorite-stats">
          {{ $t('favorite.favoriteCount', { count: favorites.length }) }}
        </div>
        <div class="favorite-actions">
          <el-button @click="handleShare" :loading="shareLoading">
            <el-icon><Share /></el-icon>
            {{ $t('favorite.shareFavorites') }}
          </el-button>
          <el-button type="primary" @click="handleExportPDF">
            <el-icon><Download /></el-icon>
            {{ $t('fabric.downloadPDF') }}
          </el-button>
        </div>
      </div>
      
      <div class="favorite-content">
        <el-table
          v-loading="loading"
          :data="favorites"
          :empty-text="$t('favorite.noFavorites')"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55" />
          <el-table-column 
            prop="fabric.reference_code" 
            :label="$t('fabric.referenceNo')" 
            width="120" 
          />
          <el-table-column 
            prop="fabric.code" 
            :label="$t('fabric.fabricCode')" 
            width="120" 
          />
          <el-table-column :label="$t('fabric.photo')" width="100">
            <template #default="scope">
              <el-image
                :src="scope.row.fabric.thumbnail_url"
                :preview-src-list="[scope.row.fabric.watermark_image_url]"
                fit="cover"
                style="width: 60px; height: 60px"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('fabric.fabricDetailTitle')">
            <template #default="scope">
              <div>{{ formatComposition(scope.row.fabric.components) }}</div>
              <div class="text-gray-500 text-sm">
                {{ scope.row.fabric.weight }} {{ scope.row.fabric.weight_unit }}
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="$t('fabric.operation')" width="120">
            <template #default="scope">
              <el-button
                type="danger"
                size="small"
                @click="handleRemoveFavorite(scope.row)"
              >
                {{ $t('fabric.removeFavorite') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 分享链接对话框 -->
      <el-dialog
        v-model="showShareDialog"
        :title="$t('favorite.shareLink')"
        width="500px"
      >
        <div class="share-content">
          <el-input
            v-model="shareUrl"
            readonly
            ref="shareInputRef"
          >
            <template #append>
              <el-button @click="copyShareLink">{{ $t('common.copy') }}</el-button>
            </template>
          </el-input>
          <p class="share-tip">{{ $t('favorite.shareTip') }}</p>
        </div>
      </el-dialog>
    </el-drawer>
  </template>
  
  <script setup lang="ts">
  import { ref, computed } from 'vue'
  import { Share, Download } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import { useFavoriteStore } from '@/stores/favorite'
  import { usePrintStore } from '@/stores/print'
  import { formatComposition } from '@/utils/fabric'
  import { resolveFavoriteShareUrl, shareFavorites } from '@/api/favorite'
  
  const { t } = useI18n()
  const favoriteStore = useFavoriteStore()
  const printStore = usePrintStore()
  
  const props = defineProps<{
    modelValue: boolean
  }>()
  
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
  }>()
  
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  
  const loading = ref(false)
  const shareLoading = ref(false)
  const showShareDialog = ref(false)
  const shareUrl = ref('')
  const shareInputRef = ref()
  const selectedFavorites = ref<any[]>([])
  
  const favorites = computed(() => favoriteStore.favorites)
  
  const fetchFavorites = async () => {
    loading.value = true
    try {
      await favoriteStore.fetchFavorites()
    } finally {
      loading.value = false
    }
  }
  
  const handleSelectionChange = (selection: any[]) => {
    selectedFavorites.value = selection
  }
  
  const handleRemoveFavorite = async (favorite: any) => {
    try {
      await ElMessageBox.confirm(
        t('fabric.confirmRemoveFavorite'),
        t('common.tip'),
        {
          confirmButtonText: t('common.confirm'),
          cancelButtonText: t('common.cancel'),
          type: 'warning'
        }
      )
      
      await favoriteStore.toggleFavorite(favorite.fabric.fabric_id)
      ElMessage.success(t('fabric.removeFavoriteSuccess'))
    } catch {
      // 用户取消
    }
  }
  
  const handleShare = async () => {
    shareLoading.value = true
    try {
      const response = await shareFavorites()
      const url = resolveFavoriteShareUrl(response.data)
      if (!url) {
        throw new Error('missing share token')
      }
      shareUrl.value = url
      showShareDialog.value = true
    } catch (error) {
      ElMessage.error(t('favorite.shareError'))
    } finally {
      shareLoading.value = false
    }
  }
  
  const copyShareLink = async () => {
    if (!shareUrl.value) return
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      ElMessage.success(t('common.copySuccess'))
    } catch {
      shareInputRef.value?.select()
      document.execCommand('copy')
      ElMessage.success(t('common.copySuccess'))
    }
  }
  
  const handleExportPDF = () => {
    // 确定要导出的收藏：如果有选中项则导出选中的，否则导出全部
    const favoritesToExport = selectedFavorites.value.length > 0 
      ? selectedFavorites.value 
      : favorites.value
    
    if (favoritesToExport.length === 0) {
      ElMessage.warning(t('fabric.noFavoritesToExport'))
      return
    }
    
    // 提取 fabric 对象并打开打印预览
    const fabricsForPrint = favoritesToExport.map(f => f.fabric)
    printStore.openPrintPreview(fabricsForPrint, false)
  }
  </script>
  
  <style scoped>
  .favorite-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .favorite-stats {
    font-size: 16px;
    color: #606266;
  }
  
  .favorite-actions {
    display: flex;
    gap: 10px;
  }
  
  .favorite-content {
    height: calc(100% - 70px);
    overflow-y: auto;
  }
  
  .share-content {
    padding: 10px 0;
  }
  
  .share-tip {
    margin-top: 15px;
    color: #909399;
    font-size: 14px;
  }
  </style>
  