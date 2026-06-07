<template>
  <div id="app" class="app-shell">
    <AppHeader v-if="!isAdminRoute" />
    <main class="app-main">
      <router-view />
    </main>
    <AppFooter v-if="!isAdminRoute" />
    
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
import AppFooter from '@/components/AppFooter.vue'
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
#app.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style> 