<!-- todo-web/src/components/AppHeader.vue -->
<template>
  <div>
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">DAILY SILK FABRIC HUB</h1>
        <div class="header-actions">
          <LanguageSwitcher class="language-switcher" />
          <div v-if="!userStore.isLoggedIn" class="auth-buttons">
            <el-button @click="showRegisterDialog = true">注册</el-button>
            <el-button type="primary" @click="showLoginDialog = true">登录</el-button>
          </div>
          <div v-else class="user-actions">
            <el-button @click="showFavoritePanel = true">
              <el-icon><Star /></el-icon>
              {{ $t("favorite.myFavorites") }} ({{ favoriteStore.favoriteCount }})
            </el-button>
            <el-dropdown>
              <el-button>
                <el-icon><User /></el-icon>
                {{ userStore.username }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 登录对话框 -->
    <LoginDialog 
      v-model="showLoginDialog" 
      @success="handleLoginSuccess"
      @switch-to-register="handleSwitchToRegister" 
    />
    
    <!-- 注册对话框 -->
    <RegisterDialog 
      v-model="showRegisterDialog" 
      @success="handleRegisterSuccess"
      @switch-to-login="handleSwitchToLogin"
    />
    
    <!-- 收藏面板 -->
    <FavoritePanel v-model="showFavoritePanel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Star, User } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useFavoriteStore } from '../stores/favorite'
import LanguageSwitcher from './LanguageSwitcher.vue'
import LoginDialog from './auth/LoginDialog.vue'
import RegisterDialog from './auth/RegisterDialog.vue'
import FavoritePanel from './FavoritePanel.vue'
import { useI18n } from 'vue-i18n';
  
const { t } = useI18n();
const router = useRouter()
const userStore = useUserStore()
const favoriteStore = useFavoriteStore()

const showRegisterDialog = ref(false)
const showFavoritePanel = ref(false)

// 使用状态管理中的 showLoginDialog
const showLoginDialog = computed({
  get: () => userStore.showLoginDialog,
  set: (value) => {
    if (value) {
      userStore.openLoginDialog()
    } else {
      userStore.closeLoginDialog()
    }
  }
})

const handleLoginSuccess = () => {
  showLoginDialog.value = false
  ElMessage.success('登录成功')
  // 登录成功后获取收藏数量
  favoriteStore.fetchFavoriteCount()
}

const handleRegisterSuccess = () => {
  showRegisterDialog.value = false
  ElMessage.success('注册成功，请查收邮件进行验证')
}

const handleSwitchToRegister = () => {
  showLoginDialog.value = false
  showRegisterDialog.value = true
}

const handleSwitchToLogin = () => {
  showRegisterDialog.value = false
  showLoginDialog.value = true
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('退出登录成功')
  router.push('/')
}
</script>

<style scoped>
.app-header {
  background-color: #64748b;
  color: white;
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.app-title {
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-buttons,
.user-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .app-title {
    font-size: 1.2rem;
  }
}
</style>