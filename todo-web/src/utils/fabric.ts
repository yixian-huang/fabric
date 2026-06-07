import i18n from '@/i18n';

export type FabricOption = { code: string; name?: string };

/** Go 后端 options 表 category_code（兼容旧 Django 大写枚举） */
export const OPTION_CATEGORY = {
  component: 'component',
  process: 'process',
  style: 'style',
} as const;

const LEGACY_OPTION_CATEGORIES: Record<string, string> = {
  COMPONENT: OPTION_CATEGORY.component,
  CRAFT: OPTION_CATEGORY.process,
  FABRIC_STYLE: OPTION_CATEGORY.style,
};

export function normalizeOptionCategoryCode(code?: string | null): string {
  const raw = (code ?? '').trim();
  if (!raw) return '';
  return LEGACY_OPTION_CATEGORIES[raw] ?? raw.toLowerCase();
}

export function filterOptionsByCategory<T extends { category_code?: string }>(
  options: T[],
  category: string,
): T[] {
  const normalized = normalizeOptionCategoryCode(category);
  return options.filter((option) => {
    const optionCategory = normalizeOptionCategoryCode(option.category_code);
    return optionCategory === normalized;
  });
}

export function codesToOptions(codes?: string[] | null): FabricOption[] {
  return (codes ?? []).map((code) => ({ code }));
}

/** 将 Go API 面料行转为表格/打印组件期望的结构 */
export function normalizeFabricItem<T extends Record<string, unknown>>(fabric: T) {
  const row = fabric as T & {
    style_codes?: string[];
    process_codes?: string[];
    style_options?: FabricOption[];
    process_options?: FabricOption[];
    components?: { name: string; percentage: number; option_code?: string }[] | null;
  };
  return {
    ...row,
    style_options: row.style_options ?? codesToOptions(row.style_codes),
    process_options: row.process_options ?? codesToOptions(row.process_codes),
    components: row.components ?? [],
  };
}

/** 解析列表接口 envelope：兼容 Go `{ data: { items, total } }` 与旧 Django `{ results, count }` */
export function parseFabricListResponse(res: {
  data?: {
    items?: unknown[];
    results?: unknown[];
    total?: number;
    count?: number;
    page?: number;
    page_size?: number;
  };
  results?: unknown[];
  count?: number;
}) {
  const data = res?.data ?? res;
  const rawItems = data?.items ?? data?.results ?? [];
  return {
    items: rawItems.map((item) => normalizeFabricItem(item as Record<string, unknown>)),
    total: data?.total ?? data?.count ?? 0,
    page: data?.page ?? 1,
    pageSize: data?.page_size ?? 10,
  };
}

export interface FavoriteListItem {
  favorite_id: string;
  fabric: ReturnType<typeof normalizeFabricItem>;
  created_at: string;
}

export type SharedFavoritesShareInfo = {
  username?: string;
  shared_at?: string;
  view_count?: number;
};

/** 解析收藏列表：Go 返回 `{ data: FavoriteItem[] }` 或分享 `{ data: { items } }` */
export function parseFavoriteListResponse(res: {
  data?:
    | FavoriteListItem[]
    | {
        items?: unknown[];
        favorites?: unknown[];
        results?: unknown[];
        share_info?: SharedFavoritesShareInfo;
      };
  results?: unknown[];
}): FavoriteListItem[] {
  const data = res?.data;
  const rawItems = Array.isArray(data)
    ? data
    : (data?.items ?? data?.favorites ?? data?.results ?? res?.results ?? []);

  return rawItems.map((item) => {
    const row = item as FavoriteListItem;
    return {
      ...row,
      fabric: row.fabric
        ? normalizeFabricItem(row.fabric as Record<string, unknown>)
        : row.fabric,
    };
  });
}

/** 解析分享收藏页响应（含 share_info） */
export function parseSharedFavoritesResponse(res: {
  data?:
    | FavoriteListItem[]
    | {
        items?: unknown[];
        favorites?: unknown[];
        share_info?: SharedFavoritesShareInfo;
      };
}) {
  const data = res?.data;
  const shareInfo =
    data && !Array.isArray(data) ? data.share_info ?? null : null;
  const items = parseFavoriteListResponse(res);
  return { items, shareInfo };
}

/**
 * 格式化面料选项的国际化显示
 * @param optionCode 选项代码
 * @param optionName 选项名称（可选）
 * @returns 格式化后的国际化文本
 */
export function formatI18nOptionName(
  optionCode: string,
  optionName?: string,
  optionNameZh?: string,
): string {
  const locale = i18n.global.locale.value;
  if ((locale === 'zh' || String(locale).startsWith('zh')) && optionNameZh) {
    return optionNameZh;
  }

  const optionNameKey = `fabric.${optionCode}`;
  const translated = i18n.global.t(optionNameKey);

  if (translated === optionNameKey && optionName) {
    return optionName;
  }

  return translated || optionName || optionCode;
}

/** 解析公开详情 envelope：兼容 Go `{ data: Fabric }` 与旧 Django 直出对象 */
export function parseFabricDetailResponse(res: {
  data?: Record<string, unknown>;
  reference_code?: string;
}) {
  const data = res?.data ?? res;
  if (data && typeof data === 'object' && 'reference_code' in data) {
    return normalizeFabricItem(data as Record<string, unknown>);
  }
  return null;
}

/**
 * 格式化面料成分数据
 * @param composition 成分数组
 * @returns 格式化后的成分字符串
 */
export function formatComposition(
  composition: { name: string; percentage: number; option_code?: string }[] | undefined
): string {
  if (!composition) {
    return "";
  }
  
  return composition
    .map((comp) => {
      let text = `${comp.percentage}% `;
      if (comp.option_code) {
        text += formatI18nOptionName(comp.option_code, comp.name);
      } else {
        text += comp.name;
      }
      return text;
    })
    .join(" ");
} 