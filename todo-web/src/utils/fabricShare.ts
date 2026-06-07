import {
  formatComposition,
  formatI18nOptionName,
  codesToOptions,
} from '@/utils/fabric';
import { fabricDetailUrl } from '@/config/site';

type TranslateFn = (key: string, ...args: unknown[]) => string;

function buildSpecLines(fabric: Record<string, any>): string[] {
  const lines: string[] = [];
  if (fabric.yarn_count || fabric.density) {
    lines.push([fabric.yarn_count, fabric.density].filter(Boolean).join(' '));
  }
  if (fabric.weight) {
    lines.push(`${fabric.weight} ${fabric.weight_unit || ''}`.trim());
  }
  if (fabric.width) lines.push(String(fabric.width));
  return lines;
}

function buildTagLines(fabric: Record<string, any>, t: TranslateFn): string[] {
  const styleOpts = fabric.style_options ?? codesToOptions(fabric.style_codes);
  const processOpts = fabric.process_options ?? codesToOptions(fabric.process_codes);
  const typeLabels: Record<number, string> = {
    1: t('fabric.knitted'),
    2: t('fabric.woven'),
    3: t('fabric.lace'),
    4: t('fabric.velvet'),
  };
  const tags = [
    ...styleOpts.map((item: { code: string; name?: string }) =>
      formatI18nOptionName(item.code, item.name),
    ),
    ...processOpts.map((item: { code: string; name?: string }) =>
      formatI18nOptionName(item.code, item.name),
    ),
  ];
  if (fabric.fabric_type && typeLabels[fabric.fabric_type]) {
    tags.push(typeLabels[fabric.fabric_type]);
  }
  return tags;
}

export function buildFabricShareText(
  fabric: Record<string, any>,
  t: TranslateFn,
): string {
  const url = fabricDetailUrl(fabric.reference_code);
  const composition = formatComposition(fabric.components);
  const specs = buildSpecLines(fabric);
  const tags = buildTagLines(fabric, t);
  const lines = [
    `${t('fabric.referenceNo')}: ${fabric.reference_code}`,
    `${fabric.code}-${fabric.merchant_code}`,
  ];
  if (composition) lines.push(composition);
  if (specs.length) lines.push(specs.join(' · '));
  if (tags.length) lines.push(tags.join(' · '));
  lines.push(url);
  return lines.join('\n');
}

async function fetchImageFile(imageUrl: string, fileName: string): Promise<File | null> {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type || 'image/jpeg';
    return new File([blob], fileName, { type });
  } catch {
    return null;
  }
}

export async function shareFabricDetail(
  fabric: Record<string, any>,
  title: string,
  t: TranslateFn,
): Promise<'shared' | 'copied' | 'shown'> {
  const url = fabricDetailUrl(fabric.reference_code);
  const text = buildFabricShareText(fabric, t);
  const imageUrl = fabric.watermark_image_url || fabric.thumbnail_url;

  if (typeof navigator.share === 'function') {
    const shareData: ShareData & { files?: File[] } = { title, text, url };
    if (imageUrl) {
      const file = await fetchImageFile(
        imageUrl,
        `${fabric.reference_code || 'fabric'}.jpg`,
      );
      if (file && navigator.canShare?.({ files: [file] })) {
        shareData.files = [file];
      }
    }
    if (!shareData.files && !navigator.canShare?.(shareData)) {
      // Some browsers only support url+title
      shareData.text = text;
    }
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        throw err;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'shown';
  }
}
