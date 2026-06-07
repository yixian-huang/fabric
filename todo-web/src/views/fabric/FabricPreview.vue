<template>
  <div class="fabric-preview fabric-page">
    <div class="fabric-preview__inner">
      <section v-if="isModern" class="hero">
        <p class="hero__eyebrow">{{ t('fabric.previewEyebrow') }}</p>
        <h1 class="hero__title">{{ siteConfig.name }}</h1>
        <p class="hero__subtitle">{{ siteConfig.description }}</p>
        <div class="hero__stats">
          <div class="hero__stat">
            <span class="hero__stat-value">{{ allCount }}</span>
            <span class="hero__stat-label">{{ t('fabric.fabricCount') }}</span>
          </div>
          <div class="hero__divider" aria-hidden="true" />
          <div class="hero__stat">
            <span class="hero__stat-value">{{ total }}</span>
            <span class="hero__stat-label">{{ t('fabric.searchResults') }}</span>
          </div>
        </div>
      </section>

      <section v-if="!isModern" class="classic-hero">
        <h1 class="classic-hero__title">{{ siteConfig.name }}</h1>
        <p class="classic-hero__subtitle">{{ siteConfig.description }}</p>
      </section>

      <FabricSearchForm
        :initial-search-params="searchParams"
        @search="handleSearch"
      />

      <div class="toolbar">
        <div v-if="!isModern" class="toolbar__count">
          <span class="fabric-pill">{{ allCount }} PCS</span>
        </div>
        <ThemeSwitcher :theme="theme" @update:theme="setTheme" />
        <el-button
          class="toolbar__print-btn"
          round
          @click="handleShowPrintPreview"
          :disabled="selectedFabrics.length === 0"
        >
          <el-icon class="mr-1"><Printer /></el-icon>
          {{ t('fabric.printPreview') }}
          <span v-if="selectedFabrics.length" class="toolbar__badge">
            {{ selectedFabrics.length }}
          </span>
        </el-button>
      </div>

      <div
        v-loading="loading"
        class="content-panel fabric-surface"
        :class="{ 'content-panel--card-scroll': isModern }"
      >
        <div
          v-if="isModern"
          ref="scrollContainer"
          class="content-panel__scroll"
          @scroll="handleCardScroll"
        >
          <FabricCardGrid
            :fabrics="fabricList"
            selectable
            show-favorite
            @selection-change="handleSelectionChange"
            @print="handleCardPrint"
          />
          <div v-if="fabricList.length" class="content-panel__load-more">
            <p v-if="loadingMore" class="load-more__hint">{{ t('fabric.loadingMore') }}</p>
            <p v-else-if="!hasMore" class="load-more__hint load-more__hint--done">
              {{ t('fabric.allLoaded') }}
            </p>
            <p v-else class="load-more__hint">{{ t('fabric.loadMore') }}</p>
          </div>
        </div>

        <template v-else>
          <FabricTable
            :fabrics="fabricList"
            @selection-change="handleSelectionChange"
          />
          <div class="content-panel__footer">
            <el-pagination
              :current-page="currentPage"
              :page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
              @update:current-page="currentPage = $event"
              @update:page-size="pageSize = $event"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { Printer } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import FabricTable from '@/components/FabricTable.vue';
import FabricSearchForm from '@/components/FabricSearchForm.vue';
import FabricCardGrid from '@/components/fabric/FabricCardGrid.vue';
import ThemeSwitcher from '@/components/fabric/ThemeSwitcher.vue';
import { getPublicFabricList, recordVisit } from '@/api/fabric';
import { useFabricList } from '@/composables/useFabricList';
import { useFabricTheme } from '@/composables/useFabricTheme';
import { usePageSeo } from '@/composables/usePageSeo';
import { siteConfig, absoluteUrl } from '@/config/site';
import { usePrintStore } from '@/stores/print';

const { t } = useI18n();
const printStore = usePrintStore();
const { theme, isModern, setTheme } = useFabricTheme();
const scrollContainer = ref<HTMLElement | null>(null);

const {
  currentPage,
  pageSize,
  total,
  allCount,
  loading,
  loadingMore,
  hasMore,
  fabricList,
  selectedFabrics,
  searchParams,
  fetchFabricList,
  loadMoreFabrics,
  handleSearch,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange,
} = useFabricList((params) => getPublicFabricList(params), 20);

