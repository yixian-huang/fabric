<template>
  <div class="admin-fabric-form">
    <AdminPageHeader
      :title="pageTitle"
      :description="t('admin.fabricFormHint')"
    >
      <template #actions>
        <el-button round @click="router.push('/admin/fabrics')">
          {{ t('fabric.backToCatalog') }}
        </el-button>
      </template>
    </AdminPageHeader>
    <AddFabric />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import AddFabric from '@/views/fabric/add-fabric.vue';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const pageTitle = computed(() =>
  route.params.id ? t('fabric.editTitle') : t('fabric.addTitle'),
);
</script>

<style scoped>
.admin-fabric-form :deep(.add-fabric-page) {
  min-height: auto;
  padding: 0;
  background: transparent;
}

.admin-fabric-form :deep(.add-fabric-page .max-w-7xl) {
  max-width: 960px;
  margin: 0;
  padding: 0;
}

.admin-fabric-form :deep(.add-fabric-page .bg-white.rounded-lg) {
  border-radius: 16px;
  border: 1px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow);
}

.admin-fabric-form :deep(.add-fabric-page h1.text-2xl) {
  display: none;
}
</style>
