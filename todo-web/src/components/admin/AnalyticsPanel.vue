<template>
  <section class="analytics-panel admin-panel fabric-surface">
    <div class="panel-header">
      <h2 class="panel-title">{{ t('admin.analytics') }}</h2>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        :start-placeholder="t('admin.dateFrom')"
        :end-placeholder="t('admin.dateTo')"
        value-format="YYYY-MM-DDTHH:mm:ss[Z]"
        @change="fetchAll"
      />
    </div>

    <div class="stats-grid analytics-stats">
      <div v-for="item in summaryCards" :key="item.key" class="stat-card mini">
        <span class="stat-card__value">{{ item.value }}</span>
        <span class="stat-card__label">{{ item.label }}</span>
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-box">
        <div class="chart-toolbar">
          <span class="chart-label">{{ t('admin.accessTrend') }}</span>
          <el-radio-group v-model="trendMetric" size="small" @change="fetchTrends">
            <el-radio-button value="pv">{{ t('admin.metricPv') }}</el-radio-button>
            <el-radio-button value="uv">{{ t('admin.metricUv') }}</el-radio-button>
            <el-radio-button value="traffic">{{ t('admin.metricTraffic') }}</el-radio-button>
            <el-radio-button value="requests">{{ t('admin.metricRequests') }}</el-radio-button>
          </el-radio-group>
        </div>
        <div ref="chartRef" class="chart-canvas" v-loading="trendLoading" />
      </div>
    </div>

    <div class="dimension-section">
      <el-tabs v-model="activeDimension" @tab-change="fetchDimensions">
        <el-tab-pane
          v-for="dim in dimensions"
          :key="dim.value"
          :label="dim.label"
          :name="dim.value"
        />
      </el-tabs>
      <el-table :data="dimensionRows" size="small" v-loading="dimensionLoading" max-height="320">
        <el-table-column prop="key" :label="t('admin.dimensionValue')" min-width="200" show-overflow-tooltip />
        <el-table-column prop="count" :label="t('admin.visitCount')" width="120" align="right" />
        <el-table-column :label="t('admin.traffic')" width="120" align="right">
          <template #default="{ row }">{{ formatBytes(row.bytes) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import * as echarts from 'echarts';
import {
  getAnalyticsDimensions,
  getAnalyticsSummary,
  getAnalyticsTrends,
} from '@/api/analytics';

const { t } = useI18n();

const dateRange = ref<[string, string] | null>(null);
const summary = ref({ page_views: 0, unique_ips: 0, requests: 0, traffic_bytes: 0 });
const trendMetric = ref('pv');
const trendPoints = ref<{ date: string; value: number }[]>([]);
const dimensionRows = ref<{ key: string; count: number; bytes?: number }[]>([]);
const activeDimension = ref('url');
const trendLoading = ref(false);
const dimensionLoading = ref(false);

const chartRef = ref<HTMLElement | null>(null);
let chart: echarts.ECharts | null = null;

const dimensions = computed(() => [
  { value: 'url', label: t('admin.dimUrl') },
  { value: 'source', label: t('admin.dimSource') },
  { value: 'ip', label: t('admin.dimIp') },
  { value: 'browser', label: t('admin.dimBrowser') },
  { value: 'os', label: t('admin.dimOs') },
  { value: 'device', label: t('admin.dimDevice') },
  { value: 'status_code', label: t('admin.dimStatus') },
]);

const queryRange = computed(() => {
  const now = new Date();
  const to = dateRange.value?.[1] ?? now.toISOString();
  const from =
    dateRange.value?.[0] ??
    new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();
  return { from, to };
});

const summaryCards = computed(() => [
  { key: 'pv', label: t('admin.metricPv'), value: summary.value.page_views },
  { key: 'uv', label: t('admin.metricUv'), value: summary.value.unique_ips },
  { key: 'req', label: t('admin.metricRequests'), value: summary.value.requests },
  { key: 'traffic', label: t('admin.metricTraffic'), value: formatBytes(summary.value.traffic_bytes) },
]);

function formatBytes(n?: number) {
  const v = n ?? 0;
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / (1024 * 1024)).toFixed(2)} MB`;
}

async function fetchSummary() {
  const res = await getAnalyticsSummary(queryRange.value);
  if (res?.data) summary.value = res.data;
}

async function fetchTrends() {
  trendLoading.value = true;
  try {
    const res = await getAnalyticsTrends({
      ...queryRange.value,
      metric: trendMetric.value,
      granularity: 'day',
    });
    trendPoints.value = res?.data ?? [];
    renderChart();
  } finally {
    trendLoading.value = false;
  }
}

async function fetchDimensions() {
  dimensionLoading.value = true;
  try {
    const res = await getAnalyticsDimensions({
      ...queryRange.value,
      dimension: activeDimension.value,
      limit: 20,
    });
    dimensionRows.value = res?.data ?? [];
  } finally {
    dimensionLoading.value = false;
  }
}

async function fetchAll() {
  await Promise.all([fetchSummary(), fetchTrends(), fetchDimensions()]);
}

function renderChart() {
  if (!chartRef.value) return;
  if (!chart) chart = echarts.init(chartRef.value);
  chart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 16, top: 24, bottom: 32 },
    xAxis: {
      type: 'category',
      data: trendPoints.value.map((p) => p.date.slice(0, 10)),
      axisLabel: { fontSize: 11 },
    },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: trendPoints.value.map((p) => p.value),
        itemStyle: { color: '#4f46e5' },
      },
    ],
  });
}

function handleResize() {
  chart?.resize();
}

watch(trendPoints, renderChart);

onMounted(async () => {
  await fetchAll();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  chart?.dispose();
});
</script>

<style scoped>
.analytics-panel {
  padding: 1.25rem;
  border-radius: 16px;
  margin-bottom: 1.25rem;
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.panel-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0;
}

.analytics-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .analytics-stats {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card.mini {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: var(--fabric-surface-muted, rgba(0, 0, 0, 0.02));
}

.stat-card__value {
  display: block;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--fabric-ink);
}

.stat-card__label {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--fabric-muted);
}

.chart-box {
  margin-bottom: 1rem;
}

.chart-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.chart-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.chart-canvas {
  width: 100%;
  height: 260px;
}
</style>
