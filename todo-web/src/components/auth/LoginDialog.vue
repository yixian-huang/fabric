<!-- todo-web/src/components/auth/LoginDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    width="420px"
    class="fabric-auth-dialog"
    :close-on-click-modal="false"
    :show-close="true"
  >
    <template #header>
      <div class="fabric-auth-dialog__header">
        <span class="fabric-auth-dialog__mark" aria-hidden="true">◈</span>
        <div>
          <h2 class="fabric-auth-dialog__title">{{ t('auth.login') }}</h2>
          <p class="fabric-auth-dialog__subtitle">DAILY SILK · Fabric Hub</p>
        </div>
      </div>
    </template>

    <el-form
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-width="0"
      class="auth-form"
    >
      <el-form-item prop="username">
        <el-input
          v-model="loginForm.username"
          :placeholder="t('auth.usernamePlaceholder')"
          prefix-icon="User"
          size="large"
        />
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          :placeholder="t('auth.passwordPlaceholder')"
          prefix-icon="Lock"
          size="large"
          show-password
          @keyup.enter="handleLogin"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="auth-footer">
        <span class="fabric-auth-link" @click="$emit('switch-to-register')">
          {{ t('auth.noAccount') }}
        </span>
        <div class="auth-footer__actions">
          <el-button round @click="visible = false">{{ t('common.cancel') }}</el-button>
          <el-button round type="primary" @click="handleLogin" :loading="loading">
            {{ t('auth.login') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { useUserStore } from '../../stores/user';

const { t } = useI18n();
const userStore = useUserStore();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
  'switch-to-register': [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const loginFormRef = ref<FormInstance>();
const loading = ref(false);

const loginForm = ref({
  username: '',
  password: '',
});

const loginRules = computed<FormRules>(() => ({
  username: [{ required: true, message: t('auth.usernameRequired'), trigger: 'blur' }],
  password: [{ required: true, message: t('auth.passwordRequired'), trigger: 'blur' }],
}));

const handleLogin = async () => {
  const valid = await loginFormRef.value?.validate();
  if (!valid) return;

  try {
    loading.value = true;
    await userStore.login(loginForm.value);
    emit('success');
  } finally {
    loading.value = false;
  }
};

watch(visible, (val) => {
  if (!val) {
    loginFormRef.value?.resetFields();
  }
});
</script>

<style scoped>
.auth-form :deep(.el-form-item) {
  margin-bottom: 1rem;
}

.auth-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  width: 100%;
  flex-wrap: wrap;
}

.auth-footer__actions {
  display: flex;
  gap: 0.5rem;
}
</style>
