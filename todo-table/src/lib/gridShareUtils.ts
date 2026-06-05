/** 普通行级分享链接（按供应商过滤） */
export function buildProjectShareUrl(
  origin: string,
  sharedKey: string,
  password: string,
  vendorName?: string
): string {
  const params = new URLSearchParams({ password });
  if (vendorName) {
    params.set('vendor', vendorName);
  }
  return `${origin}/share/${sharedKey}?${params.toString()}`;
}

/** 供应商专属分享链接 */
export function buildVendorShareUrl(
  origin: string,
  sharedKey: string,
  password: string
): string {
  const params = new URLSearchParams({ password });
  return `${origin}/v/${sharedKey}?${params.toString()}`;
}
