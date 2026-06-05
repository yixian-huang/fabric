<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-7xl mx-auto">
      <!-- 页面标题和分享信息 -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">
              {{ $t("favorite.sharedFavorites") }}
            </h1>
            <p class="text-gray-600 mt-2" v-if="shareInfo">
              {{ $t("favorite.sharedBy", { username: shareInfo.username }) }}
              <span class="text-gray-400 ml-2">
                {{
                  $t("favorite.sharedAt", {
                    date: formatDate(shareInfo.shared_at),
                  })
                }}
              </span>
              <span class="text-gray-400 ml-2">
                {{ $t("favorite.viewCount", { count: shareInfo.view_count ?? 0 }) }}
              </span>
            </p>
            <p class="text-gray-600 mt-2" v-else-if="total > 0">
              {{ $t("favorite.favoriteCount", { count: total }) }}
            </p>
          </div>
          <el-button @click="goHome">
            <el-icon><House /></el-icon>
            {{ $t("common.backToHome") }}
          </el-button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="flex justify-center items-center py-20">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="error"
        class="bg-white rounded-lg shadow-sm p-12 text-center"
      >
        <el-icon :size="60" color="#f56c6c"><CircleCloseFilled /></el-icon>
        <h2 class="text-xl font-semibold text-gray-800 mt-4">
          {{ errorMessage }}
        </h2>
        <p class="text-gray-600 mt-2">{{ $t("favorite.shareInvalidHint") }}</p>
        <el-button type="primary" @click="goHome" class="mt-6">
          {{ $t("common.backToHome") }}
        </el-button>
      </div>

      <!-- 收藏列表 -->
      <div v-else-if="favorites.length > 0">
        <FabricTable
          :fabrics="fabricList"
          :show-selection="false"
          :show-favorite="false"
        />

        <!-- 分页 -->
        <div
          class="flex justify-end p-4 bg-white border-t mt-4 rounded-lg shadow-sm"
        >
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next"
            :total="total"
            @size-change="handlePageChange"
            @current-change="handlePageChange"
            @update:current-page="currentPage = $event"
            @update:page-size="pageSize = $event"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="bg-white rounded-lg shadow-sm p-12 text-center">
        <el-icon :size="60" color="#909399"><FolderOpened /></el-icon>
        <h2 class="text-xl font-semibold text-gray-800 mt-4">
          {{ $t("favorite.noSharedFavorites") }}
        </h2>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import {
  House,
  Loading,
  CircleCloseFilled,
  FolderOpened,
} from "@element-plus/icons-vue";
import { useI18n } from "vue-i18n";
import { getSharedFavorites } from "@/api/favorite";
import { parseSharedFavoritesResponse } from "@/utils/fabric";
import type { SharedFavoritesShareInfo } from "@/utils/fabric";
import FabricTable from "@/components/FabricTable.vue";

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const loading = ref(true);
const error = ref(false);
const errorMessage = ref("");
const shareInfo = ref<SharedFavoritesShareInfo | null>(null);
const favorites = ref<any[]>([]);
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);

const fabricList = computed(() => {
  return favorites.value.map((fav) => fav.fabric);
});

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString();
};

const fetchSharedFavorites = async () => {
  loading.value = true;
  error.value = false;

  try {
    const token = route.params.token as string;
    if (!token) {
      throw new Error("缺少分享令牌");
    }
    const response = await getSharedFavorites(token);
    const { items, shareInfo: info } = parseSharedFavoritesResponse(response);
    shareInfo.value = info;
    favorites.value = items;
    total.value = items.length;
  } catch (err: unknown) {
    error.value = true;
    const msg = err instanceof Error ? err.message : '';
    errorMessage.value = msg || t("favorite.shareInvalid");
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
};

const handlePageChange = () => {
  // 前端分页逻辑（如果后端不支持分页）
  // 或者重新调用 API 获取数据
};

const goHome = () => {
  router.push("/");
};

onMounted(() => {
  fetchSharedFavorites();
});
</script>

<style scoped>
.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

