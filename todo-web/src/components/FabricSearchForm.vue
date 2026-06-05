<template>
  <section
    class="fabric-search fabric-search-panel"
    :class="{ 'fabric-search--expanded': expanded }"
  >
    <!-- 简约默认栏：参考号 + 面料编号 + 操作 -->
    <div class="fabric-search__bar">
      <div class="fabric-search__quick">
        <el-input
          v-model="searchForm.reference_code"
          :placeholder="t('fabric.referenceCode')"
          clearable
          class="fabric-search__control fabric-search__quick-input"
          @keyup.enter="handleSearch"
        />
        <el-input
          v-model="searchForm.fabric_code"
          :placeholder="t('fabric.fabricCode')"
          clearable
          class="fabric-search__control fabric-search__quick-input"
          @keyup.enter="handleSearch"
        />
      </div>

      <div class="fabric-search__bar-actions">
        <button
          type="button"
          class="fabric-search__btn fabric-search__btn--primary fabric-search__btn--sm"
          @click="handleSearch"
        >
          {{ t('fabric.search') }}
        </button>
        <button
          v-if="activeFilterCount > 0"
          type="button"
          class="fabric-search__btn fabric-search__btn--ghost fabric-search__btn--sm"
          @click="resetSearch"
        >
          {{ t('fabric.resetSearch') }}
        </button>
        <button
          type="button"
          class="fabric-search__toggle"
          :aria-expanded="expanded"
          @click="toggleExpanded"
        >
          <span>{{ expanded ? t('fabric.collapseFilters') : t('fabric.expandFilters') }}</span>
          <span v-if="advancedFilterCount > 0 && !expanded" class="fabric-search__badge">
            {{ advancedFilterCount }}
          </span>
          <el-icon class="fabric-search__chevron" :class="{ 'is-open': expanded }">
            <ArrowDown />
          </el-icon>
        </button>
      </div>
    </div>

    <!-- 高级筛选（折叠） -->
    <Transition name="fabric-search-expand">
      <div v-show="expanded" class="fabric-search__advanced">
        <div class="fabric-search__grid">
          <div class="fabric-search__field">
            <label class="fabric-search__label">{{ t('fabric.componentName') }}</label>
            <el-select
              v-model="searchForm.component_code"
              :placeholder="t('fabric.selectComponentOption')"
              clearable
              class="fabric-search__control"
            >
              <el-option
                v-for="option in componentOptions"
                :key="option.option_code"
                :label="formatI18nOption(option)"
                :value="option.option_code"
              />
            </el-select>
          </div>

          <div class="fabric-search__field fabric-search__field--wide">
            <label class="fabric-search__label">{{ t('fabric.percentageRange') }}</label>
            <div class="fabric-search__range">
              <el-input-number
                v-model="searchForm.component_percentage_min"
                :min="0"
                :max="100"
                :precision="0"
                :placeholder="t('fabric.min')"
                controls-position="right"
                class="fabric-search__control"
              />
              <span class="fabric-search__range-sep">—</span>
              <el-input-number
                v-model="searchForm.component_percentage_max"
                :min="0"
                :max="999"
                :precision="0"
                :placeholder="t('fabric.max')"
                controls-position="right"
                class="fabric-search__control"
              />
              <span class="fabric-search__range-unit">%</span>
            </div>
          </div>

          <div class="fabric-search__field fabric-search__field--wide">
            <label class="fabric-search__label">{{ t('fabric.weightRange') }}</label>
            <div class="fabric-search__range">
              <el-input-number
                v-model="searchForm.weight_min"
                :min="0"
                :max="10000"
                :precision="0"
                :placeholder="t('fabric.min')"
                controls-position="right"
                class="fabric-search__control"
              />
              <span class="fabric-search__range-sep">—</span>
              <el-input-number
                v-model="searchForm.weight_max"
                :min="0"
                :max="10000"
                :precision="0"
                :placeholder="t('fabric.max')"
                controls-position="right"
                class="fabric-search__control"
              />
            </div>
          </div>

          <div class="fabric-search__field">
            <label class="fabric-search__label">{{ t('fabric.weightUnit') }}</label>
            <el-select
              v-model="searchForm.weight_unit"
              :placeholder="t('fabric.weightUnit')"
              clearable
              class="fabric-search__control"
            >
              <el-option value="g/m2" label="g/m2" />
              <el-option value="gsm" label="gsm" />
              <el-option value="mm" label="mm" />
            </el-select>
          </div>

          <div class="fabric-search__field fabric-search__field--wide">
            <label class="fabric-search__label">{{ t('fabric.surfaceStyleMultiple') }}</label>
            <div class="fabric-search__with-or">
              <el-select
                v-model="searchForm.style_codes"
                :placeholder="t('fabric.selectStyle')"
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
                class="fabric-search__control fabric-search__control--grow"
              >
                <el-option
                  v-for="option in fabricStyleOptions"
                  :key="option.option_code"
                  :label="formatI18nOption(option)"
                  :value="option.option_code"
                />
              </el-select>
              <el-tooltip :content="t('fabric.orTooltip')" placement="top">
                <label class="fabric-search__or-toggle">
                  <el-checkbox v-model="searchForm.style_enabled_or" />
                  <span>{{ t('fabric.enabledOr') }}</span>
                </label>
              </el-tooltip>
            </div>
          </div>

          <div class="fabric-search__field fabric-search__field--wide">
            <label class="fabric-search__label">{{ t('fabric.craftOptionsMultiple') }}</label>
            <div class="fabric-search__with-or">
              <el-select
                v-model="searchForm.process_codes"
                :placeholder="t('fabric.selectCraft')"
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
                class="fabric-search__control fabric-search__control--grow"
              >
                <el-option
                  v-for="option in craftOptions"
                  :key="option.option_code"
                  :label="formatI18nOption(option)"
                  :value="option.option_code"
                />
              </el-select>
              <el-tooltip :content="t('fabric.orTooltip')" placement="top">
                <label class="fabric-search__or-toggle">
                  <el-checkbox v-model="searchForm.process_enabled_or" />
                  <span>{{ t('fabric.enabledOr') }}</span>
                </label>
              </el-tooltip>
            </div>
          </div>

          <div class="fabric-search__field">
            <label class="fabric-search__label">{{ t('fabric.fabricTypeField') }}</label>
            <el-select
              v-model="searchForm.fabric_type"
              :placeholder="t('fabric.fabricTypeField')"
              clearable
              class="fabric-search__control"
            >
              <el-option :value="1" :label="t('fabric.knitted')" />
              <el-option :value="2" :label="t('fabric.woven')" />
              <el-option :value="3" :label="t('fabric.lace')" />
              <el-option :value="4" :label="t('fabric.velvet')" />
            </el-select>
          </div>
        </div>

        <footer class="fabric-search__actions">
          <button type="button" class="fabric-search__btn fabric-search__btn--ghost" @click="resetSearch">
            {{ t('fabric.resetSearch') }}
          </button>
          <button type="button" class="fabric-search__btn fabric-search__btn--primary" @click="handleSearch">
            {{ t('fabric.search') }}
          </button>
        </footer>
      </div>
    </Transition>
  </section>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { ArrowDown } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { getOptions } from '@/api/fabric';
