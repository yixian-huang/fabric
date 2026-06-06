<template>
  <div class="admin-dashboard">
    <AdminPageHeader
      :title="t('admin.dashboard')"
      :description="t('admin.dashboardWelcome', { name: userStore.username || t('admin.user') })"
    >
      <template #actions>
        <el-button type="primary" round @click="router.push('/admin/fabrics/new')">
          <el-icon class="mr-1"><Plus /></el-icon>
          {{ t('fabric.add') }}
        </el-button>
      </template>
    </AdminPageHeader>

    <div class="stats-grid">
      <div v-for="stat in stats" :key="stat.label" class="stat-card fabric-surface">
        <span class="stat-card__value">{{ stat.value }}</span>
        <span class="stat-card__label">{{ stat.label }}</span>
      </div>
    </div>

    <div class="dashboard-grid">
      <section class="admin-panel fabric-surface">
        <h2 class="panel-title">{{ t('admin.quickActions') }}</h2>
        <div class="quick-actions">
          <el-button round @click="router.push('/admin/fabrics/new')">{{ t('fabric.add') }}</el-button>
          <el-button round @click="router.push('/admin/fabrics')">{{ t('admin.fabrics') }}</el-button>
          <el-button round @click="router.push('/admin/options')">{{ t('admin.options') }}</el-button>
          <el-button round @click="router.push('/admin/suppliers')">{{ t('admin.suppliers') }}</el-button>
          <el-button round @click="router.push('/')">{{ t('admin.viewStorefront') }}</el-button>
        </div>
      </section>

      <section class="admin-panel fabric-surface">
        <h2 class="panel-title">{{ t('admin.recentFabrics') }}</h2>
        <el-table v-loading="loading" :data="recentFabrics" size="small">
          <el-table-column prop="reference_code" :label="t('fabric.referenceNo')" min-width="100" />
          <el-table-column :label="t('fabric.fabricCodeColumn')" min-width="120">
            <template #default="{ row }">{{ row.code }}-{{ row.merchant_code }}</template>
          </el-table-column>
          <el-table-column :label="t('fabric.operation')" width="80" align="center">
            <template #default="{ row }">
              <el-button link type="primary" @click="router.push(`/admin/fabrics/${row.fabric_id}/edit`)">
                {{ t('fabric.edit') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Plus } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import { getFabricList, getVisitorStats } from '@/api/fabric';
import { parseFabricListResponse } from '@/utils/fabric';
import { useUserStore } from '@/stores/user';
import { useFavoriteStore } from '@/stores/favorite';

const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

const loading = ref(false);
const fabricTotal = ref(0);
const recentFabrics = ref<Record<string, unknown>[]>([]);
const visitorStats = ref({
  unique_visitors_today: 0,
  total_unique_visitors: 0,
});

const stats = computed(() => [
  { label: t('admin.statFabrics'), value: fabricTotal.value },
  { label: t('fabric.todayVisitors'), value: visitorStats.value.unique_visitors_today || 0 },
  { label: t('fabric.totalVisitors'), value: visitorStats.value.total_unique_visitors || 0 },
  { label: t('favorite.myFavorites'), value: favoriteStore.favoriteCount },
]);

onMounted(async () => {
  loading.value = true;
  try {
    const [listRes, statsRes] = await Promise.all([
      getFabricList({ page: 1, page_size: 5 }),
      getVisitorStats(),
    ]);
    const { items, total } = parseFabricListResponse(listRes);
    recentFabrics.value = items;
    fabricTotal.value = total;
    if (statsRes?.data) {
      visitorStats.value = statsRes.data;
    }
    if (userStore.isLoggedIn) {
      await favoriteStore.fetchFavoriteCount();
    }
  } catch (error) {
    console.error('加载仪表盘失败:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

@media (min-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  padding: 1.25rem 1.35rem;
  border-radius: 14px;
}

.stat-card__value {
  display: block;
  font-family: var(--font-display);
  font-size: 1.85rem;
  font-weight: 700;
  color: var(--fabric-ink);
  line-height: 1.1;
}

.stat-card__label {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--fabric-muted);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1.4fr;
  }
}

.admin-panel {
  padding: 1.25rem;
  border-radius: 16px;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--fabric-ink);
  margin: 0 0 1rem;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
