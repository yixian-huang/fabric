<template>
  <div class="h-screen flex flex-col">
    <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
      <div class="flex items-center">
        <h1 class="text-xl font-bold text-gray-800">纺织项目管理系统</h1>
      </div>
      <div class="flex items-center space-x-4">
        <el-dropdown trigger="click" @command="handleCommand">
          <div class="flex items-center space-x-2 cursor-pointer">
            <el-avatar :size="32">{{ userInitial }}</el-avatar>
            <span class="text-gray-700">{{ userStore.username || '用户' }}</span>
            <el-icon><CaretBottom /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout" divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="flex-1 flex overflow-hidden">
      <aside :class="['bg-white border-r border-gray-200 flex flex-col transition-all duration-300', isCollapse ? 'w-16' : 'w-64']">
        <div class="flex justify-end p-2">
          <el-button type="text" @click="toggleCollapse" class="!p-1">
            <el-icon :size="20">
              <component :is="isCollapse ? Expand : Fold" />
            </el-icon>
          </el-button>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="border-0 flex-1 overflow-y-auto"
          :collapse="isCollapse"
          router
        >
          <el-menu-item v-for="item in menuRoutes" :key="item.path" :index="item.path">
            <el-icon>
              <component :is="item.meta?.icon" />
            </el-icon>
            <template #title>
              <span>{{ item.meta?.title }}</span>
            </template>
          </el-menu-item>
        </el-menu>
      </aside>

      <main class="flex-1 overflow-auto bg-gray-50 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { Expand, Fold } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const isCollapse = ref(true);

const menuRoutes = computed(() => {
  const menuRoute = router.options.routes.find((r) => r.path === '/menu');
  return (menuRoute?.children ?? []).map((child) => ({
    ...child,
    path: `/menu/${child.path}`,
  }));
});

const activeMenu = computed(() => route.path);

const userInitial = computed(() => userStore.username?.charAt(0)?.toUpperCase() || 'U');

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

const handleCommand = (command: string) => {
  if (command === 'logout') {
    userStore.logout();
    router.push('/login');
  }
};

onMounted(() => {
  if (userStore.isLoggedIn && !userStore.userInfo) {
    userStore.fetchUserInfo();
  }
});
</script>