import {
  filterOptionsByCategory,
  formatI18nOptionName,
  OPTION_CATEGORY,
} from '@/utils/fabric';

const { t } = useI18n();

const props = defineProps({
  initialSearchParams: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['search']);

const expanded = ref(false);

const componentOptions = ref<any[]>([]);
const craftOptions = ref<any[]>([]);
const fabricStyleOptions = ref<any[]>([]);

const searchForm = reactive({
  fabric_type: null as number | null,
  weight_unit: '' as string | null,
  weight_min: null as number | null,
  weight_max: null as number | null,
  component_code: '',
  component_percentage_min: null as number | null,
  component_percentage_max: null as number | null,
  style_codes: [] as string[] | string,
  style_enabled_or: false,
  process_codes: [] as string[] | string,
  process_enabled_or: false,
  reference_code: '',
  fabric_code: '',
});

const formatI18nOption = (option: any): string => {
  return formatI18nOptionName(option.option_code, option.option_name);
};

const hasValue = (val: unknown): boolean => {
  if (val === null || val === undefined || val === '') return false;
  if (Array.isArray(val)) return val.length > 0;
  return true;
};

const advancedFilterCount = computed(() => {
  let count = 0;
  if (hasValue(searchForm.component_code)) count++;
  if (hasValue(searchForm.component_percentage_min)) count++;
  if (hasValue(searchForm.component_percentage_max)) count++;
  if (hasValue(searchForm.weight_min)) count++;
  if (hasValue(searchForm.weight_max)) count++;
  if (hasValue(searchForm.weight_unit)) count++;
  if (hasValue(searchForm.style_codes)) count++;
  if (hasValue(searchForm.process_codes)) count++;
  if (searchForm.fabric_type !== null) count++;
  if (searchForm.style_enabled_or) count++;
  if (searchForm.process_enabled_or) count++;
  return count;
});

const activeFilterCount = computed(() => {
  let count = advancedFilterCount.value;
  if (hasValue(searchForm.reference_code)) count++;
  if (hasValue(searchForm.fabric_code)) count++;
  return count;
});

const toggleExpanded = () => {
  expanded.value = !expanded.value;
};

const buildSearchParams = (): Record<string, unknown> => {
  const searchParams: Record<string, unknown> = {};

  Object.entries(searchForm).forEach(([key, val]) => {
    if (hasValue(val)) {
      searchParams[key] = val;
    }
  });

  if (hasValue(searchForm.style_codes)) {
    searchParams.style_codes = Array.isArray(searchForm.style_codes)
      ? searchForm.style_codes.join(',')
      : searchForm.style_codes;
  }

  if (hasValue(searchForm.process_codes)) {
    searchParams.process_codes = Array.isArray(searchForm.process_codes)
      ? searchForm.process_codes.join(',')
      : searchForm.process_codes;
  }

  return searchParams;
};

const handleSearch = () => {
  emit('search', buildSearchParams());
};

const resetSearch = () => {
  searchForm.fabric_type = null;
  searchForm.weight_min = null;
  searchForm.weight_max = null;
  searchForm.component_code = '';
  searchForm.component_percentage_min = null;
  searchForm.component_percentage_max = null;
  searchForm.style_codes = [];
  searchForm.process_codes = [];
  searchForm.reference_code = '';
  searchForm.fabric_code = '';
  searchForm.weight_unit = '';
  searchForm.style_enabled_or = false;
  searchForm.process_enabled_or = false;
  emit('search', {});
};

const applyInitialParams = (params: Record<string, unknown>) => {
  if ('fabric_type' in params) searchForm.fabric_type = Number(params.fabric_type);
  if ('weight_min' in params) searchForm.weight_min = Number(params.weight_min);
  if ('weight_max' in params) searchForm.weight_max = Number(params.weight_max);
  if ('component_code' in params) searchForm.component_code = String(params.component_code);
  if ('component_percentage_min' in params) {
    searchForm.component_percentage_min = Number(params.component_percentage_min);
  }
  if ('component_percentage_max' in params) {
    searchForm.component_percentage_max = Number(params.component_percentage_max);
  }
  if ('reference_code' in params) searchForm.reference_code = String(params.reference_code);
  if ('fabric_code' in params) searchForm.fabric_code = String(params.fabric_code);
  if ('weight_unit' in params) searchForm.weight_unit = String(params.weight_unit);
  if ('style_enabled_or' in params) searchForm.style_enabled_or = Boolean(params.style_enabled_or);
  if ('process_enabled_or' in params) searchForm.process_enabled_or = Boolean(params.process_enabled_or);

  if ('style_codes' in params) {
    const raw = params.style_codes;
    searchForm.style_codes = Array.isArray(raw)
      ? raw
      : String(raw).split(',').filter(Boolean);
  }
  if ('process_codes' in params) {
    const raw = params.process_codes;
    searchForm.process_codes = Array.isArray(raw)
      ? raw
      : String(raw).split(',').filter(Boolean);
  }
};

const fetchOptions = async () => {
  try {
    const res = await getOptions();
    if (res.code === 200 && res.data) {
      const options = Array.isArray(res.data) ? res.data : [];
      componentOptions.value = filterOptionsByCategory(options, OPTION_CATEGORY.component);
      craftOptions.value = filterOptionsByCategory(options, OPTION_CATEGORY.process);
      fabricStyleOptions.value = filterOptionsByCategory(options, OPTION_CATEGORY.style);
    }
  } catch (error) {
    console.error('获取选项数据失败:', error);
  }
};

onMounted(() => {
  fetchOptions();

  if (props.initialSearchParams && Object.keys(props.initialSearchParams).length > 0) {
    applyInitialParams(props.initialSearchParams as Record<string, unknown>);
  }

  if (advancedFilterCount.value > 0) {
    expanded.value = true;
  }
});
</script>

<style scoped>
.fabric-search {
  margin-bottom: 1.25rem;
  border-radius: 16px;
  overflow: hidden;
}

.fabric-search__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
}

