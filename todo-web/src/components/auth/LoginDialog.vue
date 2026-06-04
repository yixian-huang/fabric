<!-- todo-web/src/components/auth/LoginDialog.vue -->
<template>
  <el-dialog 
    v-model="visible" 
    title="用户登录" 
    width="400px"
    :close-on-click-modal="false"
  >
    <el-form 
      ref="loginFormRef" 
      :model="loginForm" 
      :rules="loginRules"
      label-width="0"
    >
      <el-form-item prop="username">
        <el-input 
          v-model="loginForm.username" 
          placeholder="请输入用户名"
          prefix-icon="User"
          size="large"
        />
      </el-form-item>
      <el-form-item prop="password">
        <el-input 
          v-model="loginForm.password" 
          type="password" 
          placeholder="请输入密码"
          prefix-icon="Lock"
          size="large"
          show-password
          @keyup.enter="handleLogin"
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="auth-footer">
        <span class="register-link" @click="$emit('switch-to-register')">
          还没有账号？立即注册
        </span>
        <div>
          <el-button @click="visible = false">取消</el-button>
          <el-button type="primary" @click="handleLogin" :loading="loading">
            登录
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': []
  'switch-to-register': []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  const valid = await loginFormRef.value?.validate()
  if (!valid) return
  
  try {
    loading.value = true
    await userStore.login(loginForm.value)
    emit('success')
  } finally {
    loading.value = false
  }
}

// 重置表单
watch(visible, (val) => {
  if (!val) {
    loginFormRef.value?.resetFields()
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

.register-link {
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
}

.register-link:hover {
  text-decoration: underline;
}
</style>