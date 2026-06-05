import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { siteConfig, type FabricTheme } from '@/config/site';

const STORAGE_KEY = 'fabric-theme';

function readStoredTheme(): FabricTheme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'classic' || stored === 'modern') return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function useFabricTheme() {
  const route = useRoute();
  const router = useRouter();

  const theme = ref<FabricTheme>(
    (route.query.theme as FabricTheme) ||
      readStoredTheme() ||
      siteConfig.defaultTheme,
  );

  watch(
    () => route.query.theme,
    (value) => {
      if (value === 'classic' || value === 'modern') {
        theme.value = value;
      }
    },
  );

  const isModern = computed(() => theme.value === 'modern');

  const setTheme = (next: FabricTheme) => {
    theme.value = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const query = { ...route.query, theme: next };
    router.replace({ query }).catch(() => undefined);
  };

  return { theme, isModern, setTheme };
}
