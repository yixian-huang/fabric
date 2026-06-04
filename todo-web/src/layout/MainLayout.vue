<template>
  <div class="h-screen flex flex-col">
    <!-- 顶部导航栏 -->
    <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6 border-b border-gray-200">
      <div class="flex items-center">
        <h1 class="text-xl font-bold text-gray-800">纺织项目管理系统</h1>
      </div>
      <div class="flex items-center space-x-4">
        <el-dropdown trigger="click">
          <div class="flex items-center space-x-2 cursor-pointer">
            <img :src="userAvatar" alt="用户头像" class="w-8 h-8 rounded-full object-cover" />
            <span class="text-gray-700">{{ userName }}</span>
            <el-icon><CaretBottom /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item>
                <el-icon><User /></el-icon>个人中心
              </el-dropdown-item>
              <el-dropdown-item>
                <el-icon><Setting /></el-icon>设置
              </el-dropdown-item>
              <el-dropdown-item divided>
                <el-icon><SwitchButton /></el-icon>退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>
    
    <div class="flex-1 flex overflow-hidden">
      <!-- 侧边栏 -->
      <aside :class="['bg-white border-r border-gray-200 flex flex-col transition-all duration-300', isCollapse ? 'w-16' : 'w-64']">
        <div class="flex justify-end p-2">
          <el-button type="text" @click="toggleCollapse" class="!p-1">
            <el-icon :size="20">
              <component :is="isCollapse ? 'Expand' : 'Fold'" />
            </el-icon>
          </el-button>
        </div>
        <el-menu
          :default-active="activeMenu"
          class="border-0 flex-1 overflow-y-auto"
          :collapse="isCollapse"
          router
        >
          <el-menu-item v-for="route in routes" :key="route.path" :index="route.path">
            <el-icon>
              <component :is="route.meta?.icon" />
            </el-icon>
            <template #title>
              <span>{{ route.meta?.title }}</span>
            </template>
          </el-menu-item>
        </el-menu>
      </aside>
      
      <!-- 主内容区域 -->
      <main class="flex-1 overflow-auto bg-gray-50 p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '@/stores/project';
import { Expand, Fold } from '@element-plus/icons-vue';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();

const { userName, userAvatar } = projectStore;

// 侧边栏收缩状态
const isCollapse = ref(true);

// 切换侧边栏收缩状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

// 路由信息
const routes = computed(() => {
  return router.options.routes[0].children || [];
});

// 当前活动菜单
const activeMenu = computed(() => {
  return '/' + route.path.split('/')[1];
});
</script> 