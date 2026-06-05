<template>
  <el-dialog
    v-model="dialogVisible"
    :title="$t('fabric.optionManagement')"
    width="900px"
    append-to-body
    :before-close="handleClose"
    class="option-dialog"
  >
    <div class="p-4">
      <!-- 顶部操作区 -->
      <div class="flex justify-between mb-4">
        <div class="flex space-x-4 items-center">
          <el-select
            v-model="filterCategory"
            :placeholder="$t('fabric.categoryCode')"
            class="!rounded-button w-40"
            @change="fetchOptions"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
        <el-button 
          type="primary" 
          class="!rounded-button whitespace-nowrap cursor-pointer"
          @click="showAddOptionForm"
        >
          <el-icon class="mr-1"><Plus /></el-icon>
          {{ $t('fabric.addOption') }}
        </el-button>
      </div>

      <!-- 选项表格 -->
      <el-table
        :data="optionList"
        border
        style="width: 100%"
        v-loading="tableLoading"
      >
        <el-table-column
          prop="category_display"
          :label="$t('fabric.categoryCode')"
          min-width="120"
        />
        <el-table-column
          prop="option_code"
          :label="$t('fabric.optionCode')"
          min-width="120"
        />
        <el-table-column
          prop="option_name"
          :label="$t('fabric.optionName')"
          min-width="150"
        />
        <el-table-column
          prop="sort_order"
          :label="$t('fabric.sortOrder')"
          min-width="80"
        />
        <el-table-column
          :label="$t('fabric.operation')"
          fixed="right"
          width="160"
        >
          <template #default="scope">
            <div class="flex justify-center space-x-2">
              <el-button
                type="primary"
                size="small"
                @click="handleEdit(scope.row)"
                class="!rounded-button whitespace-nowrap cursor-pointer"
              >
                {{ $t('fabric.edit') }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handleDelete(scope.row)"
                class="!rounded-button whitespace-nowrap cursor-pointer"
              >
                {{ $t('fabric.delete') }}
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加/编辑选项表单 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="isEdit ? $t('fabric.editOption') : $t('fabric.addOption')"
      width="500px"
      append-to-body
    >
      <el-form
        ref="optionFormRef"
        :model="optionForm"
        :rules="formRules"
        label-width="100px"
        class="p-4"
      >
        <el-form-item 
          :label="$t('fabric.categoryCode')" 
          prop="category_code"
          v-if="!isEdit"
        >
          <el-select
            v-model="optionForm.category_code"
            :placeholder="$t('fabric.categoryRequired')"
            class="!rounded-button w-full"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item 
          :label="$t('fabric.optionName')" 
          prop="option_name"
        >
          <el-input
            v-model="optionForm.option_name"
            :placeholder="$t('fabric.optionNameRequired')"
            class="!rounded-button w-full"
          />
        </el-form-item>
        <el-form-item 
          :label="$t('fabric.sortOrder')" 
          prop="sort_order"
        >
          <el-input-number
            v-model="optionForm.sort_order"
            :min="0"
            :max="999"
            class="!rounded-button w-full"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="flex justify-end space-x-2">
          <el-button @click="formDialogVisible = false">
            {{ $t('fabric.cancel') }}
          </el-button>
          <el-button type="primary" @click="submitOptionForm">
            {{ $t('fabric.confirm') }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus';
import { useI18n } from 'vue-i18n';
import { Plus } from '@element-plus/icons-vue';
import { getOptions, createOption, updateOption, deleteOption } from '@/api/fabric';
import { OPTION_CATEGORY } from '@/utils/fabric';

const { t } = useI18n();

// 定义组件props和事件
const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
}>();

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
});

// 分类选项
const categoryOptions = ref([
  { value: OPTION_CATEGORY.component, label: t('fabric.components') },
  { value: OPTION_CATEGORY.process, label: t('fabric.processes') },
  { value: OPTION_CATEGORY.style, label: t('fabric.styles') }
]);

// 表格数据相关
const optionList = ref<any[]>([]);
const tableLoading = ref(false);
const filterCategory = ref('');

