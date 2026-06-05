/** 从 request 拦截器返回的 envelope 中取出 data 载荷 */
export function unwrapData<T>(response: unknown): T {
  if (response == null || typeof response !== 'object') {
    return response as T
  }
  const root = response as Record<string, unknown>
  if (root.data !== undefined) {
    return root.data as T
  }
  return response as T
}
