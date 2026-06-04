<template>
    <el-dialog 
      v-model="visible" 
      :title="$t('auth.register')" 
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form 
        ref="registerFormRef" 
        :model="registerForm" 
        :rules="registerRules"
        label-width="0"
      >
        <el-form-item prop="email">
          <el-input 
            v-model="registerForm.email" 
            :placeholder="$t('auth.emailPlaceholder')"
            prefix-icon="Message"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="username">
          <el-input 
            v-model="registerForm.username" 
            :placeholder="$t('auth.usernamePlaceholder')"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input 
            v-model="registerForm.password" 
            type="password" 
            :placeholder="$t('auth.passwordPlaceholder')"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item prop="passwordConfirm">
          <el-input 
            v-model="registerForm.passwordConfirm" 
            type="password" 
            :placeholder="$t('auth.confirmPasswordPlaceholder')"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="registerForm.emailSubscription">
            {{ $t('auth.subscribeUpdates') }}
          </el-checkbox>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="auth-footer">
          <span class="login-link" @click="$emit('switch-to-login')">
            {{ $t('auth.hasAccount') }}
          </span>
          <div>
            <el-button @click="visible = false">{{ $t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleRegister" :loading="loading">
              {{ $t('auth.register') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, watch } from 'vue'
  import type { FormInstance, FormRules } from 'element-plus'
  import { ElMessage } from 'element-plus'
  import { useI18n } from 'vue-i18n'
  import { register } from '@/api/auth'
  
  const { t } = useI18n()
  
  const props = defineProps<{
    modelValue: boolean
  }>()
  
  const emit = defineEmits<{
    'update:modelValue': [value: boolean]
    'success': []
    'switch-to-login': []
  }>()
  
  const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })
  
  const registerFormRef = ref<FormInstance>()
  const loading = ref(false)
  
  const registerForm = ref({
    email: '',
    username: '',
    password: '',
    passwordConfirm: '',
    emailSubscription: false
  })
  
  const validatePasswordConfirm = (rule: any, value: any, callback: any) => {
    if (value === '') {
      callback(new Error(t('auth.confirmPasswordRequired')))
    } else if (value !== registerForm.value.password) {
      callback(new Error(t('auth.passwordMismatch')))
    } else {
      callback()
    }
  }
  
  const registerRules: FormRules = {
    email: [
      { required: true, message: t('auth.emailRequired'), trigger: 'blur' },
      { type: 'email', message: t('auth.emailInvalid'), trigger: 'blur' }
    ],
    username: [
      { required: true, message: t('auth.usernameRequired'), trigger: 'blur' },
      { min: 3, max: 20, message: t('auth.usernameLength'), trigger: 'blur' }
    ],
    password: [
      { required: true, message: t('auth.passwordRequired'), trigger: 'blur' },
      { min: 6, message: t('auth.passwordLength'), trigger: 'blur' }
    ],
    passwordConfirm: [
      { required: true, validator: validatePasswordConfirm, trigger: 'blur' }
    ]
  }
  
  const handleRegister = async () => {
    const valid = await registerFormRef.value?.validate()
    if (!valid) return
    
    try {
      loading.value = true
      const data = {
        email: registerForm.value.email,
        username: registerForm.value.username,
        password: registerForm.value.password,
        password_confirm: registerForm.value.passwordConfirm,
        email_subscription: registerForm.value.emailSubscription
      }
      
      await register(data)
      emit('success')
    } catch (error: any) {
      ElMessage.error(error.message || t('auth.registerFailed'))
    } finally {
      loading.value = false
    }
  }
  
  // 重置表单
  watch(visible, (val) => {
    if (!val) {
      registerFormRef.value?.resetFields()
    }
  })
  </script>
  
  <style scoped>
  .auth-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
  
  .login-link {
    color: #409eff;
    cursor: pointer;
    font-size: 14px;
  }
  
  .login-link:hover {
    text-decoration: underline;
  }
  </style>