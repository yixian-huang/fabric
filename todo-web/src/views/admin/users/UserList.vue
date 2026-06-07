<template>
  <div class="admin-users">
    <AdminPageHeader
      :title="t('admin.users')"
      :description="t('admin.usersHint')"
    />

    <div class="admin-panel fabric-surface p-4">
      <el-table :data="users" v-loading="loading" border style="width: 100%">
        <el-table-column prop="username" :label="t('auth.usernamePlaceholder')" min-width="120" />
        <el-table-column prop="email" :label="t('auth.emailPlaceholder')" min-width="180" />
        <el-table-column prop="nickname" :label="t('admin.nickname')" min-width="100" />
        <el-table-column :label="t('admin.registeredAt')" min-width="160">
          <template #default="{ row }">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column :label="t('admin.lastVisit')" min-width="160">
          <template #default="{ row }">{{ formatTime(row.last_visited_at) }}</template>
        </el-table-column>
        <el-table-column prop="favorite_count" :label="t('admin.favoriteCount')" width="90" align="center" />
        <el-table-column :label="t('admin.emailVerified')" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.email_verified ? 'success' : 'info'" size="small">
              {{ row.email_verified ? t('admin.verified') : t('admin.unverified') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" :label="t('admin.status')" width="90" />
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import { listUsers } from '@/api/users';

const { t } = useI18n();
const loading = ref(false);
const users = ref<Record<string, unknown>[]>([]);

function formatTime(value?: string) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const res = await listUsers();
    const data = (res as { data?: { items?: unknown[] } }).data ?? res;
    users.value = ((data as { items?: unknown[] })?.items ?? []) as Record<string, unknown>[];
  } finally {
    loading.value = false;
  }
});
</script>
