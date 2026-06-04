<template>
  <div class="min-h-screen bg-slate-50 py-10 px-4">
    <div class="max-w-2xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-900">Fabric 首次配置</h1>
        <p class="text-slate-600 mt-2">设置管理员密码，并选择数据库与图片存储方式</p>
      </div>

      <el-card v-loading="loading" shadow="never" class="rounded-xl">
        <el-steps :active="step" finish-status="success" align-center class="mb-8">
          <el-step title="管理员" />
          <el-step title="图片存储" />
          <el-step title="数据库" />
        </el-steps>

        <el-form label-position="top" @submit.prevent>
          <div v-show="step === 0">
            <el-alert
              type="info"
              :closable="false"
              class="mb-4"
              :title="`默认账号: ${status?.bootstrap.username || 'admin'}`"
              :description="status?.bootstrap.default_password_hint"
            />
            <el-form-item label="新管理员密码" required>
              <el-input v-model="form.admin_password" type="password" show-password placeholder="至少 8 位" />
            </el-form-item>
            <el-form-item label="确认密码" required>
              <el-input v-model="form.admin_password_confirm" type="password" show-password />
            </el-form-item>
          </div>

          <div v-show="step === 1">
            <el-form-item label="图片 / 附件存储">
              <el-radio-group v-model="form.storage_mode">
                <el-radio value="embedded-minio">内置 MinIO（推荐，一键安装默认）</el-radio>
                <el-radio value="local">本机磁盘（NAS 目录）</el-radio>
                <el-radio value="external-s3">外部 S3 / 对象存储</el-radio>
              </el-radio-group>
            </el-form-item>

            <template v-if="form.storage_mode === 'local'">
              <el-form-item label="本地存储路径">
                <el-input v-model="form.storage.local_path" placeholder="/app/data/files" />
              </el-form-item>
            </template>

            <template v-if="form.storage_mode === 'external-s3'">
              <el-form-item label="Endpoint">
                <el-input v-model="form.storage.endpoint" placeholder="s3.amazonaws.com 或 MinIO 地址" />
              </el-form-item>
              <el-form-item label="Bucket">
                <el-input v-model="form.storage.bucket" />
              </el-form-item>
              <el-form-item label="Access Key">
                <el-input v-model="form.storage.access_key" />
              </el-form-item>
              <el-form-item label="Secret Key">
                <el-input v-model="form.storage.secret_key" type="password" show-password />
              </el-form-item>
              <el-form-item>
                <el-checkbox v-model="form.storage.secure">使用 HTTPS</el-checkbox>
              </el-form-item>
            </template>
          </div>

          <div v-show="step === 2">
            <el-form-item label="数据库来源">
              <el-radio-group v-model="form.database_mode">
                <el-radio value="embedded">内置 PostgreSQL（当前: {{ status?.database.host }} / {{ status?.database.name }}）</el-radio>
                <el-radio value="external">外部 PostgreSQL</el-radio>
              </el-radio-group>
            </el-form-item>

            <template v-if="form.database_mode === 'external'">
              <el-alert
                type="warning"
                :closable="false"
                class="mb-4"
                title="外部数据库需在保存后重启 API 容器"
                description="docker compose restart api"
              />
              <el-form-item label="连接串 DSN" required>
                <el-input
                  v-model="form.database.dsn"
                  type="textarea"
                  :rows="2"
                  placeholder="postgres://user:pass@host:5432/fabric?sslmode=disable"
                />
              </el-form-item>
            </template>
          </div>

          <div class="flex justify-between mt-6">
            <el-button v-if="step > 0" @click="step--">上一步</el-button>
            <span v-else />

            <el-button v-if="step < 2" type="primary" @click="step++">下一步</el-button>
            <el-button v-else type="primary" :loading="submitting" @click="submit">
              完成配置
            </el-button>
          </div>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { completeSetup, getSetupStatus, type SetupStatus } from '@/api/setup';

const router = useRouter();
const loading = ref(true);
const submitting = ref(false);
const step = ref(0);
const status = ref<SetupStatus | null>(null);

const form = ref({
  admin_password: '',
  admin_password_confirm: '',
  storage_mode: 'embedded-minio',
  database_mode: 'embedded',
  storage: {
    endpoint: '',
    access_key: '',
    secret_key: '',
    bucket: 'fabric',
    secure: false,
    local_path: '/app/data/files',
  },
  database: {
    dsn: '',
    host: '',
    port: 5432,
    name: 'fabric',
    user: '',
    password: '',
  },
});

onMounted(async () => {
  try {
    const res = await getSetupStatus();
    const data = (res as any).data ?? res;
    status.value = data as SetupStatus;
    if (!status.value?.setup_required) {
      router.replace('/login');
      return;
    }
    form.value.storage_mode = status.value.storage_mode || 'embedded-minio';
    form.value.database_mode = status.value.database_mode || 'embedded';
    if (status.value.storage?.local_path) {
      form.value.storage.local_path = status.value.storage.local_path;
    }
  } catch (e: any) {
    ElMessage.error(e.message || '无法加载配置状态');
  } finally {
    loading.value = false;
  }
});

const submit = async () => {
  if (form.value.admin_password.length < 8) {
    ElMessage.error('管理员密码至少 8 位');
    step.value = 0;
    return;
  }
  if (form.value.admin_password !== form.value.admin_password_confirm) {
    ElMessage.error('两次密码不一致');
    step.value = 0;
    return;
  }

  submitting.value = true;
  try {
    const res = await completeSetup(form.value);
    const payload = (res as any).data ?? res;
    ElMessage.success(payload.message || '配置完成');
    if (payload.restart_required) {
      ElMessage.warning('请重启 API 服务使数据库/S3 配置生效');
    }
    router.push('/login');
  } catch (e: any) {
    ElMessage.error(e.message || '保存失败');
  } finally {
    submitting.value = false;
  }
};
</script>
