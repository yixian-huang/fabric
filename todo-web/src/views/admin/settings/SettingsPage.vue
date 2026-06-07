<template>
  <div class="admin-settings">
    <AdminPageHeader
      :title="t('admin.settings')"
      :description="t('admin.settingsHint')"
    />

    <div class="admin-panel fabric-surface p-6 max-w-3xl">
      <el-form ref="formRef" :model="form" label-width="120px" v-loading="loading">
        <h3 class="section-title">{{ t('admin.siteBranding') }}</h3>
        <el-form-item :label="t('admin.siteTitle')">
          <el-input v-model="form.site_title" />
        </el-form-item>
        <el-form-item :label="t('admin.siteSubtitle')">
          <el-input v-model="form.site_subtitle" />
        </el-form-item>
        <el-form-item :label="t('admin.siteDescription')">
          <el-input v-model="form.site_description" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="t('admin.faviconUrl')">
          <el-input v-model="form.favicon_url" :placeholder="'/favicon.ico'" />
        </el-form-item>

        <h3 class="section-title mt-6">{{ t('admin.emailSettings') }}</h3>
        <el-form-item :label="t('admin.inquiryEmail')">
          <el-input v-model="form.inquiry_email" />
        </el-form-item>
        <el-form-item :label="t('admin.smtpHost')">
          <el-input v-model="form.smtp_host" />
        </el-form-item>
        <el-form-item :label="t('admin.smtpPort')">
          <el-input-number v-model="form.smtp_port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item :label="t('admin.smtpUser')">
          <el-input v-model="form.smtp_user" />
        </el-form-item>
        <el-form-item :label="t('admin.smtpPassword')">
          <el-input v-model="form.smtp_password" type="password" show-password />
        </el-form-item>
        <el-form-item :label="t('admin.smtpFrom')">
          <el-input v-model="form.smtp_from" />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :loading="saving" @click="save">{{ t('fabric.confirm') }}</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import { getSettings, updateSettings } from '@/api/settings';

const { t } = useI18n();
const loading = ref(false);
const saving = ref(false);

const form = reactive({
  site_title: '',
  site_subtitle: '',
  site_description: '',
  favicon_url: '',
  inquiry_email: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_password: '',
  smtp_from: '',
});

onMounted(async () => {
  loading.value = true;
  try {
    const res = await getSettings();
    const data = (res as { data?: typeof form }).data;
    if (data) Object.assign(form, data);
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    await updateSettings({ ...form });
    ElMessage.success(t('admin.settingsSaved'));
  } catch {
    ElMessage.error(t('admin.settingsSaveFailed'));
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.section-title {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0 0 1rem;
  color: var(--fabric-ink);
}
</style>
