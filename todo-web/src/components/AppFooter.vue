<template>
  <footer class="app-footer">
    <div class="app-footer__inner">
      <p class="app-footer__brand">{{ siteConfig.name }}</p>
      <p class="app-footer__tagline">{{ t('common.footerTagline') }}</p>
      <p class="app-footer__copy">
        {{ t('common.footerCopyright', { year: currentYear, name: siteConfig.name }) }}
      </p>
    </div>
  </footer>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n';
import { siteConfig } from '@/config/site';

const { t } = useI18n();
const currentYear = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  border-top: 1px solid var(--fabric-border);
  background: rgba(255, 252, 248, 0.85);
}

.app-footer__inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 1.25rem 2.25rem;
  text-align: center;
}

@media (min-width: 768px) {
  .app-footer__inner {
    padding: 2.25rem 2rem 2.5rem;
  }
}

.app-footer__brand {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--fabric-ink);
  margin: 0 0 0.35rem;
}

.app-footer__tagline {
  font-size: 0.8125rem;
  color: var(--fabric-muted);
  margin: 0 0 0.85rem;
}

.app-footer__copy {
  font-size: 0.75rem;
  color: var(--fabric-muted);
  margin: 0;
  opacity: 0.85;
}
</style>
