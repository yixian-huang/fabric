import { formatComposition, formatI18nOptionName, codesToOptions } from '@/utils/fabric';

type FabricRow = {
  reference_code?: string;
  code?: string;
  merchant_code?: string;
  weight?: number;
  weight_unit?: string;
  width?: string;
  yarn_count?: string;
  density?: string;
  remark?: string;
  components?: { name: string; percentage: number; option_code?: string }[];
  style_codes?: string[];
  process_codes?: string[];
  style_options?: { code: string; name?: string }[];
  process_options?: { code: string; name?: string }[];
  fabric_type?: number;
};

export function buildFabricSeoTitle(fabric: FabricRow): string {
  const ref = fabric.reference_code || fabric.code || '';
  const composition = formatComposition(fabric.components);
  const parts = [ref];
  if (composition) parts.push(composition.split(' ').slice(0, 3).join(' '));
  if (fabric.weight) parts.push(`${fabric.weight}${fabric.weight_unit || ''}`);
  return parts.filter(Boolean).join(' · ');
}

export function buildFabricSeoDescription(fabric: FabricRow): string {
  const parts: string[] = [];
  if (fabric.reference_code) parts.push(`Ref ${fabric.reference_code}`);
  if (fabric.code) parts.push(`Code ${fabric.code}-${fabric.merchant_code || ''}`.replace(/-$/, ''));
  const composition = formatComposition(fabric.components);
  if (composition) parts.push(composition);
  if (fabric.weight) parts.push(`${fabric.weight} ${fabric.weight_unit || 'g/m2'}`);
  if (fabric.width) parts.push(fabric.width);
  const styles = (fabric.style_options ?? codesToOptions(fabric.style_codes))
    .map((s) => formatI18nOptionName(s.code, s.name))
    .slice(0, 3);
  if (styles.length) parts.push(styles.join(', '));
  if (fabric.remark) parts.push(fabric.remark);
  return parts.filter(Boolean).join(' · ').slice(0, 160);
}

export function buildFabricProductJsonLd(
  fabric: FabricRow,
  url: string,
  imageUrl?: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: fabric.reference_code || fabric.code,
    description: buildFabricSeoDescription(fabric),
    url,
    image: imageUrl || undefined,
    sku: fabric.reference_code,
    brand: {
      '@type': 'Brand',
      name: 'DAILY SILK FABRIC HUB',
    },
  };
}
