<template>
  <header class="admin-page-header">
    <div class="admin-page-header__main">
      <h1 class="admin-page-header__title">{{ title }}</h1>
      <p v-if="description" class="admin-page-header__desc">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-header__actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<script lang="ts" setup>
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<style scoped>
.admin-page-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.admin-page-header__title {
  font-family: var(--font-display);
  font-size: 1.65rem;
  font-weight: 600;
  color: var(--fabric-ink);
  margin: 0 0 0.25rem;
}

.admin-page-header__desc {
  font-size: 0.875rem;
  color: var(--fabric-muted);
  margin: 0;
}

.admin-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}
</style>
