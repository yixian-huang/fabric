<template>
  <div class="admin-suppliers">
    <AdminPageHeader :title="t('admin.suppliers')" />
    <div class="admin-suppliers__body">
      <SupplierIndex />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import SupplierIndex from '@/views/supplier/index.vue';

const { t } = useI18n();
</script>

<style scoped>
.admin-suppliers__body :deep(.min-h-screen) {
  min-height: auto;
  padding: 0;
  background: transparent;
}

.admin-suppliers__body :deep(> .bg-white) {
  border-radius: 16px;
  border: 1px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow);
}

.admin-suppliers__body :deep(h1.text-xl) {
  display: none;
}
</style>
