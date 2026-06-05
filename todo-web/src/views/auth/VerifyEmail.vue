<!-- todo-web/src/views/auth/VerifyEmail.vue -->
<template>
  <div class="verify-email-container">
    <div class="verify-card">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading">
          <Loading />
        </el-icon>
        <h2>正在验证您的邮箱...</h2>
        <p>请稍候，我们正在激活您的账号</p>
      </div>

      <!-- 验证成功状态 -->
      <div v-else-if="verificationStatus === 'success'" class="success-state">
        <el-icon class="success-icon">
          <SuccessFilled />
        </el-icon>
        <h2>邮箱验证成功！</h2>
        <p>恭喜您，您的账号已成功激活</p>
        <div class="action-buttons">
          <el-button type="primary" size="large" @click="goToHome">
            <el-icon><House /></el-icon>
            前往首页
          </el-button>
          <el-button size="large" @click="goToLogin">
            <el-icon><User /></el-icon>
            立即登录
          </el-button>
        </div>
      </div>

      <!-- 验证失败状态 -->
      <div v-else-if="verificationStatus === 'error'" class="error-state">
        <el-icon class="error-icon">
          <CircleCloseFilled />
        </el-icon>
        <h2>验证失败</h2>
        <p class="error-message">{{ errorMessage }}</p>
        <div class="action-buttons">
          <el-button type="primary" size="large" @click="resendVerification">
            <el-icon><Refresh /></el-icon>
            重新发送验证邮件
          </el-button>
          <el-button size="large" @click="goToHome">
            <el-icon><House /></el-icon>
            返回首页
          </el-button>
        </div>
        
        <!-- 重发邮件表单 -->
        <el-dialog
          v-model="showResendDialog"
          title="重新发送验证邮件"
          width="400px"
        >
          <el-form @submit.prevent="handleResend">
            <el-form-item label="邮箱地址">
              <el-input
                v-model="resendEmail"
                placeholder="请输入您的邮箱地址"
                type="email"
              />
            </el-form-item>
          </el-form>
          <template #footer>
            <el-button @click="showResendDialog = false">取消</el-button>
            <el-button type="primary" @click="handleResend" :loading="resendLoading">
              发送
            </el-button>
          </template>
        </el-dialog>
      </div>

      <!-- 无效令牌状态 -->
      <div v-else class="invalid-state">
        <el-icon class="warning-icon">
          <WarningFilled />
        </el-icon>
        <h2>无效的验证链接</h2>
        <p>验证链接无效或缺少必要参数</p>
        <div class="action-buttons">
          <el-button type="primary" size="large" @click="goToHome">
            <el-icon><House /></el-icon>
            返回首页
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Loading,
  SuccessFilled,
  CircleCloseFilled,
  WarningFilled,
  House,
  User,
  Refresh
} from '@element-plus/icons-vue'
import { verifyEmail, resendVerification as apiResendVerification } from '../../api/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const verificationStatus = ref<'success' | 'error' | 'invalid' | ''>('')
const errorMessage = ref('')
const showResendDialog = ref(false)
const resendEmail = ref('')
const resendLoading = ref(false)

// 执行邮箱验证
const performVerification = async () => {
  const token = route.query.token as string
  
  if (!token) {
    verificationStatus.value = 'invalid'
    return
  }

  loading.value = true
  
  try {
    const response = await verifyEmail(token)
    const envelope = response as { code?: number; message?: string }

    if (envelope.code === 200) {
      verificationStatus.value = 'success'
      ElMessage.success(envelope.message || '邮箱验证成功，账号已激活！')
    } else {
      verificationStatus.value = 'error'
      errorMessage.value = envelope.message || '验证失败'
    }
  } catch (error: unknown) {
    verificationStatus.value = 'error'
    errorMessage.value =
      error instanceof Error ? error.message : '网络错误，请稍后重试'
    console.error('邮箱验证失败:', error)
  } finally {
    loading.value = false
  }
}

// 跳转到首页
const goToHome = () => {
  router.push('/')
}

// 跳转到登录页
const goToLogin = () => {
  router.push('/login')
}

// 重新发送验证邮件
const resendVerification = () => {
  showResendDialog.value = true
}

// 处理重发邮件
const handleResend = async () => {
  if (!resendEmail.value) {
    ElMessage.error('请输入邮箱地址')
    return
  }

  resendLoading.value = true
  
  try {
    await apiResendVerification(resendEmail.value)
    ElMessage.success('验证邮件已重新发送，请查收邮箱')
    showResendDialog.value = false
    resendEmail.value = ''
  } catch (error: unknown) {
    ElMessage.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
  } finally {
    resendLoading.value = false
  }
}

// 页面加载时执行验证
onMounted(() => {
  performVerification()
})
</script>

<style scoped>
.verify-email-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.verify-card {
  background: white;
  border-radius: 16px;
  padding: 48px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.loading-state,
.success-state,
.error-state,
.invalid-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.loading-state .el-icon {
  font-size: 48px;
  color: #409eff;
}

.success-icon {
  font-size: 64px;
  color: #67c23a;
}

.error-icon {
  font-size: 64px;
  color: #f56c6c;
}

.warning-icon {
  font-size: 64px;
  color: #e6a23c;
}

h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

p {
  margin: 0;
  font-size: 16px;
  color: #606266;
  line-height: 1.5;
}

.error-message {
  color: #f56c6c;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 16px;
  margin-top: 32px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-buttons .el-button {
  min-width: 140px;
}

/* 动画效果 */
.verify-card {
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.success-icon {
  animation: bounceIn 0.8s ease-out;
}

@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 响应式设计 */
@media (max-width: 480px) {
  .verify-card {
    padding: 32px 24px;
  }
  
  h2 {
    font-size: 24px;
  }
  
  .action-buttons {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-buttons .el-button {
    min-width: auto;
  }
}
</style>
