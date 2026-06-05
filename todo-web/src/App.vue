<template>
  <div id="app">
    <AppHeader v-if="!isAdminRoute" />
    <router-view />
    
    <!-- 全局打印预览弹窗 -->
    <PrintPreviewDialog
      :visible="printStore.showPrintPreview"
      @update:visible="printStore.closePrintPreview()"
      :fabrics="printStore.fabricsForPrint"
      :print="printStore.autoPrint"
    />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import PrintPreviewDialog from '@/components/PrintPreviewDialog.vue'
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useFavoriteStore } from '@/stores/favorite'
import { usePrintStore } from '@/stores/print'

const route = useRoute()
const userStore = useUserStore()
const favoriteStore = useFavoriteStore()
const printStore = usePrintStore()
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

onMounted(async () => {
  // 如果已登录，获取用户信息和收藏数量
  if (userStore.isLoggedIn) {
    await userStore.fetchUserInfo()
    await favoriteStore.fetchFavoriteCount()
  }
})
</script>

<style>
/* ... 现有样式 ... */
</style> 