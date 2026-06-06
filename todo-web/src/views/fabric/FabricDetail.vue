<template>
  <div v-loading="loading" class="fabric-detail fabric-page">
    <div v-if="fabric" class="fabric-detail__inner">
      <button type="button" class="back-link" @click="router.push('/')">
        <el-icon><ArrowLeft /></el-icon>
        {{ t('fabric.backToCatalog') }}
      </button>

      <article class="detail-card fabric-surface">
        <div class="detail-grid">
          <div class="detail-image">
            <el-image
              :src="fabric.watermark_image_url || fabric.thumbnail_url"
              :alt="seoTitle"
              fit="contain"
              class="w-full h-full"
              preview-teleported
              :preview-src-list="previewImages"
            />
          </div>

          <div class="detail-info p-6 md:p-8">
            <header>
              <p class="detail-ref-label">{{ t('fabric.referenceNo') }}</p>
              <h1 class="detail-ref">{{ fabric.reference_code }}</h1>
              <p class="detail-code">{{ fabric.code }}-{{ fabric.merchant_code }}</p>
            </header>

            <section v-if="composition" class="detail-section">
              <h2>{{ t('fabric.fabricDetailTitle') }}</h2>
              <p>{{ composition }}</p>
              <ul v-if="specLines.length" class="spec-list">
                <li v-for="line in specLines" :key="line">{{ line }}</li>
              </ul>
            </section>

            <section v-if="styleTags.length" class="detail-section">
              <h2>{{ t('fabric.fabricStyleTitle') }}</h2>
              <div class="tag-row">
                <span v-for="tag in styleTags" :key="tag" class="fabric-tag">{{ tag }}</span>
              </div>
            </section>

            <section v-if="processTags.length" class="detail-section">
              <h2>{{ t('fabric.finishing') }}</h2>
              <div class="tag-row">
                <span v-for="tag in processTags" :key="tag" class="fabric-pill">{{ tag }}</span>
              </div>
            </section>

            <section v-if="fabric.remark" class="detail-section">
              <h2>{{ t('fabric.remark') }}</h2>
              <p>{{ fabric.remark }}</p>
            </section>

            <div class="detail-actions">
              <el-button
                :type="fabric.is_favorited ? 'danger' : 'default'"
                @click="handleToggleFavorite"
                :loading="favoriteLoading"
              >
                <el-icon class="mr-1">
                  <StarFilled v-if="fabric.is_favorited" />
                  <Star v-else />
                </el-icon>
                {{ fabric.is_favorited ? t('favorite.unfavorite') : t('favorite.addFavorite') }}
              </el-button>
              <el-button @click="handleShare">
                <el-icon class="mr-1"><Share /></el-icon>
                {{ t('fabric.share') }}
              </el-button>
            </div>
          </div>
        </div>
      </article>
    </div>

    <el-empty v-else-if="!loading" :description="t('fabric.notFound')" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, Share, Star, StarFilled } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { getPublicFabricDetail } from '@/api/fabric';
import {
  parseFabricDetailResponse,
  codesToOptions,
  formatComposition,
  formatI18nOptionName,
} from '@/utils/fabric';
import {
  buildFabricProductJsonLd,
  buildFabricSeoDescription,
  buildFabricSeoTitle,
} from '@/utils/fabricSeo';
import { usePageSeo } from '@/composables/usePageSeo';
import { fabricDetailPath, fabricDetailUrl } from '@/config/site';
import { useUserStore } from '@/stores/user';
import { useFavoriteStore } from '@/stores/favorite';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

const loading = ref(true);
const favoriteLoading = ref(false);
const fabric = ref<Record<string, any> | null>(null);

const referenceCode = computed(() => String(route.params.referenceCode || ''));

const composition = computed(() =>
  fabric.value ? formatComposition(fabric.value.components) : '',
);

const specLines = computed(() => {
  if (!fabric.value) return [];
  const lines: string[] = [];
  if (fabric.value.yarn_count || fabric.value.density) {
    lines.push([fabric.value.yarn_count, fabric.value.density].filter(Boolean).join(' '));
  }
  if (fabric.value.weight) {
    lines.push(`${fabric.value.weight} ${fabric.value.weight_unit || ''}`.trim());
  }
  if (fabric.value.width) lines.push(String(fabric.value.width));
  return lines;
});

const styleTags = computed(() => {
  if (!fabric.value) return [];
  const opts = fabric.value.style_options ?? codesToOptions(fabric.value.style_codes);
  const typeLabels: Record<number, string> = {
    1: t('fabric.knitted'),
    2: t('fabric.woven'),
    3: t('fabric.lace'),
    4: t('fabric.velvet'),
  };
  const tags = opts.map((item: { code: string; name?: string }) =>
    formatI18nOptionName(item.code, item.name),
  );
  if (fabric.value.fabric_type && typeLabels[fabric.value.fabric_type]) {
    tags.push(typeLabels[fabric.value.fabric_type]);
  }
  return tags;
});

