<template>
  <div class="admin-layout">
    <aside
      class="admin-sidebar"
      :class="{ 'admin-sidebar--collapsed': collapsed }"
    >
      <div class="admin-sidebar__brand">
        <span class="admin-sidebar__mark">◈</span>
        <span v-show="!collapsed" class="admin-sidebar__brand-text">Admin</span>
      </div>

      <nav class="admin-sidebar__nav">
        <router-link
          v-for="item in adminPrimaryNav"
          :key="item.path"
          :to="item.path"
          class="admin-sidebar__link"
          :class="{ 'admin-sidebar__link--active': isActive(item.path) }"
          :title="t(item.titleKey)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed">{{ t(item.titleKey) }}</span>
        </router-link>

        <template v-if="adminMoreNav.length">
          <div v-show="!collapsed" class="admin-sidebar__section-label">
            {{ t('admin.more') }}
          </div>
          <button
            v-show="collapsed"
            type="button"
            class="admin-sidebar__link admin-sidebar__link--toggle"
            :title="t('admin.more')"
            @click="moreExpanded = !moreExpanded"
          >
            <el-icon><MoreFilled /></el-icon>
          </button>
          <template v-if="!collapsed || moreExpanded">
            <router-link
              v-for="item in adminMoreNav"
              :key="item.path"
              :to="item.path"
              class="admin-sidebar__link admin-sidebar__link--secondary"
              :class="{ 'admin-sidebar__link--active': isActive(item.path) }"
              :title="t(item.titleKey)"
            >
              <el-icon><component :is="item.icon" /></el-icon>
              <span v-show="!collapsed">{{ t(item.titleKey) }}</span>
            </router-link>
          </template>
        </template>
      </nav>

      <div class="admin-sidebar__footer">
        <router-link
          v-for="item in adminFooterNav"
          :key="item.path"
          :to="item.path"
          class="admin-sidebar__link admin-sidebar__link--footer"
          :title="t(item.titleKey)"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span v-show="!collapsed">{{ t(item.titleKey) }}</span>
        </router-link>
        <button
          type="button"
          class="admin-sidebar__collapse-btn"
          :title="collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')"
          @click="toggle"
        >
          <el-icon><component :is="collapsed ? Expand : Fold" /></el-icon>
          <span v-show="!collapsed">{{ t('admin.collapseSidebar') }}</span>
        </button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/admin' }">{{ t('admin.home') }}</el-breadcrumb-item>
          <el-breadcrumb-item v-if="breadcrumbTitle">{{ breadcrumbTitle }}</el-breadcrumb-item>
        </el-breadcrumb>
        <div class="admin-topbar__actions">
          <el-button round size="small" @click="router.push('/')">
            {{ t('admin.viewStorefront') }}
          </el-button>
          <el-dropdown @command="handleCommand">
            <el-button round size="small">
              <el-icon class="mr-1"><User /></el-icon>
              {{ userStore.username }}
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">{{ t('auth.logout') }}</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="admin-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Expand, Fold, MoreFilled, User } from '@element-plus/icons-vue';
import { useUserStore } from '@/stores/user';
import { useAdminSidebar } from '@/composables/useAdminSidebar';
import { adminPrimaryNav, adminMoreNav, adminFooterNav } from '@/config/adminNav';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const { collapsed, toggle } = useAdminSidebar();
const moreExpanded = ref(false);

const breadcrumbTitle = computed(() => {
  const metaTitle = route.meta.adminTitleKey as string | undefined;
  return metaTitle ? t(metaTitle) : '';
});

function isActive(path: string) {
  if (path === '/admin') {
    return route.path === '/admin';
  }
  return route.path === path || route.path.startsWith(`${path}/`);
}

function handleCommand(command: string) {
  if (command === 'logout') {
    userStore.logout();
    router.push('/login');
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: var(--admin-content-bg, var(--fabric-bg));
}

.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--admin-sidebar-bg);
  color: var(--admin-sidebar-text);
  transition: width 0.25s ease;
}

.admin-sidebar--collapsed {
  width: 64px;
}

.admin-sidebar__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 1.1rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.admin-sidebar__mark {
  color: #c9a962;
  font-size: 1.1rem;
}

.admin-sidebar__brand-text {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #faf8f5;
}

.admin-sidebar__nav {
  flex: 1;
  padding: 0.75rem 0.5rem;
  overflow-y: auto;
}

.admin-sidebar__section-label {
  padding: 0.75rem 0.85rem 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(250, 248, 245, 0.35);
}

.admin-sidebar__link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  margin-bottom: 0.15rem;
  border-radius: 10px;
  color: rgba(250, 248, 245, 0.72);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: transparent;
  width: 100%;
  cursor: pointer;
  font-family: var(--font-body);
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-sidebar__link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #faf8f5;
}

.admin-sidebar__link--active {
  background: rgba(201, 169, 98, 0.18);
  color: #e8d5a8;
}

.admin-sidebar__link--secondary {
  opacity: 0.85;
}

.admin-sidebar__footer {
  padding: 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.admin-sidebar__collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.65rem 0.85rem;
  margin-top: 0.25rem;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: rgba(250, 248, 245, 0.5);
  font-size: 0.8125rem;
  cursor: pointer;
  font-family: var(--font-body);
}

.admin-sidebar__collapse-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #faf8f5;
}

.admin-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.admin-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--fabric-surface);
  border-bottom: 1px solid var(--fabric-border);
}

.admin-topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.admin-content {
  flex: 1;
  padding: 1.5rem;
  overflow: auto;
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 64px;
  }

  .admin-sidebar__brand-text,
  .admin-sidebar__section-label,
  .admin-sidebar__link span,
  .admin-sidebar__collapse-btn span {
    display: none;
  }
}
</style>
