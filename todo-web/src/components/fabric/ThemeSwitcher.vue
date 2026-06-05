<template>
  <div class="theme-switcher">
    <div class="theme-toggle" role="group" :aria-label="t('fabric.theme')">
      <button
        type="button"
        class="theme-toggle__btn"
        :class="{ 'theme-toggle__btn--active': theme === 'modern' }"
        @click="emit('update:theme', 'modern')"
      >
        <Grid class="theme-toggle__icon" />
        {{ t('fabric.themeModern') }}
      </button>
      <button
        type="button"
        class="theme-toggle__btn"
        :class="{ 'theme-toggle__btn--active': theme === 'classic' }"
        @click="emit('update:theme', 'classic')"
      >
        <List class="theme-toggle__icon" />
        {{ t('fabric.themeClassic') }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { Grid, List } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import type { FabricTheme } from '@/config/site';

defineProps<{
  theme: FabricTheme;
}>();

const emit = defineEmits<{
  'update:theme': [FabricTheme];
}>();

const { t } = useI18n();
</script>

<style scoped>
.theme-switcher {
  display: flex;
  align-items: center;
}

.theme-toggle {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(28, 25, 23, 0.05);
  border: 1px solid var(--fabric-border);
}

.theme-toggle__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.9rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--fabric-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-body);
}

.theme-toggle__btn:hover:not(.theme-toggle__btn--active) {
  color: var(--fabric-ink);
  background: rgba(255, 255, 255, 0.6);
}

.theme-toggle__btn--active {
  background: var(--fabric-surface);
  color: var(--fabric-ink);
  box-shadow: 0 2px 8px rgba(28, 25, 23, 0.08);
}

.theme-toggle__icon {
  width: 14px;
  height: 14px;
}
</style>