const processTags = computed(() => {
  if (!fabric.value) return [];
  const opts = fabric.value.process_options ?? codesToOptions(fabric.value.process_codes);
  return opts.map((item: { code: string; name?: string }) =>
    formatI18nOptionName(item.code, item.name),
  );
});

const previewImages = computed(() => {
  const url = fabric.value?.watermark_image_url || fabric.value?.thumbnail_url;
  return url ? [url] : [];
});

const seoTitle = computed(() =>
  fabric.value ? buildFabricSeoTitle(fabric.value) : referenceCode.value,
);

const applySeo = (row: Record<string, any>) => {
  const path = fabricDetailPath(row.reference_code);
  const image = row.thumbnail_url || row.watermark_image_url;
  usePageSeo({
    title: buildFabricSeoTitle(row),
    description: buildFabricSeoDescription(row),
    canonical: path,
    ogType: 'product',
    ogImage: image,
    jsonLd: buildFabricProductJsonLd(row, fabricDetailUrl(row.reference_code), image),
  });
};

const loadFabric = async () => {
  loading.value = true;
  fabric.value = null;
  try {
    const res = await getPublicFabricDetail(referenceCode.value);
    const row = parseFabricDetailResponse(
      res as Parameters<typeof parseFabricDetailResponse>[0],
    );
    if (!row) return;
    fabric.value = row;
    try {
      applySeo(fabric.value);
    } catch (error) {
      console.error('Failed to apply fabric detail SEO:', error);
    }
  } catch {
    fabric.value = null;
  } finally {
    loading.value = false;
  }
};

const handleToggleFavorite = async () => {
  if (!fabric.value) return;
  if (!userStore.isLoggedIn) {
    ElMessageBox.confirm(t('fabric.favoriteNeedLogin'), t('common.tip'), {
      confirmButtonText: t('auth.goLogin'),
      cancelButtonText: t('common.cancel'),
      type: 'info',
    })
      .then(() => userStore.openLoginDialog())
      .catch(() => undefined);
    return;
  }
  favoriteLoading.value = true;
  try {
    const isFavorited = await favoriteStore.toggleFavorite(fabric.value.fabric_id);
    fabric.value.is_favorited = isFavorited;
    ElMessage.success(
      isFavorited ? t('favorite.favoriteSuccess') : t('favorite.unfavoriteSuccess'),
    );
  } catch {
    ElMessage.error(t('favorite.favoriteError'));
  } finally {
    favoriteLoading.value = false;
  }
};

const handleShare = async () => {
  const url = fabricDetailUrl(referenceCode.value);
  try {
    if (navigator.share) {
      await navigator.share({ title: seoTitle.value, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    ElMessage.success(t('fabric.linkCopied'));
  } catch {
    ElMessage.info(url);
  }
};

onMounted(loadFabric);

watch(referenceCode, () => {
  loadFabric();
});
</script>

<style scoped>
.fabric-detail__inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1.25rem 3rem;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 1.25rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--fabric-border);
  border-radius: 999px;
  background: var(--fabric-surface);
  color: var(--fabric-muted);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}

.back-link:hover {
  color: var(--fabric-accent);
  border-color: rgba(154, 123, 79, 0.35);
}

.detail-card {
  border-radius: 20px;
  overflow: hidden;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .detail-grid {
    grid-template-columns: 1.05fr 0.95fr;
  }
}

.detail-image {
  background: linear-gradient(145deg, #f0ebe3 0%, #e8e0d4 100%);
  min-height: 360px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.detail-ref-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--fabric-accent);
  margin: 0;
}

.detail-ref {
  font-family: var(--font-display);
  font-size: clamp(2rem, 4vw, 2.75rem);
  font-weight: 600;
  color: var(--fabric-ink);
  margin: 0.35rem 0 0.25rem;
  letter-spacing: 0.02em;
}

.detail-code {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fabric-muted);
  margin: 0 0 1.75rem;
}

.detail-section {
  margin-bottom: 1.35rem;
  padding-bottom: 1.35rem;
  border-bottom: 1px solid var(--fabric-border);
}

.detail-section:last-of-type {
  border-bottom: none;
}

.detail-section h2 {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fabric-muted);
  margin: 0 0 0.65rem;
}

.detail-section p {
  color: var(--fabric-ink);
  margin: 0;
  line-height: 1.65;
  font-size: 0.9375rem;
}

.spec-list {
  margin: 0.65rem 0 0;
  padding-left: 1.1rem;
  color: var(--fabric-muted);
  font-size: 0.9rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
  padding-top: 0.5rem;
}
</style>