usePageSeo({
  title: t('fabric.previewTitle'),
  description: siteConfig.description,
  canonical: '/',
  ogType: 'website',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: absoluteUrl('/'),
    description: siteConfig.description,
  },
});

const handleShowPrintPreview = () => {
  if (selectedFabrics.value.length === 0) {
    ElMessage.warning(t('fabric.selectItemsForPrint'));
    return;
  }
  printStore.openPrintPreview(selectedFabrics.value, true);
};

const handleCardPrint = (fabric: Record<string, unknown>) => {
  printStore.openPrintPreview([fabric], false);
};

const handleCardScroll = () => {
  const el = scrollContainer.value;
  if (!el || !isModern.value) return;
  const threshold = 120;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
    loadMoreFabrics();
  }
};

onMounted(() => {
  fetchFabricList(false);
  recordVisit().catch((error) => {
    console.error('访客记录失败:', error);
  });
});
</script>

<style scoped>
.fabric-preview__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

@media (min-width: 768px) {
  .fabric-preview__inner {
    padding: 2.5rem 2rem 4rem;
  }
}

.hero {
  text-align: center;
  margin-bottom: 2.5rem;
  padding: 1rem 0 0.5rem;
}

.hero__eyebrow {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--fabric-accent);
  margin: 0 0 0.75rem;
}

.hero__title {
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 600;
  line-height: 1.1;
  color: var(--fabric-ink);
  margin: 0 0 0.85rem;
  letter-spacing: -0.01em;
}

.hero__subtitle {
  font-size: 1.05rem;
  color: var(--fabric-muted);
  max-width: 32rem;
  margin: 0 auto 1.75rem;
  line-height: 1.65;
}

.hero__stats {
  display: inline-flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.85rem 1.75rem;
  border-radius: 999px;
  background: var(--fabric-surface);
  border: 1px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow);
}

.hero__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.hero__stat-value {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--fabric-ink);
  line-height: 1;
}

.hero__stat-label {
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fabric-muted);
}

.hero__divider {
  width: 1px;
  height: 2rem;
  background: var(--fabric-border);
}

.classic-hero {
  text-align: center;
  margin-bottom: 2rem;
  padding-top: 0.5rem;
}

.classic-hero__title {
  font-family: var(--font-display);
  font-size: clamp(1.85rem, 4vw, 2.75rem);
  font-weight: 600;
  color: var(--fabric-ink);
  margin: 0 0 0.5rem;
}

.classic-hero__subtitle {
  font-size: 0.95rem;
  color: var(--fabric-muted);
  max-width: 28rem;
  margin: 0 auto;
  line-height: 1.6;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.toolbar__count {
  margin-right: auto;
}

.toolbar__print-btn {
  margin-left: auto;
  font-weight: 600;
  border-color: var(--fabric-border) !important;
  background: var(--fabric-surface) !important;
  color: var(--fabric-ink) !important;
}

.toolbar__print-btn:not(:disabled):hover {
  border-color: var(--fabric-accent) !important;
  color: var(--fabric-accent) !important;
}

.toolbar__print-btn:disabled {
  opacity: 0.45;
}

.toolbar__badge {
  margin-left: 0.35rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--fabric-accent-soft);
  color: var(--fabric-accent);
}

.content-panel {
  border-radius: 20px;
  overflow: hidden;
}

.content-panel--card-scroll {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 22rem);
}

.content-panel__scroll {
  flex: 1;
  overflow-y: auto;
  min-height: calc(100vh - 22rem);
  max-height: calc(100vh - 14rem);
}

.content-panel__load-more {
  padding: 1rem 1.5rem 1.5rem;
  text-align: center;
  border-top: 1px solid var(--fabric-border);
  background: rgba(255, 252, 248, 0.6);
}

.load-more__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--fabric-muted);
}

.load-more__hint--done {
  opacity: 0.7;
}

.content-panel__footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem 1.25rem;
  border-top: 1px solid var(--fabric-border);
  background: rgba(255, 252, 248, 0.6);
}

:deep(.el-pagination) {
  --el-pagination-button-bg-color: transparent;
  --el-pagination-hover-color: var(--fabric-accent);
}
</style>
