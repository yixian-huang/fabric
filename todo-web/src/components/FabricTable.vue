<template>
  <div class="fabric-table">
    <el-table
      :data="fabrics"
      style="width: 100%"
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
              class="fabric-table__thumb"
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
              class="composition-item text-left py-1 border-b last:border-b-0"
              style="border-color: var(--fabric-border)"
            >
              {{ formatComposition(scope.row.components) }}
            </div>
            <div
              v-if="scope.row.yarn_count"
              class="composition-item text-left py-1 border-b"
              style="border-color: var(--fabric-border)"
            >
              {{ scope.row.yarn_count }}
              {{ scope.row.density }}
            </div>
            <div
              v-if="scope.row.weight"
              class="composition-item text-left py-1 border-b"
              style="border-color: var(--fabric-border)"
            >
              <span class="composition-item__muted"
                >{{ scope.row.weight }} {{ scope.row.weight_unit }}
              </span>
            </div>
            <div
              v-if="scope.row.width"
              class="composition-item text-left py-1 border-b"
              style="border-color: var(--fabric-border)"
            >
              <span class="composition-item__muted">{{ scope.row.width }}</span>
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
            <span
              v-for="item in styleOptions(scope.row)"
              :key="item.code"
              class="fabric-tag fabric-table__tag"
            >
              {{ formatI18nOption(item) }}
            </span>
            <span class="fabric-tag fabric-table__tag">
              <template v-if="scope.row.fabric_type === 1">
                {{ $t("fabric.knitted") }}
              </template>
              <template v-else-if="scope.row.fabric_type === 2">
                {{ $t("fabric.woven") }}
              </template>
              <template v-else-if="scope.row.fabric_type === 3">
                {{ $t("fabric.lace") }}
              </template>
              <template v-else-if="scope.row.fabric_type === 4">
                {{ $t("fabric.velvet") }}
              </template>
            </span>
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
            <span
              v-for="item in processOptions(scope.row)"
              :key="item.code"
              class="fabric-tag fabric-table__tag"
            >
              {{ formatI18nOption(item) }}
            </span>
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
.fabric-table :deep(.el-table) {
  --el-table-header-text-color: var(--fabric-ink);
}

.fabric-table :deep(.el-table th.el-table__cell) {
  font-family: var(--font-body);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  height: 48px;
  background: var(--fabric-accent-soft) !important;
}

.fabric-table :deep(.el-table td.el-table__cell) {
  padding: 14px 0;
  color: var(--fabric-ink);
}

.fabric-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.fabric-table :deep(.el-table--border .el-table__cell) {
  border-color: var(--fabric-border);
}

.fabric-table__thumb {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--fabric-border);
  margin: 0 auto;
}

.fabric-table__tag {
  margin: 0 0.25rem 0.35rem 0;
}

.composition-container {
  background: rgba(240, 232, 220, 0.35);
  border-radius: 10px;
  border: 1px solid var(--fabric-border);
}

.composition-item {
  font-weight: 500;
  color: var(--fabric-ink);
  transition: background-color 0.2s;
}

.composition-item__muted {
  color: var(--fabric-muted);
}

.composition-item:hover {
  background: rgba(255, 252, 248, 0.65);
}
</style> 