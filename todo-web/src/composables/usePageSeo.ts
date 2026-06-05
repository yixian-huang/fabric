import { useHead } from '@unhead/vue';
import { siteConfig, absoluteUrl } from '@/config/site';

export interface PageSeoOptions {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function usePageSeo(options: PageSeoOptions) {
  const fullTitle = options.title
    ? `${options.title} | ${siteConfig.name}`
    : siteConfig.name;

  const description = options.description || siteConfig.description;
  const canonical = options.canonical ? absoluteUrl(options.canonical) : undefined;
  const ogImage = options.ogImage ? absoluteUrl(options.ogImage) : undefined;

  const meta: Record<string, string>[] = [
    { name: 'description', content: description },
    { name: 'keywords', content: options.keywords || siteConfig.keywords },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:site_name', content: siteConfig.name },
    { property: 'og:type', content: options.ogType || 'website' },
    { name: 'twitter:card', content: ogImage ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
  ];

  if (canonical) {
    meta.push({ property: 'og:url', content: canonical });
  }
  if (ogImage) {
    meta.push({ property: 'og:image', content: ogImage });
    meta.push({ name: 'twitter:image', content: ogImage });
  }

  const script = options.jsonLd
    ? [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify(
            Array.isArray(options.jsonLd) ? options.jsonLd : options.jsonLd,
          ),
        },
      ]
    : [];

  useHead({
    title: fullTitle,
    meta: meta as Parameters<typeof useHead>[0]['meta'],
    link: canonical ? [{ rel: 'canonical', href: canonical }] : [],
    script: script.length
      ? (script as Parameters<typeof useHead>[0]['script'])
      : undefined,
  });
}
