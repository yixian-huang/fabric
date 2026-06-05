<template>
  <article
    class="fabric-card"
    :class="{ 'fabric-card--selected': selected }"
    @click="emit('open', fabric)"
  >
    <div class="fabric-card__image-wrap">
      <el-image
        :src="fabric.thumbnail_url"
        :alt="imageAlt"
        fit="cover"
        class="fabric-card__image"
        lazy
        preview-teleported
        :preview-src-list="fabric.watermark_image_url ? [fabric.watermark_image_url] : []"
        @click.stop
      />
      <div class="fabric-card__overlay" aria-hidden="true" />
      <span class="fabric-card__ref-badge">{{ fabric.reference_code }}</span>

      <el-checkbox
        v-if="selectable"
        :model-value="selected"
        class="fabric-card__checkbox"
        @click.stop
        @update:model-value="emit('toggle-select', fabric)"
      />

      <button
        v-if="showFavorite"
        type="button"
        class="fabric-card__favorite"
        :class="{ 'fabric-card__favorite--active': fabric.is_favorited }"
        :disabled="favoriteLoading"
        @click.stop="emit('toggle-favorite', fabric)"
      >
        <el-icon v-if="favoriteLoading" class="is-loading"><Loading /></el-icon>
        <el-icon v-else>
          <StarFilled v-if="fabric.is_favorited" />
          <Star v-else />
        </el-icon>
      </button>

      <span class="fabric-card__view-hint">
        {{ t('fabric.viewDetails') }}
        <el-icon><ArrowRight /></el-icon>
      </span>
    </div>

    <div class="fabric-card__body">
      <p class="fabric-card__code">{{ fabric.code }}-{{ fabric.merchant_code }}</p>
      <p v-if="composition" class="fabric-card__composition">{{ composition }}</p>
      <div v-if="specs.length" class="fabric-card__specs">
        <span v-for="spec in specs" :key="spec" class="fabric-card__spec-chip">{{ spec }}</span>
      </div>
      <div v-if="tags.length" class="fabric-card__tags">
        <span v-for="tag in tags" :key="tag" class="fabric-tag">{{ tag }}</span>
      </div>
    </div>
  </article>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { ArrowRight, Loading, Star, StarFilled } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import {
  codesToOptions,
  formatComposition,
  formatI18nOptionName,
} from '@/utils/fabric';

const props = defineProps<{
  fabric: Record<string, any>;
  selected?: boolean;
  selectable?: boolean;
  showFavorite?: boolean;
  favoriteLoading?: boolean;
}>();

const emit = defineEmits<{
  open: [Record<string, any>];
  'toggle-select': [Record<string, any>];
  'toggle-favorite': [Record<string, any>];
}>();

const { t } = useI18n();

const composition = computed(() => formatComposition(props.fabric.components));

const specs = computed(() => {
  const items: string[] = [];
  if (props.fabric.yarn_count || props.fabric.density) {
    items.push([props.fabric.yarn_count, props.fabric.density].filter(Boolean).join(' '));
  }
  if (props.fabric.weight) {
    items.push(`${props.fabric.weight} ${props.fabric.weight_unit || ''}`.trim());
  }
  if (props.fabric.width) items.push(props.fabric.width);
  return items.filter(Boolean);
});

const tags = computed(() => {
  const styleOpts =
    props.fabric.style_options ?? codesToOptions(props.fabric.style_codes);
  const processOpts =
    props.fabric.process_options ?? codesToOptions(props.fabric.process_codes);
  const typeLabels: Record<number, string> = {
    1: t('fabric.knitted'),
    2: t('fabric.woven'),
    3: t('fabric.lace'),
    4: t('fabric.velvet'),
  };
  const out = [
    ...styleOpts.map((item: { code: string; name?: string }) =>
      formatI18nOptionName(item.code, item.name),
    ),
    ...processOpts.slice(0, 2).map((item: { code: string; name?: string }) =>
      formatI18nOptionName(item.code, item.name),
    ),
  ];
  if (props.fabric.fabric_type && typeLabels[props.fabric.fabric_type]) {
    out.push(typeLabels[props.fabric.fabric_type]);
  }
  return out.slice(0, 4);
});

const imageAlt = computed(
  () => `${props.fabric.reference_code || props.fabric.code} fabric sample`,
);
</script>

<style scoped>
.fabric-card {
  position: relative;
  background: var(--fabric-surface);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  box-shadow: var(--fabric-shadow);
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.2s ease;
  cursor: pointer;
}

.fabric-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--fabric-shadow-hover);
  border-color: rgba(154, 123, 79, 0.25);
}

.fabric-card--selected {
  border-color: var(--fabric-accent);
  box-shadow: 0 0 0 2px rgba(154, 123, 79, 0.2), var(--fabric-shadow-hover);
}

.fabric-card__image-wrap {
  position: relative;
  aspect-ratio: 4 / 3;
  background: linear-gradient(145deg, #f0ebe3 0%, #e8e0d4 100%);
  overflow: hidden;
}

.fabric-card__image {
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.fabric-card:hover .fabric-card__image {
  transform: scale(1.06);
}

.fabric-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to top,
    rgba(28, 25, 23, 0.45) 0%,
    transparent 45%
  );
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.fabric-card:hover .fabric-card__overlay {
  opacity: 1;
}

.fabric-card__ref-badge {
  position: absolute;
  bottom: 0.85rem;
  left: 0.85rem;
  z-index: 2;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  background: rgba(255, 252, 248, 0.92);
  backdrop-filter: blur(8px);
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--fabric-ink);
  border: 1px solid rgba(255, 255, 255, 0.6);
}

.fabric-card__checkbox {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  z-index: 3;
}

.fabric-card__checkbox :deep(.el-checkbox__inner) {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border-color: rgba(255, 255, 255, 0.8);
  background: rgba(255, 252, 248, 0.85);
  backdrop-filter: blur(4px);
}

.fabric-card__favorite {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  background: rgba(255, 252, 248, 0.88);
  backdrop-filter: blur(8px);
  color: var(--fabric-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.fabric-card__favorite:hover {
  transform: scale(1.08);
  color: #c45c5c;
}

.fabric-card__favorite--active {
  color: #c45c5c;
  background: rgba(255, 240, 240, 0.95);
  border-color: rgba(196, 92, 92, 0.3);
}

.fabric-card__view-hint {
  position: absolute;
  bottom: 0.85rem;
  right: 0.85rem;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 252, 248, 0.95);
  opacity: 0;
  transform: translateY(6px);
  transition: all 0.35s ease;
}

.fabric-card:hover .fabric-card__view-hint {
  opacity: 1;
  transform: translateY(0);
}

.fabric-card__body {
  padding: 1.1rem 1.15rem 1.25rem;
}

.fabric-card__code {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fabric-accent);
  margin: 0 0 0.45rem;
}

.fabric-card__composition {
  font-size: 0.875rem;
  color: var(--fabric-ink);
  margin: 0 0 0.65rem;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.fabric-card__specs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.65rem;
}

.fabric-card__spec-chip {
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  background: rgba(28, 25, 23, 0.04);
  color: var(--fabric-muted);
}

.fabric-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
</style>