@media (min-width: 768px) {
  .fabric-search__bar {
    padding: 0.85rem 1.25rem;
    flex-wrap: nowrap;
  }
}

.fabric-search__quick {
  display: flex;
  flex: 1;
  gap: 0.65rem;
  min-width: 0;
  width: 100%;
}

@media (min-width: 768px) {
  .fabric-search__quick {
    width: auto;
    max-width: 420px;
  }
}

.fabric-search__quick-input {
  flex: 1;
  min-width: 0;
}

.fabric-search__bar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  width: 100%;
}

@media (min-width: 768px) {
  .fabric-search__bar-actions {
    width: auto;
    margin-left: auto;
    flex-wrap: nowrap;
  }
}

.fabric-search__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border: 1px solid var(--fabric-border);
  border-radius: 999px;
  background: rgba(28, 25, 23, 0.03);
  color: var(--fabric-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.fabric-search__toggle:hover {
  border-color: rgba(154, 123, 79, 0.35);
  color: var(--fabric-ink);
}

.fabric-search--expanded .fabric-search__toggle {
  background: var(--fabric-accent-soft);
  border-color: rgba(154, 123, 79, 0.25);
  color: var(--fabric-accent);
}

.fabric-search__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.15rem;
  height: 1.15rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--fabric-accent);
  color: #fff;
}

