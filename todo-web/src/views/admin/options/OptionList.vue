<template>
  <div class="admin-options">
    <AdminPageHeader
      :title="t('fabric.optionManagement')"
      :description="t('admin.optionsHint')"
    />

    <div class="admin-panel fabric-surface p-4">
      <div class="flex justify-between mb-4 flex-wrap gap-3">
        <el-select
          v-model="filterCategory"
          :placeholder="t('fabric.categoryCode')"
          class="w-40"
          clearable
          @change="fetchOptions"
        >
          <el-option
            v-for="item in categoryOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
        <el-button type="primary" round @click="showAddOptionForm">
          <el-icon class="mr-1"><Plus /></el-icon>
          {{ t('fabric.addOption') }}
        </el-button>
      </div>

      <el-table :data="optionList" border v-loading="tableLoading" style="width: 100%">
        <el-table-column prop="category_display" :label="t('fabric.categoryCode')" min-width="120" />
        <el-table-column prop="option_code" :label="t('fabric.optionCode')" min-width="120" />
        <el-table-column prop="option_name" :label="t('fabric.optionName')" min-width="150" />
        <el-table-column prop="option_name_zh" :label="t('fabric.optionNameZh')" min-width="120" />
        <el-table-column prop="sort_order" :label="t('fabric.sortOrder')" min-width="80" />
        <el-table-column :label="t('fabric.operation')" fixed="right" width="160">
          <template #default="scope">
            <div class="flex justify-center space-x-2">
              <el-button type="primary" size="small" round @click="handleEdit(scope.row)">
                {{ t('fabric.edit') }}
              </el-button>
              <el-button type="danger" size="small" round @click="handleDelete(scope.row)">
                {{ t('fabric.delete') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog
      v-model="formDialogVisible"
      :title="isEdit ? t('fabric.editOption') : t('fabric.addOption')"
      width="500px"
    >
      <el-form ref="optionFormRef" :model="optionForm" :rules="formRules" label-width="100px">
        <el-form-item v-if="!isEdit" :label="t('fabric.categoryCode')" prop="category_code">
          <el-select v-model="optionForm.category_code" class="w-full">
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('fabric.optionName')" prop="option_name">
          <el-input v-model="optionForm.option_name" />
        </el-form-item>
        <el-form-item :label="t('fabric.optionNameZh')">
          <el-input v-model="optionForm.option_name_zh" :placeholder="t('fabric.optionNameZh')" />
        </el-form-item>
        <el-form-item :label="t('fabric.sortOrder')" prop="sort_order">
          <el-input-number v-model="optionForm.sort_order" :min="0" :max="999" class="w-full" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">{{ t('fabric.cancel') }}</el-button>
        <el-button type="primary" @click="submitOptionForm">{{ t('fabric.confirm') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import { createOption, deleteOption, getOptions, updateOption } from '@/api/fabric';
import { OPTION_CATEGORY } from '@/utils/fabric';

const { t } = useI18n();

const categoryOptions = ref([
  { value: OPTION_CATEGORY.component, label: t('fabric.components') },
  { value: OPTION_CATEGORY.process, label: t('fabric.processes') },
  { value: OPTION_CATEGORY.style, label: t('fabric.styles') },
]);

const optionList = ref<Record<string, unknown>[]>([]);
const tableLoading = ref(false);
const filterCategory = ref('');
const optionFormRef = ref<FormInstance>();
const formDialogVisible = ref(false);
const isEdit = ref(false);
const currentOptionId = ref('');

const optionForm = reactive({
  category_code: '',
  option_name: '',
  option_name_zh: '',
  sort_order: 0,
});

const formRules = reactive({
  category_code: [{ required: true, message: t('fabric.categoryRequired'), trigger: 'change' }],
  option_name: [{ required: true, message: t('fabric.optionNameRequired'), trigger: 'blur' }],
  sort_order: [{ required: true, message: t('fabric.sortOrderRequired'), trigger: 'blur' }],
});

const fetchOptions = async () => {
  tableLoading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filterCategory.value) params.category_code = filterCategory.value;
    const res = await getOptions(params);
    optionList.value = res?.data ?? [];
  } catch {
    ElMessage.error(t('fabric.loadingFailed'));
  } finally {
    tableLoading.value = false;
  }
};

const showAddOptionForm = () => {
  isEdit.value = false;
  currentOptionId.value = '';
  optionForm.category_code = filterCategory.value || OPTION_CATEGORY.component;
  optionForm.option_name = '';
  optionForm.option_name_zh = '';
  optionForm.sort_order = 0;
  formDialogVisible.value = true;
};

const handleEdit = (row: Record<string, unknown>) => {
  isEdit.value = true;
  currentOptionId.value = row.option_id as string;
  optionForm.category_code = row.category_code as string;
  optionForm.option_name = row.option_name as string;
  optionForm.option_name_zh = (row.option_name_zh as string) || '';
  optionForm.sort_order = row.sort_order as number;
  formDialogVisible.value = true;
};

const handleDelete = (row: Record<string, unknown>) => {
  ElMessageBox.confirm(
    t('fabric.deleteOptionConfirm', [row.option_name]),
    t('fabric.confirmTitle'),
    { type: 'warning' },
  )
    .then(async () => {
      const res = await deleteOption(row.option_id as string);
      if (res.code === 200) {
        ElMessage.success(t('fabric.deleteOptionSuccess'));
        fetchOptions();
      } else {
        ElMessage.error(res.message || t('fabric.deleteOptionFailed'));
      }
    })
    .catch(() => undefined);
};

const submitOptionForm = async () => {
  if (!optionFormRef.value) return;
  const valid = await optionFormRef.value.validate().catch(() => false);
  if (!valid) return;

  try {
    if (isEdit.value) {
      const res = await updateOption(currentOptionId.value, {
        option_name: optionForm.option_name,
        option_name_zh: optionForm.option_name_zh,
        sort_order: optionForm.sort_order,
      });
      if (res.code === 200) {
        ElMessage.success(t('fabric.updateOptionSuccess'));
        formDialogVisible.value = false;
        fetchOptions();
      }
    } else {
      const res = await createOption(optionForm);
      if (res.code === 200) {
        ElMessage.success(t('fabric.createOptionSuccess'));
        formDialogVisible.value = false;
        fetchOptions();
      }
    }
  } catch {
    ElMessage.error(isEdit.value ? t('fabric.updateOptionFailed') : t('fabric.createOptionFailed'));
  }
};

onMounted(fetchOptions);
</script>

<style scoped>
.admin-panel {
  border-radius: 16px;
}
</style>
