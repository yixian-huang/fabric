<template>
  <div class="admin-templates">
    <AdminPageHeader :title="t('admin.template')" />
    <div class="admin-templates__body">
      <TemplateIndex />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TemplateIndex from '@/views/template/index.vue';

const { t } = useI18n();
</script>

<style scoped>
.admin-templates__body :deep(.min-h-screen) {
  min-height: auto;
  padding: 0;
  background: transparent;
}

.admin-templates__body :deep(> .bg-white) {
  border-radius: 16px;
  border: 1px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow);
}

.admin-templates__body :deep(h1.text-xl) {
  display: none;
}
</style>
