<template>
  <div class="auth-page fabric-page">
    <div class="auth-card fabric-surface">
      <div class="auth-card__brand">
        <span class="auth-card__mark" aria-hidden="true">◈</span>
        <h1 class="auth-card__title">{{ t('auth.login') }}</h1>
        <p class="auth-card__subtitle">DAILY SILK · Fabric Hub</p>
      </div>

      <el-form class="auth-form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="username"
            :placeholder="t('auth.usernamePlaceholder')"
            prefix-icon="User"
            size="large"
            :disabled="loading"
          />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            prefix-icon="Lock"
            size="large"
            show-password
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-button
          type="primary"
          native-type="submit"
          round
          class="auth-submit"
          :loading="loading"
        >
          {{ loading ? t('auth.loggingIn') : t('auth.login') }}
        </el-button>
      </el-form>

      <p class="auth-back">
        <router-link to="/">{{ t('common.backToHome') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '@/stores/user';

const username = ref('');
const password = ref('');
const router = useRouter();
const userStore = useUserStore();
const { t } = useI18n();

const loading = computed(() => userStore.loading);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.error(t('auth.credentialsRequired'));
    return;
  }

  try {
    await userStore.login({
      username: username.value,
      password: password.value,
    });

    ElMessage.success(t('auth.loginSuccess'));
    router.push('/admin');
  } catch (error) {
    console.error('登录失败', error);
  }
};
</script>

<style scoped>
.auth-form :deep(.el-form-item) {
  margin-bottom: 1rem;
}

.auth-form :deep(.el-input__wrapper) {
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--fabric-border) inset;
}

.auth-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--fabric-accent) inset !important;
}

.auth-submit {
  width: 100%;
  height: 44px;
  margin-top: 0.5rem;
  font-weight: 600;
  background: linear-gradient(135deg, #b8956a 0%, #9a7b4f 100%) !important;
  border: none !important;
}

.auth-back {
  margin: 1.25rem 0 0;
  text-align: center;
  font-size: 0.875rem;
}

.auth-back a {
  color: var(--fabric-accent);
  text-decoration: none;
  font-weight: 500;
}

.auth-back a:hover {
  text-decoration: underline;
}
</style>