.fabric-search__chevron {
  transition: transform 0.25s ease;
}

.fabric-search__chevron.is-open {
  transform: rotate(180deg);
}

.fabric-search__advanced {
  border-top: 1px solid var(--fabric-border);
}

.fabric-search-expand-enter-active,
.fabric-search-expand-leave-active {
  transition: opacity 0.22s ease, max-height 0.28s ease;
  overflow: hidden;
}

.fabric-search-expand-enter-from,
.fabric-search-expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.fabric-search-expand-enter-to,
.fabric-search-expand-leave-from {
  opacity: 1;
  max-height: 800px;
}

.fabric-search__grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1rem 1.25rem;
  padding: 1.15rem 1.25rem 0.5rem;
}

@media (min-width: 640px) {
  .fabric-search__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .fabric-search__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .fabric-search__field--wide {
    grid-column: span 2;
  }
}

.fabric-search__label {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--fabric-muted);
  margin-bottom: 0.45rem;
}

.fabric-search__range {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.fabric-search__range-sep {
  color: var(--fabric-muted);
  font-weight: 500;
  flex-shrink: 0;
}

.fabric-search__range-unit {
  font-size: 0.8125rem;
  color: var(--fabric-muted);
  flex-shrink: 0;
}

.fabric-search__with-or {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.fabric-search__control--grow {
  flex: 1;
  min-width: 0;
}

.fabric-search__or-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  background: rgba(28, 25, 23, 0.03);
  border: 1px solid var(--fabric-border);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--fabric-muted);
  user-select: none;
}

.fabric-search__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.75rem 1.25rem 1.15rem;
}

.fabric-search__btn {
  padding: 0.55rem 1.35rem;
  border-radius: 999px;
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-body);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.fabric-search__btn--sm {
  padding: 0.45rem 1.1rem;
  font-size: 0.8125rem;
}

.fabric-search__btn--ghost {
  background: var(--fabric-surface);
  border-color: var(--fabric-border);
  color: var(--fabric-muted);
}

.fabric-search__btn--ghost:hover {
  border-color: rgba(154, 123, 79, 0.35);
  color: var(--fabric-ink);
}

.fabric-search__btn--primary {
  background: linear-gradient(135deg, #b8956a 0%, #9a7b4f 100%);
  color: #fff;
  box-shadow: 0 4px 14px rgba(154, 123, 79, 0.28);
}

.fabric-search__btn--primary:hover {
  box-shadow: 0 6px 20px rgba(154, 123, 79, 0.38);
  transform: translateY(-1px);
}

.fabric-search :deep(.el-input__wrapper),
.fabric-search :deep(.el-select__wrapper) {
  border-radius: 10px !important;
  background: rgba(255, 252, 248, 0.9) !important;
  box-shadow: none !important;
  border: 1px solid var(--fabric-border) !important;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.fabric-search :deep(.el-input__wrapper:hover),
.fabric-search :deep(.el-select__wrapper:hover) {
  border-color: rgba(154, 123, 79, 0.35) !important;
}

.fabric-search :deep(.el-input__wrapper.is-focus),
.fabric-search :deep(.el-select__wrapper.is-focused) {
  border-color: var(--fabric-accent) !important;
  box-shadow: 0 0 0 3px rgba(154, 123, 79, 0.12) !important;
}

.fabric-search :deep(.el-input__inner) {
  font-size: 0.875rem;
  color: var(--fabric-ink);
}

.fabric-search :deep(.el-input-number) {
  width: 100%;
  flex: 1;
}

.fabric-search :deep(.el-tag) {
  border-radius: 6px;
  background: var(--fabric-accent-soft);
  border-color: rgba(154, 123, 79, 0.2);
  color: var(--fabric-accent);
}

.fabric-search :deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: var(--fabric-accent);
  border-color: var(--fabric-accent);
}
</style>
