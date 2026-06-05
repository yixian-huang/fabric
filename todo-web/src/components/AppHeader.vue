<!-- todo-web/src/components/AppHeader.vue -->
<template>
  <div>
    <header class="app-header">
      <div class="header-content">
        <router-link to="/" class="brand">
          <span class="brand__mark" aria-hidden="true">◈</span>
          <span class="brand__text">
            <span class="brand__name">DAILY SILK</span>
            <span class="brand__sub">Fabric Hub</span>
          </span>
        </router-link>
        <div class="header-actions">
          <LanguageSwitcher class="language-switcher" />
          <div v-if="!userStore.isLoggedIn" class="auth-buttons">
            <el-button round class="header-btn header-btn--ghost" @click="showRegisterDialog = true">
              {{ t('auth.register') }}
            </el-button>
            <el-button round type="primary" class="header-btn header-btn--primary" @click="showLoginDialog = true">
              {{ t('auth.login') }}
            </el-button>
          </div>
          <div v-else class="user-actions">
            <el-button round class="header-btn header-btn--ghost" @click="showFavoritePanel = true">
              <el-icon><Star /></el-icon>
              {{ t('favorite.myFavorites') }}
              <span class="header-count">{{ favoriteStore.favoriteCount }}</span>
            </el-button>
            <el-dropdown>
              <el-button round class="header-btn header-btn--ghost">
                <el-icon><User /></el-icon>
                {{ userStore.username }}
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">{{ t('auth.logout') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </header>

    <LoginDialog
      v-model="showLoginDialog"
      @success="handleLoginSuccess"
      @switch-to-register="handleSwitchToRegister"
    />

    <RegisterDialog
      v-model="showRegisterDialog"
      @success="handleRegisterSuccess"
      @switch-to-login="handleSwitchToLogin"
    />

    <FavoritePanel v-model="showFavoritePanel" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Star, User } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useFavoriteStore } from '../stores/favorite';
import LanguageSwitcher from './LanguageSwitcher.vue';
import LoginDialog from './auth/LoginDialog.vue';
import RegisterDialog from './auth/RegisterDialog.vue';
import FavoritePanel from './FavoritePanel.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const router = useRouter();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

const showRegisterDialog = ref(false);
const showFavoritePanel = ref(false);

const showLoginDialog = computed({
  get: () => userStore.showLoginDialog,
  set: (value) => {
    if (value) {
      userStore.openLoginDialog();
    } else {
      userStore.closeLoginDialog();
    }
  },
});

const handleLoginSuccess = () => {
  showLoginDialog.value = false;
  ElMessage.success(t('auth.loginSuccess'));
  favoriteStore.fetchFavoriteCount();
};

const handleRegisterSuccess = () => {
  showRegisterDialog.value = false;
  ElMessage.success(t('auth.registerSuccess'));
};

const handleSwitchToRegister = () => {
  showLoginDialog.value = false;
  showRegisterDialog.value = true;
};

const handleSwitchToLogin = () => {
  showRegisterDialog.value = false;
  showLoginDialog.value = true;
};

const handleLogout = () => {
  userStore.logout();
  ElMessage.success(t('auth.logoutSuccess'));
  router.push('/');
};
</script>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(28, 25, 23, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.85rem 1.5rem;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1440px;
  margin: 0 auto;
  gap: 1rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  text-decoration: none;
  color: inherit;
}

.brand__mark {
  font-size: 1.25rem;
  color: #c9a962;
  line-height: 1;
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}

.brand__name {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #faf8f5;
}

.brand__sub {
  font-size: 0.68rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(250, 248, 245, 0.55);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.auth-buttons,
.user-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.header-btn--ghost {
  background: rgba(255, 255, 255, 0.06) !important;
  border-color: rgba(255, 255, 255, 0.12) !important;
  color: rgba(250, 248, 245, 0.9) !important;
}

.header-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.12) !important;
  border-color: rgba(201, 169, 98, 0.4) !important;
}

.header-btn--primary {
  background: linear-gradient(135deg, #b8956a 0%, #9a7b4f 100%) !important;
  border: none !important;
  color: #fff !important;
}

.header-count {
  margin-left: 0.35rem;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(201, 169, 98, 0.25);
  color: #e8d5a8;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }
}
</style>
