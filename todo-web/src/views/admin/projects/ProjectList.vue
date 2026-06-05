<template>
  <div class="admin-projects">
    <AdminPageHeader :title="t('admin.project')" />
    <div class="admin-projects__body">
      <ProjectIndex />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import ProjectIndex from '@/views/project/index.vue';

const { t } = useI18n();
</script>

<style scoped>
.admin-projects__body :deep(.min-h-screen) {
  min-height: auto;
  background: transparent;
}

.admin-projects__body :deep(> header.bg-white) {
  border-radius: 16px 16px 0 0;
  border: 1px solid var(--fabric-border);
  border-bottom: none;
  box-shadow: none;
}

.admin-projects__body :deep(> .flex-1),
.admin-projects__body :deep(> div:not(header)) {
  border-radius: 0 0 16px 16px;
  border: 1px solid var(--fabric-border);
  border-top: none;
  background: var(--fabric-surface);
}
</style>
