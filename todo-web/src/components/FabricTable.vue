<template>
  <div>
    <el-table
      :data="fabrics"
      style="width: 100%"
      :header-cell-style="{
        background: '#f5f7fa',
        color: '#333',
        fontWeight: 'bold',
      }"
      border
      @selection-change="$emit('selection-change', $event)"
    >
      <!-- 选择框 -->
      <el-table-column v-if="showSelection" type="selection" width="55" align="center" />
      
      <!-- 收藏列 - 新增 -->
      <el-table-column v-if="showFavorite" :label="$t('fabric.favorite')" align="center" width="80">
        <template #default="scope">
          <el-button
            :type="scope.row.is_favorited ? 'danger' : 'default'"
            :icon="scope.row.is_favorited ? StarFilled : Star"
            circle
            size="small"
            @click="handleToggleFavorite(scope.row)"
            :loading="favoriteLoading[scope.row.fabric_id]"
          />
        </template>
      </el-table-column>
      
      <!-- 参考号 -->
      <el-table-column
        prop="reference_code"
        :label="$t('fabric.referenceNo')"
        align="center"
        min-width="120"
      />
      <!-- 面料商编号 -->
      <el-table-column
        :label="t('fabric.fabricCodeColumn')"
        align="center"
        min-width="120"
      >
        <template #default="scope">
          <div>{{ scope.row.code }}-{{ scope.row.merchant_code }}</div>
        </template>
      </el-table-column>
      <!-- 图片 -->
      <el-table-column
        :label="$t('fabric.photo')"
        align="center"
        min-width="150"
      >
        <template #default="scope">
            <el-image 
              class="w-full h-full"
              preview-teleported
              :src="scope.row.thumbnail_url"
              :zoom-rate="1.2"
              :max-scale="7"
              :min-scale="0.2"
              :z-index="999"
              :preview-src-list="[scope.row.watermark_image_url]"
              show-progress
              :initial-index="4"
              fit="cover"
            />

        </template>
      </el-table-column>
      <!-- 成分与规格 -->
      <el-table-column
        :label="$t('fabric.fabricDetailTitle')"
        align="left"
        min-width="220"
      >
        <template #default="scope">
          <div class="composition-container p-2">
            <div
              class="composition-item text-left py-1 border-b border-gray-200 last:border-b-0"
            >
              {{ formatComposition(scope.row.components) }}
            </div>
            <div
              v-if="scope.row.yarn_count"
              class="composition-item text-left py-1 border-b border-gray-200"
            >
              {{ scope.row.yarn_count }}
              {{ scope.row.density }}
            </div>
            <div
              v-if="scope.row.weight"
              class="composition-item text-left py-1 border-b border-gray-200"
            >
              <span class="text-gray-600"
                >{{ scope.row.weight }} {{ scope.row.weight_unit }}
              </span>
            </div>
            <div
              v-if="scope.row.width"
              class="composition-item text-left py-1 border-b border-gray-200"
            >
              <span class="text-gray-600">{{ scope.row.width }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <!-- 布面风格 -->
      <el-table-column
        :label="$t('fabric.fabricStyleTitle')"
        align="center"
        min-width="150"
      >
        <template #default="scope">
            <el-tag
              v-for="item in styleOptions(scope.row)"
              :key="item.code"
              class="mr-1"
              type="success"
              size="small"
            >
              {{ formatI18nOption(item) }}
            </el-tag>
            <el-tag type="success" size="small">
              <template v-if="scope.row.fabric_type === 1">
                {{ $t("fabric.knitted") }}
              </template>
              <template v-if="scope.row.fabric_type === 2">
                {{ $t("fabric.woven") }}
              </template>
              <template v-if="scope.row.fabric_type === 3">
                {{ $t("fabric.lace") }}
              </template>
              <template v-if="scope.row.fabric_type === 4">
                {{ $t("fabric.velvet") }}
              </template>
            </el-tag>
        </template>
      </el-table-column>

      <!-- 工艺 -->
      <el-table-column
        :label="$t('fabric.finishing')"
        align="center"
        min-width="120"
      >
        <template #default="scope">
          <div
            v-if="processOptions(scope.row).length"
          >
            <el-tag
              v-for="item in processOptions(scope.row)"
              :key="item.code"
              class="mr-1 mb-1"
              type="success"
              size="small"
            >
              {{ formatI18nOption(item) }}
            </el-tag>
          </div>
          <div v-else>
            {{ $t("fabric.noFinishingOptions") }}
          </div>
        </template>
      </el-table-column>

      <!-- 备注 -->
      <el-table-column
        prop="remark"
        :label="$t('fabric.remark')"
        align="center"
        min-width="120"
      />
      <!-- 操作 -->
      <el-table-column
        :label="$t('fabric.operation')"
        align="center"
        min-width="160"
        v-if="$slots.actions"
      >
        <template #default="scope">
          <slot name="actions" :row="scope.row"></slot>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script lang="ts" setup>
import { ref, defineProps, defineEmits } from "vue";
import { useI18n } from "vue-i18n";
import { Star, StarFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '../stores/user'
import { useFavoriteStore } from '../stores/favorite'
import {
  codesToOptions,
  formatI18nOptionName,
  formatComposition as formatComp,
} from "../utils/fabric";

const { t } = useI18n();
const userStore = useUserStore()
const favoriteStore = useFavoriteStore()

defineProps({
  fabrics: {
    type: Array,
    required: true,
    default: () => [],
  },
  showSelection: {
    type: Boolean,
    default: true
  },
  showFavorite: {
    type: Boolean,
    default: true
  }
});

const emit = defineEmits(["selection-change", "show-login"]);

const favoriteLoading = ref<Record<string, boolean>>({})

const handleToggleFavorite = async (fabric: any) => {
  if (!userStore.isLoggedIn) {
    ElMessageBox.confirm(
      t('fabric.favoriteNeedLogin'),
      t('common.tip'),
      {
        confirmButtonText: t('auth.goLogin'),
        cancelButtonText: t('common.cancel'),
        type: 'info'
      }
    ).then(() => {
      // 使用状态管理显示登录对话框
      userStore.openLoginDialog()
    }).catch(() => {
      // 用户取消
    })
    return
  }
  
  favoriteLoading.value[fabric.fabric_id] = true
  try {
    const isFavorited = await favoriteStore.toggleFavorite(fabric.fabric_id)
    fabric.is_favorited = isFavorited
    ElMessage.success(
      isFavorited ? t('favorite.favoriteSuccess') : t('favorite.unfavoriteSuccess')
    )
  } catch (error) {
    ElMessage.error(t('favorite.favoriteError'))
  } finally {
    favoriteLoading.value[fabric.fabric_id] = false
  }
}

const styleOptions = (row: { style_options?: { code: string; name?: string }[]; style_codes?: string[] }) =>
  row.style_options ?? codesToOptions(row.style_codes);

const processOptions = (row: { process_options?: { code: string; name?: string }[]; process_codes?: string[] }) =>
  row.process_options ?? codesToOptions(row.process_codes);

// 用于国际化处理选项
const formatI18nOption = (item: any): string => {
  return formatI18nOptionName(item.code, item.name);
};

// 格式化成分数据
const formatComposition = formatComp;

</script>

<style scoped>
/* 自定义表格样式 */
:deep(.el-table) {
  --el-table-header-bg-color: #f5f7fa;
  --el-table-border-color: #ebeef5;
  --el-table-row-hover-bg-color: #f5f7fa;
}
:deep(.el-table th) {
  font-weight: 600;
  color: #333;
  height: 50px;
}
:deep(.el-table td) {
  padding: 12px 0;
}
:deep(.el-dialog__header) {
  margin-right: 0;
  text-align: center;
  font-weight: bold;
}

/* 成分样式 */
.composition-container {
  background-color: #f8f9fa;
  border-radius: 4px;
}
.composition-item {
  font-weight: 500;
  color: #4a5568;
  transition: background-color 0.2s;
}
.composition-item:hover {
  background-color: #edf2f7;
}
</style> 