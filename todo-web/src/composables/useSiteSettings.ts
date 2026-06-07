import { ref } from 'vue';
import { getPublicSettings } from '@/api/settings';
import { siteConfig } from '@/config/site';

const loaded = ref(false);
const publicSettings = ref({
  site_title: siteConfig.name,
  site_subtitle: '',
  site_description: siteConfig.description,
  favicon_url: '/favicon.ico',
});

export function useSiteSettings() {
  async function loadPublicSettings() {
    if (loaded.value) return publicSettings.value;
    try {
      const res = await getPublicSettings();
      const data = (res as { data?: typeof publicSettings.value }).data;
      if (data) {
        publicSettings.value = {
          site_title: data.site_title || siteConfig.name,
          site_subtitle: data.site_subtitle || '',
          site_description: data.site_description || siteConfig.description,
          favicon_url: data.favicon_url || '/favicon.ico',
        };
        applyFavicon(publicSettings.value.favicon_url);
      }
    } catch {
      // keep env defaults
    }
    loaded.value = true;
    return publicSettings.value;
  }

  return { publicSettings, loadPublicSettings, loaded };
}

function applyFavicon(url: string) {
  if (typeof document === 'undefined' || !url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}
