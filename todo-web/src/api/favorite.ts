import request from './request'

export function buildFavoriteShareUrl(shareToken: string): string {
  const token = shareToken.trim()
  return `${window.location.origin}/share/${encodeURIComponent(token)}`
}

export function resolveFavoriteShareUrl(data?: {
  share_url?: string
  share_token?: string
}): string {
  if (data?.share_token?.trim()) {
    return buildFavoriteShareUrl(data.share_token)
  }
  const backendUrl = data?.share_url?.trim()
  if (backendUrl) {
    try {
      const parsed = new URL(backendUrl)
      const token = parsed.pathname.split('/').filter(Boolean).pop()
      if (token) {
        return buildFavoriteShareUrl(token)
      }
    } catch {
      // 回退使用原始 URL
      return backendUrl
    }
  }
  return ''
}

export function toggleFavorite(fabricId: string) {
  return request({
    url: '/fabrics/toggle_favorite',
    method: 'post',
    data: { fabric_id: fabricId }
  })
}

export function getMyFavorites(params?: any) {
  return request({
    url: '/fabrics/fabrics/my_favorites',
    method: 'get',
    params
  })
}

export function getFavoriteCount() {
  return request({
    url: '/base/me/favorite-count',
    method: 'get'
  })
}

export function shareFavorites() {
  return request({
    url: '/fabrics/fabrics/share_favorites',
    method: 'post'
  })
}

export function getSharedFavorites(token: string) {
  return request({
    url: '/fabrics/fabrics/shared_favorites',
    method: 'get',
    params: { token }
  })
}
