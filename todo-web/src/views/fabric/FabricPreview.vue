<template>
  <div class="min-h-screen bg-white py-8 px-4">
    <div class="max-w-8xl mx-auto">
      <!-- 搜索组件 -->
      <FabricSearchForm
        :initial-search-params="searchParams"
        @search="handleSearch"
      />
      
      <!-- 顶部操作区 -->
      <div class="flex justify-between items-center mb-4">
        <div class="text-xl pl-2">
          {{ t('fabric.fabricCount') }}: {{ allCount }} PCS
        </div>
        <el-button
          class="!rounded-button whitespace-nowrap cursor-pointer"
          @click="handleShowPrintPreview"
          :disabled="selectedFabrics.length === 0"
        >
          <el-icon class="mr-1"><Printer /></el-icon>
          {{ t('fabric.printPreview') }}
        </el-button>
      </div>
      
      <!-- 表格区域 -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <FabricTable 
          :fabrics="fabricList"
          @selection-change="handleSelectionChange"
        />
        
        <!-- 分页 -->
        <div class="flex justify-end p-4 bg-white border-t">
          <el-pagination
            :current-page="currentPage"
            :page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            @update:current-page="currentPage = $event"
            @update:page-size="pageSize = $event"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive } from "vue";
import { ElMessage } from "element-plus";
import FabricTable from "@/components/FabricTable.vue";
import FabricSearchForm from "@/components/FabricSearchForm.vue";
import { getPublicFabricList, recordVisit } from "@/api/fabric";
import { parseFabricListResponse } from "@/utils/fabric";
import { Printer } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import { usePrintStore } from '@/stores/print';

const { t } = useI18n();
const printStore = usePrintStore();

// 分页数据
const currentPage = ref(1);
const pageSize = ref(10);
const total = ref(0);
const allCount = ref(0);

// 选中的面料数据
const selectedFabrics = ref<any[]>([]);

// 加载面料列表数据
const loading = ref(false);
const fabricList = ref<any[]>([]);

// 搜索参数
const searchParams = reactive<Record<string, any>>({});

const fetchFabricList = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      page_size: pageSize.value,
      ...searchParams // 添加搜索参数
    };
    
    const res = await getPublicFabricList(params);
    const { items, total: listTotal } = parseFabricListResponse(res);
    fabricList.value = items;
    total.value = listTotal;
    if (allCount.value < total.value) {
      allCount.value = total.value;
    }
  } catch (error) {
    console.error('获取面料列表失败:', error);
    ElMessage.error('获取面料列表失败');
  } finally {
    loading.value = false;
  }
};

// 处理搜索回调
const handleSearch = (params: Record<string, any>) => {
  // 更新搜索参数
  Object.keys(searchParams).forEach(key => {
    delete searchParams[key];
  });
  
  // 复制新的搜索参数
  Object.keys(params).forEach(key => {
    searchParams[key] = params[key];
  });
  
  // 重置页码并加载数据
  currentPage.value = 1;
  fetchFabricList();
};

// 处理分页大小变化
const handleSizeChange = (val: number) => {
  pageSize.value = val;
  fetchFabricList();
};

// 处理页码变化
const handleCurrentChange = (val: number) => {
  currentPage.value = val;
  fetchFabricList();
};

// 处理表格选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedFabrics.value = selection;
};

// 显示打印预览对话框
const handleShowPrintPreview = () => {
  if (selectedFabrics.value.length === 0) {
    ElMessage.warning(t('fabric.selectItemsForPrint'));
    return;
  }
  printStore.openPrintPreview(selectedFabrics.value, true);
};

// 组件挂载时执行
onMounted(() => {
  fetchFabricList();
  
  // 记录访客信息
  recordVisit().catch(error => {
    console.error('访客记录失败:', error);
    // 访客记录失败不影响正常功能，因此不显示错误提示
  });
});
</script>

<style scoped>
/* 自定义表格样式 */
:deep(.el-pagination) {
  --el-pagination-button-bg-color: #fff;
}
</style> 