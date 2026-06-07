<template>
  <div class="fabric-card-grid">
    <template v-if="fabrics.length">
      <FabricCard
        v-for="fabric in fabrics"
        :key="fabric.fabric_id"
        :fabric="fabric"
        :selected="isSelected(fabric)"
        :selectable="selectable"
        :show-favorite="showFavorite"
        :favorite-loading="!!favoriteLoading[fabric.fabric_id]"
        @open="handleOpen"
        @toggle-select="handleToggleSelect"
        @toggle-favorite="handleToggleFavorite"
        @print="(fabric) => emit('print', fabric)"
      />
    </template>
    <div v-else class="fabric-empty">
      <div class="fabric-empty__icon" aria-hidden="true">◈</div>
      <h3 class="fabric-empty__title">{{ t('fabric.emptyCatalog') }}</h3>
      <p class="fabric-empty__desc">{{ t('fabric.emptyCatalogHint') }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useI18n } from 'vue-i18n';
import FabricCard from './FabricCard.vue';
import { fabricDetailPath } from '@/config/site';
import { useUserStore } from '@/stores/user';
import { useFavoriteStore } from '@/stores/favorite';

const props = defineProps<{
  fabrics: Record<string, any>[];
  selectable?: boolean;
  showFavorite?: boolean;
  selectedIds?: Set<string>;
}>();

const emit = defineEmits<{
  'selection-change': [Record<string, unknown>[]];
  'open-detail': [Record<string, unknown>];
  print: [Record<string, unknown>];
}>();

const router = useRouter();
const { t } = useI18n();
const userStore = useUserStore();
const favoriteStore = useFavoriteStore();

const internalSelected = ref<Record<string, unknown>[]>([]);
const favoriteLoading = ref<Record<string, boolean>>({});

const isSelected = (fabric: Record<string, any>) => {
  if (props.selectedIds) {
    return props.selectedIds.has(fabric.fabric_id);
  }
  return internalSelected.value.some((item) => item.fabric_id === fabric.fabric_id);
};

const handleOpen = (fabric: Record<string, any>) => {
  if (fabric.reference_code) {
    router.push(fabricDetailPath(fabric.reference_code));
  }
  emit('open-detail', fabric);
};

const handleToggleSelect = (fabric: Record<string, any>) => {
  const idx = internalSelected.value.findIndex((item) => item.fabric_id === fabric.fabric_id);
  if (idx >= 0) {
    internalSelected.value.splice(idx, 1);
  } else {
    internalSelected.value.push(fabric);
  }
  emit('selection-change', [...internalSelected.value]);
};

const handleToggleFavorite = async (fabric: Record<string, any>) => {
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

  favoriteLoading.value[fabric.fabric_id] = true;
  try {
    const isFavorited = await favoriteStore.toggleFavorite(fabric.fabric_id);
    fabric.is_favorited = isFavorited;
    ElMessage.success(
      isFavorited ? t('favorite.favoriteSuccess') : t('favorite.unfavoriteSuccess'),
    );
  } catch {
    ElMessage.error(t('favorite.favoriteError'));
  } finally {
    favoriteLoading.value[fabric.fabric_id] = false;
  }
};
</script>

<style scoped>
.fabric-card-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.5rem;
  padding: 1.5rem;
}

@media (min-width: 640px) {
  .fabric-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .fabric-card-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.75rem;
    padding: 1.75rem;
  }
}

@media (min-width: 1400px) {
  .fabric-card-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.fabric-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.fabric-empty__icon {
  font-size: 2.5rem;
  color: var(--fabric-accent);
  opacity: 0.5;
  margin-bottom: 1rem;
}

.fabric-empty__title {
  font-family: var(--font-display);
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--fabric-ink);
  margin: 0 0 0.5rem;
}

.fabric-empty__desc {
  font-size: 0.9375rem;
  color: var(--fabric-muted);
  max-width: 24rem;
  margin: 0;
  line-height: 1.6;
}
</style>
