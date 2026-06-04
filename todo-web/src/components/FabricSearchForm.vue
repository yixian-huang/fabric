<template>
  <div class="bg-white rounded-lg shadow p-4 mb-6">
    <!-- 所有搜索条件在一行展示 -->
    <div class="flex flex-wrap gap-4 items-end">
      <!-- 成分名称 -->
      <div class="w-32">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.componentName")
        }}</label>
        <el-select
          v-model="searchForm.component_code"
          :placeholder="$t('fabric.selectComponentOption')"
          clearable
          class="w-full !rounded-button"
        >
          <el-option
            v-for="option in componentOptions"
            :key="option.option_code"
            :label="formatI18nOption(option)"
            :value="option.option_code"
          />
        </el-select>
      </div>

      <!-- 成分百分比范围 -->
      <div class="w-80">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.percentageRange")
        }}</label>
        <div class="flex items-center">
          <el-input-number
            v-model="searchForm.component_percentage_min"
            :min="0"
            :max="100"
            :precision="0"
            :placeholder="$t('fabric.min')"
            class="!w-36"
          />
          <span class="ml-1 text-gray-500">%</span>
          <span class="mx-1">-</span>
          <el-input-number
            v-model="searchForm.component_percentage_max"
            :min="0"
            :max="999"
            :precision="0"
            :placeholder="$t('fabric.max')"
            class="!w-36"
          />
          <span class="ml-1 text-gray-500">%</span>
        </div>
      </div>

      <!-- 克重范围 -->
      <div class="w-80">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.weightRange")
        }}</label>
        <div class="flex items-center">
          <el-input-number
            v-model="searchForm.weight_min"
            :min="0"
            :max="10000"
            :precision="0"
            class="!w-36"
            :placeholder="$t('fabric.min')"
          />
          <span class="mx-1">-</span>
          <el-input-number
            v-model="searchForm.weight_max"
            :min="0"
            :max="10000"
            :precision="0"
            class="!w-36"
            :placeholder="$t('fabric.max')"
          />
        </div>
      </div>
      <!-- 克重单位 -->
      <div class="w-32">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.weightUnit")
        }}</label>
        <el-select
          v-model="searchForm.weight_unit"
          :placeholder="$t('fabric.weightUnit')"
          clearable
          class="w-full !rounded-button"
        >
          <el-option value="gsm" label="gsm" />
          <el-option value="mm" label="mm" />
        </el-select>
      </div>

      <!-- 布面风格 -->
      <div class="w-48">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.surfaceStyleMultiple")
        }}</label>
        <div class="flex items-center">
          <el-select
            v-model="searchForm.style_codes"
            :placeholder="$t('fabric.selectStyle')"
            multiple
            clearable
            class="w-full !rounded-button"
          >
            <el-option
              v-for="option in fabricStyleOptions"
              :key="option.option_code"
              :label="formatI18nOption(option)"
              :value="option.option_code"
            />
          </el-select>
          <el-tooltip
            class="box-item"
            effect="dark"
            :content="$t('fabric.orTooltip')"
            placement="bottom"
          >
            <el-checkbox
              v-model="searchForm.style_enabled_or"
              :label="$t('fabric.enabledOr')"
              class="ml-2"
            />
          </el-tooltip>
        </div>
      </div>

      <!-- 工艺选项 -->
      <div class="w-48">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.craftOptionsMultiple")
        }}</label>
        <div class="flex items-center">
          <el-select
            v-model="searchForm.process_codes"
            :placeholder="$t('fabric.selectCraft')"
            multiple
            clearable
            class="w-full !rounded-button"
          >
            <el-option
              v-for="option in craftOptions"
              :key="option.option_code"
              :label="formatI18nOption(option)"
              :value="option.option_code"
            />
          </el-select>
          <el-tooltip
            class="box-item"
            effect="dark"
            :content="$t('fabric.orTooltip')"
            placement="bottom"
          >
            <el-checkbox
              v-model="searchForm.process_enabled_or"
              :label="$t('fabric.enabledOr')"
              class="ml-2"
            />
          </el-tooltip>
        </div>
      </div>

      <!-- 面料类型 -->
      <div class="w-40">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.fabricTypeField")
        }}</label>
        <el-select
          v-model="searchForm.fabric_type"
          :placeholder="$t('fabric.fabricTypeField')"
          clearable
          class="w-full !rounded-button"
        >
          <el-option :value="1" :label="$t('fabric.knitted')" />
          <el-option :value="2" :label="$t('fabric.woven')" />
          <el-option :value="3" :label="$t('fabric.lace')" />
          <el-option :value="4" :label="$t('fabric.velvet')" />
        </el-select>
      </div>

      <!-- 参考号 -->
      <div class="w-32">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.referenceCode")
        }}</label>
        <el-input
          v-model="searchForm.reference_code"
          :placeholder="$t('fabric.referenceCode')"
          class="w-full !rounded-button"
        />
      </div>

      <!-- 面料编号 -->
      <div class="w-32">
        <label class="block text-sm font-medium text-gray-700 mb-1">{{
          $t("fabric.fabricCode")
        }}</label>
        <el-input
          v-model="searchForm.fabric_code"
          :placeholder="$t('fabric.fabricCode')"
          class="w-full !rounded-button"
        />
      </div>

      <div class="w-40">
        <el-button
          type="primary"
          size="small"
          class="!rounded-button"
          @click="handleSearch"
        >
          {{ $t("fabric.search") }}
        </el-button>
        <el-button
          size="small"
          class="!rounded-button ml-2"
          @click="resetSearch"
        >
          {{ $t("fabric.resetSearch") }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { getOptions } from "@/api/fabric";
import { formatI18nOptionName } from "@/utils/fabric";

const { t } = useI18n();

// 定义组件的Props接口
const props = defineProps({
  // 初始搜索条件
  initialSearchParams: {
    type: Object,
    default: () => ({}),
  },
});

// 定义组件的事件
const emit = defineEmits(["search"]);

// 选项列表
const componentOptions = ref<any[]>([]);
const craftOptions = ref<any[]>([]);
const fabricStyleOptions = ref<any[]>([]);

// 搜索表单数据
const searchForm = reactive({
  fabric_type: null as number | null,
  weight_unit: "" as string | null,
  weight_min: null as number | null,
  weight_max: null as number | null,
  component_code: "",
  component_percentage_min: null as number | null,
  component_percentage_max: null as number | null,
  style_codes: "" as string,
  style_enabled_or: false,
  process_codes: "" as string,
  process_enabled_or: false,
  reference_code: "",
  fabric_code: "",
});

// 用于国际化处理选项
const formatI18nOption = (option: any): string => {
  return formatI18nOptionName(option.option_code, option.option_name);
};

// 搜索处理函数
const handleSearch = () => {
  // 构造搜索参数
  const searchParams: Record<string, any> = {};

  Object.keys(searchForm).forEach((key) => {
    if (searchForm[key] !== null && searchForm[key] !== undefined) {
      searchParams[key] = searchForm[key];
    }
  });
  // 处理数组字段
  if (searchForm.style_codes.length > 0) {
    console.log(searchForm.style_codes);
    searchParams.style_codes = Array.isArray(searchForm.style_codes)
      ? searchForm.style_codes.join(",")
      : searchForm.style_codes;
  }

  if (searchForm.process_codes.length > 0) {
    searchParams.process_codes = Array.isArray(searchForm.process_codes)
      ? searchForm.process_codes.join(",")
      : searchForm.process_codes;
  }
  // 触发搜索事件
  emit("search", searchParams);
};

// 重置搜索表单
const resetSearch = () => {
  // 重置表单数据
  searchForm.fabric_type = null;
  searchForm.weight_min = null;
  searchForm.weight_max = null;
  searchForm.component_code = ""; // 修正属性名
  searchForm.component_percentage_min = null;
  searchForm.component_percentage_max = null;
  searchForm.style_codes = "";
  searchForm.process_codes = "";
  searchForm.reference_code = ""; // 添加重置
  searchForm.fabric_code = ""; // 添加重置
  searchForm.weight_unit = ""; // 重置为默认值
  searchForm.style_enabled_or = false;
  searchForm.process_enabled_or = false;
  // 触发搜索事件，传入空对象，表示无筛选条件
  emit("search", {});
};

// 获取选项列表数据
const fetchOptions = async () => {
  try {
    const res = await getOptions();
    if (res.code === 200 && res.data) {
      // 设置选项数据
      componentOptions.value = res.data.filter(
        (option: any) => option.category_code === "COMPONENT"
      );
      craftOptions.value = res.data.filter(
        (option: any) => option.category_code === "CRAFT"
      );
      fabricStyleOptions.value = res.data.filter(
        (option: any) => option.category_code === "FABRIC_STYLE"
      );
    }
  } catch (error) {
    console.error("获取选项数据失败:", error);
  }
};

// 初始化组件
onMounted(() => {
  // 获取选项数据
  fetchOptions();

  // 如果有初始搜索参数，设置到表单中
  if (props.initialSearchParams) {
    const params = props.initialSearchParams;

    // 设置面料类型
    if ("fabric_type" in params) {
      searchForm.fabric_type = Number(params.fabric_type);
    }

    // 设置克重范围
    if ("weight_min" in params) {
      searchForm.weight_min = Number(params.weight_min);
    }
    if ("weight_max" in params) {
      searchForm.weight_max = Number(params.weight_max);
    }

    // 设置成分搜索
    if ("component_code" in params) {
      searchForm.component_code = params.component_code;
    }
    if ("component_percentage_min" in params) {
      searchForm.component_percentage_min = Number(
        params.component_percentage_min
      );
    }
    if ("component_percentage_max" in params) {
      searchForm.component_percentage_max = Number(
        params.component_percentage_max
      );
    }

    // 设置布面风格和工艺选项
    if ("style_codes" in params) {
      searchForm.style_codes = params.style_codes.join(",");
    }
    if ("process_codes" in params) {
      searchForm.process_codes = params.process_codes.join(",");
    }
    if ("style_enabled_or" in params) {
      searchForm.style_enabled_or = params.style_enabled_or;
    }
    if ("process_enabled_or" in params) {
      searchForm.process_enabled_or = params.process_enabled_or;
    }
  }
});
</script>

<style scoped>
:deep(.el-input-number) {
  width: 100%;
}
</style> 