import request from './request'

export function toggleFavorite(fabricId: string) {
  return request({
    url: '/fabrics/toggle_favorite',
    method: 'post',
    data: { fabric_id: fabricId }
  })
}

export function getMyFavorites(params?: any) {
  return request({
    url: '/fabrics/fabrics/my_favorites/',
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
    url: '/fabrics/fabrics/share_favorites/',
    method: 'post'
  })
}

export function getSharedFavorites(token: string) {
  return request({
    url: '/fabrics/fabrics/shared_favorites/',
    method: 'get',
    params: { token }
  })
}

export function exportFavoritesPDF() {
  return request({
    url: '/fabrics/fabrics/export_favorites_pdf/',
    method: 'post',
    responseType: 'blob'
  })
}