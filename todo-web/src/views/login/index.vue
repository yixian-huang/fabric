<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          账号登录
        </h2>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <div class="rounded-md shadow-sm space-y-4">
          <div>
            <el-input 
              v-model="username" 
              placeholder="用户名" 
              :disabled="loading"
            />
          </div>
          <div>
            <el-input 
              v-model="password" 
              type="password" 
              placeholder="密码" 
              :disabled="loading"
            />
          </div>
        </div>

        <div>
          <el-button 
            type="primary" 
            native-type="submit" 
            class="w-full" 
            :loading="loading"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/user';

const username = ref('');
const password = ref('');
const router = useRouter();
const userStore = useUserStore();

const loading = computed(() => userStore.loading);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.error('用户名和密码不能为空');
    return;
  }

  try {
    // 调用登录API
    await userStore.login({
      username: username.value,
      password: password.value
    });
    
    ElMessage.success('登录成功，正在跳转到首页...');
    
    // 登录成功后跳转到首页
    router.push('/admin');
  } catch (error: any) {
    // 错误处理已在store中完成
    console.error('登录失败', error);
  }
};
</script>

<style scoped>
.el-button {
  height: 40px;
}
</style> 