// 表单相关
const optionFormRef = ref<FormInstance>();
const formDialogVisible = ref(false);
const isEdit = ref(false);
const currentOptionId = ref('');
const optionForm = reactive({
  category_code: '',
  option_name: '',
  sort_order: 0
});

// 表单验证规则
const formRules = reactive({
  category_code: [
    { required: true, message: t('fabric.categoryRequired'), trigger: 'change' }
  ],
  option_name: [
    { required: true, message: t('fabric.optionNameRequired'), trigger: 'blur' }
  ],
  sort_order: [
    { required: true, message: t('fabric.sortOrderRequired'), trigger: 'blur' }
  ]
});

// 获取选项列表
const fetchOptions = async () => {
  try {
    tableLoading.value = true;
    const params: any = {};
    if (filterCategory.value) {
      params.category_code = filterCategory.value;
    }
    const res = await getOptions(params);
    if (res?.data) {
      optionList.value = res.data;
    }
  } catch (error) {
    console.error('获取选项列表失败:', error);
    ElMessage.error(t('fabric.loadingFailed'));
  } finally {
    tableLoading.value = false;
  }
};

// 处理对话框关闭
const handleClose = () => {
  dialogVisible.value = false;
};

// 显示添加选项表单
const showAddOptionForm = () => {
  isEdit.value = false;
  currentOptionId.value = '';
  
  optionForm.category_code = filterCategory.value || OPTION_CATEGORY.component;
  optionForm.option_name = '';
  optionForm.sort_order = 0;
  
  formDialogVisible.value = true;
  
  nextTick(() => {
    optionFormRef.value?.resetFields();
  });
};

// 处理编辑选项
const handleEdit = (row: any) => {
  isEdit.value = true;
  currentOptionId.value = row.option_id;
  
  optionForm.category_code = row.category_code;
  optionForm.option_name = row.option_name;
  optionForm.sort_order = row.sort_order;
  
  formDialogVisible.value = true;
};

// 处理删除选项
const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    t('fabric.deleteOptionConfirm', [row.option_name]),
    t('fabric.confirmTitle'),
    {
      confirmButtonText: t('fabric.confirm'),
      cancelButtonText: t('fabric.cancel'),
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const res = await deleteOption(row.option_id);
        if (res.code === 200) {
          ElMessage.success(t('fabric.deleteOptionSuccess'));
          fetchOptions();
        } else {
          ElMessage.error(res.message || t('fabric.deleteOptionFailed'));
        }
      } catch (error: any) {
        if (error.message && error.message.includes('已被使用')) {
          ElMessage.error(t('fabric.deleteOptionUsed'));
        } else {
          ElMessage.error(t('fabric.deleteOptionFailed'));
        }
      }
    })
    .catch(() => {
      ElMessage.info(t('fabric.deleteCancel'));
    });
};

// 提交选项表单
const submitOptionForm = async () => {
  if (!optionFormRef.value) return;
  
  await optionFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value) {
          // 更新选项
          const data = {
            option_name: optionForm.option_name,
            sort_order: optionForm.sort_order
          };
          const res = await updateOption(currentOptionId.value, data);
          if (res.code === 200) {
            ElMessage.success(t('fabric.updateOptionSuccess'));
            formDialogVisible.value = false;
            fetchOptions();
          } else {
            ElMessage.error(res.message || t('fabric.updateOptionFailed'));
          }
        } else {
          // 创建选项
          const res = await createOption(optionForm);
          if (res.code === 200) {
            ElMessage.success(t('fabric.createOptionSuccess'));
            formDialogVisible.value = false;
            fetchOptions();
          } else {
            ElMessage.error(res.message || t('fabric.createOptionFailed'));
          }
        }
      } catch (error) {
        console.error('提交选项表单失败:', error);
        ElMessage.error(isEdit.value ? t('fabric.updateOptionFailed') : t('fabric.createOptionFailed'));
      }
    }
  });
};

// 监听对话框打开，加载数据
watch(
  () => dialogVisible.value,
  (newVal) => {
    if (newVal) {
      fetchOptions();
    }
  }
);
</script>

<style scoped>
/* 确保表单元素的正确样式 */
:deep(.el-input-number .el-input__inner) {
  text-align: left;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 9999px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

/* 表格样式 */
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
  padding: 8px 0;
}
</style> 