export type FabricTheme = 'classic' | 'modern';

export const siteConfig = {
  name: import.meta.env.VITE_SITE_NAME || 'DAILY SILK FABRIC HUB',
  url: (import.meta.env.VITE_SITE_URL || '').replace(/\/$/, ''),
  description:
    import.meta.env.VITE_SITE_DESCRIPTION ||
    'Professional silk fabric showcase — browse compositions, weights, and styles online.',
  keywords:
    import.meta.env.VITE_SITE_KEYWORDS ||
    'silk fabric, fabric hub, textile, 丝绸面料, 面料展示',
  defaultTheme: (import.meta.env.VITE_FABRIC_THEME === 'classic'
    ? 'classic'
    : 'modern') as FabricTheme,
};

export function absoluteUrl(path: string): string {
  const base = siteConfig.url || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!path) return base;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function fabricDetailPath(referenceCode: string): string {
  return `/fabric/${encodeURIComponent(referenceCode)}`;
}

export function fabricDetailUrl(referenceCode: string): string {
  return absoluteUrl(fabricDetailPath(referenceCode));
}
