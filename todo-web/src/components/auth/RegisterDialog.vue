<template>
  <el-dialog
    v-model="visible"
    width="420px"
    class="fabric-auth-dialog"
    :close-on-click-modal="false"
  >
    <template #header>
      <div class="fabric-auth-dialog__header">
        <span class="fabric-auth-dialog__mark" aria-hidden="true">◈</span>
        <div>
          <h2 class="fabric-auth-dialog__title">{{ t('auth.register') }}</h2>
          <p class="fabric-auth-dialog__subtitle">DAILY SILK · Fabric Hub</p>
        </div>
      </div>
    </template>

    <el-form
      ref="registerFormRef"
      :model="registerForm"
      :rules="registerRules"
      label-width="0"
      class="auth-form"
    >
      <el-form-item prop="email">
        <el-input
          v-model="registerForm.email"
          :placeholder="t('auth.emailPlaceholder')"
          prefix-icon="Message"
          size="large"
        />
      </el-form-item>
      <el-form-item prop="username">
        <el-input
          v-model="registerForm.username"
          :placeholder="t('auth.usernamePlaceholder')"
          prefix-icon="User"
          size="large"
        />
      </el-form-item>
      <el-form-item prop="password">
        <el-input
          v-model="registerForm.password"
          type="password"
          :placeholder="t('auth.passwordPlaceholder')"
          prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>
      <el-form-item prop="passwordConfirm">
        <el-input
          v-model="registerForm.passwordConfirm"
          type="password"
          :placeholder="t('auth.confirmPasswordPlaceholder')"
          prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-checkbox v-model="registerForm.emailSubscription">
          {{ t('auth.subscribeUpdates') }}
        </el-checkbox>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="auth-footer">
        <span class="fabric-auth-link" @click="$emit('switch-to-login')">
          {{ t('auth.hasAccount') }}
        </span>
        <div class="auth-footer__actions">
          <el-button round @click="visible = false">{{ t('common.cancel') }}</el-button>
          <el-button round type="primary" @click="handleRegister" :loading="loading">
            {{ t('auth.register') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { FormInstance, FormRules } from 'element-plus';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { register } from '@/api/auth';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  success: [];
  'switch-to-login': [];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const registerFormRef = ref<FormInstance>();
const loading = ref(false);

const registerForm = ref({
  email: '',
  username: '',
  password: '',
  passwordConfirm: '',
  emailSubscription: false,
});

const validatePasswordConfirm = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value === '') {
    callback(new Error(t('auth.confirmPasswordRequired')));
  } else if (value !== registerForm.value.password) {
    callback(new Error(t('auth.passwordMismatch')));
  } else {
    callback();
  }
};

const registerRules = computed<FormRules>(() => ({
  email: [
    { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' },
  ],
  username: [
    { required: true, message: t('auth.usernameRequired'), trigger: 'blur' },
    { min: 3, max: 20, message: t('auth.usernameLength'), trigger: 'blur' },
  ],
  password: [
    { required: true, message: t('auth.passwordRequired'), trigger: 'blur' },
    { min: 6, message: t('auth.passwordLength'), trigger: 'blur' },
  ],
  passwordConfirm: [{ required: true, validator: validatePasswordConfirm, trigger: 'blur' }],
}));

const handleRegister = async () => {
  const valid = await registerFormRef.value?.validate();
  if (!valid) return;

  try {
    loading.value = true;
    await register({
      email: registerForm.value.email,
      username: registerForm.value.username,
      password: registerForm.value.password,
      password_confirm: registerForm.value.passwordConfirm,
      email_subscription: registerForm.value.emailSubscription,
    });
    emit('success');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : t('auth.registerFailed');
    ElMessage.error(message);
  } finally {
    loading.value = false;
  }
};

watch(visible, (val) => {
  if (!val) {
    registerFormRef.value?.resetFields();
  }
});
</script>

<style scoped>
.auth-form :deep(.el-form-item) {
  margin-bottom: 0.85rem;
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
