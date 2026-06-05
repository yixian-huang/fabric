import { defineStore } from 'pinia'
import { 
  getMyFavorites, 
  toggleFavorite as apiToggleFavorite,
  getFavoriteCount 
} from '@/api/favorite'
import { parseFavoriteListResponse, type FavoriteListItem } from '@/utils/fabric'

export const useFavoriteStore = defineStore('favorite', {
  state: () => ({
    favorites: [] as FavoriteListItem[],
    favoriteCount: 0,
    loading: false
  }),
  
  actions: {
    async fetchFavorites() {
      this.loading = true
      try {
        const response = await getMyFavorites()
        const items = parseFavoriteListResponse(response)
        this.favorites = items
        this.favoriteCount = items.length
      } finally {
        this.loading = false
      }
    },
    
    async fetchFavoriteCount() {
      try {
        const response = await getFavoriteCount()
        this.favoriteCount =
          response.data?.favorite_count ?? response.data?.count ?? 0
      } catch (error) {
        console.error('Failed to fetch favorite count:', error)
      }
    },
    
    async toggleFavorite(fabricId: string) {
      const response = await apiToggleFavorite(fabricId)
      const isFavorited = response.data.is_favorited
      
      if (isFavorited) {
        // 如果是收藏操作，增加计数
        this.favoriteCount++
      } else {
        // 如果是取消收藏，减少计数并从列表中移除
        this.favoriteCount--
        this.favorites = this.favorites.filter(
          item => item.fabric.fabric_id !== fabricId
        )
      }
      
      return isFavorited
    },
    
    clearFavorites() {
      this.favorites = []
      this.favoriteCount = 0
    }
  }
})