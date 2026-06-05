<!-- The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work. -->
<template>
  <div class="min-h-screen bg-white py-8 px-4">
    <div class="max-w-8xl mx-auto">
      <!-- 顶部操作区 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-800">{{ $t('fabric.management') }}
            <span class="text-xl text-gray-500">
              :{{ total }}
            </span>
          </h1>
          <div class="flex items-center mt-1 text-sm text-gray-500">
            <span class="flex items-center mr-4">
              <el-icon class="mr-1"><User /></el-icon>
              {{ $t('fabric.todayVisitors') }}: {{ visitorStats.unique_visitors_today || 0 }}
            </span>
            <span class="flex items-center">
              <el-icon class="mr-1"><View /></el-icon>
              {{ $t('fabric.totalVisitors') }}: {{ visitorStats.total_unique_visitors || 0 }}
            </span>
          </div>
        </div>
        <div class="flex space-x-3">
          <el-button
            type="primary"
            class="!rounded-button whitespace-nowrap cursor-pointer"
            @click="navigateToAddFabric"
          >
            <el-icon class="mr-1"><Plus /></el-icon>{{ $t('fabric.add') }}
          </el-button>
          <el-button
            class="!rounded-button whitespace-nowrap cursor-pointer"
            @click="handlePrintPreview"
          >
            <el-icon><Printer /></el-icon>
            {{ $t('fabric.printPreview') }}
          </el-button>
          <el-button
            class="!rounded-button whitespace-nowrap cursor-pointer"
            @click="showOptionDialog"
          >
            <el-icon><Setting /></el-icon>
            {{ $t('fabric.optionManagement') }}
          </el-button>
        </div>
      </div>

      <!-- 搜索组件 -->
      <FabricSearchForm
        :initial-search-params="searchParams"
        @search="handleSearch"
      />

      <!-- 表格主体 -->
      <div class="bg-white rounded-lg shadow overflow-hidden">
        <FabricTable 
          :fabrics="fabricList"
          @selection-change="handleSelectionChange"
        >
          <template #actions="{ row }">
            <div class="flex justify-center space-x-2">
              <el-button
                type="primary"
                size="small"
                class="!rounded-button whitespace-nowrap cursor-pointer"
                @click="editFabric(row)"
              >
                {{ $t('fabric.edit') }}
              </el-button>
              <el-button
                type="danger"
                size="small"
                class="!rounded-button whitespace-nowrap cursor-pointer"
                @click="handleDeleteFabric(row)"
              >
                {{ $t('fabric.delete') }}
              </el-button>
            </div>
          </template>
        </FabricTable>
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
    <!-- 打印预览弹窗 -->
    <PrintPreviewDialog
      :visible="printDialogVisible"
      @update:visible="printDialogVisible = $event"
      :fabrics="selectedFabrics"
    />
    
    <!-- 选项管理对话框 -->
    <OptionDialog
      :visible="optionDialogVisible"
      @update:visible="optionDialogVisible = $event"
    />
  </div>
</template>
<script lang="ts" setup>
  import { ref, onMounted, reactive } from "vue";
  import { ElMessage, ElMessageBox } from "element-plus";
  import { useRouter } from "vue-router";
  import { useI18n } from 'vue-i18n';
  
  const router = useRouter();
  const { t } = useI18n();
  // 只导入实际使用的图标
  import { Plus, Printer, User, View, Setting } from "@element-plus/icons-vue";
  import FabricTable from "@/components/FabricTable.vue";
  import PrintPreviewDialog from "@/components/PrintPreviewDialog.vue";
  import FabricSearchForm from "@/components/FabricSearchForm.vue";
  import OptionDialog from "@/components/OptionDialog.vue";
  // 导入 API 函数
  import { getFabricList, deleteFabric, getVisitorStats } from "@/api/fabric";
  import { parseFabricListResponse } from "@/utils/fabric";

  // 分页数据
  const currentPage = ref(1);
  const pageSize = ref(10);
  const total = ref(0);
  // 打印预览
  const printDialogVisible = ref(false);
  // 选中的面料数据
  const selectedFabrics = ref<any[]>([]);
  // 加载面料列表数据
  const loading = ref(false);
  const fabricList = ref<any[]>([]);
  // 搜索参数
  const searchParams = reactive<Record<string, any>>({});
  // 选项管理对话框
  const optionDialogVisible = ref(false);
  // 访客统计数据
  const visitorStats = ref<{
    today_visitors: number;
    total_visitors: number;
    unique_visitors_today: number;
    total_unique_visitors: number;
  }>({
    today_visitors: 0,
    total_visitors: 0,
    unique_visitors_today: 0,
    total_unique_visitors: 0
  });

  const fetchFabricList = async () => {
    loading.value = true;
    try {
      // 构建请求参数
      const params = {
        page: currentPage.value,
        page_size: pageSize.value,
        ...searchParams // 添加搜索参数
      };
      
      const res = await getFabricList(params);
      const { items, total: listTotal } = parseFabricListResponse(res);
      fabricList.value = items;
      total.value = listTotal;
    } catch (error) {
      console.error('获取面料列表失败:', error);
      ElMessage.error(t('fabric.deleteFailed'));
    } finally {
      loading.value = false;
    }
  };

  // 处理搜索回调
  const handleSearch = (params: Record<string, any>) => {
    console.log(params);

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

  // 编辑面料
  const editFabric = (row: any) => {
    ElMessage.info(`${t('fabric.edit')}：${row.code}`);
    router.push(`/fabric/edit/${row.fabric_id}`);
  };
  // 删除面料
  const handleDeleteFabric = async (row: any) => {
    ElMessageBox.confirm(t('fabric.deleteConfirm', [row.code]), t('fabric.confirmTitle'), {
      confirmButtonText: t('fabric.confirm'),
      cancelButtonText: t('fabric.cancel'),
      type: "warning",
    })
      .then(async () => {
        try {
          const res = await deleteFabric(row.fabric_id);
          if (res.code === 200) {
            ElMessage.success(t('fabric.deleteSuccess', [row.code]));
            fetchFabricList(); // 重新加载列表
          } else {
            ElMessage.error(res.message || t('fabric.deleteFailed'));
          }
        } catch (error) {
          console.error('删除面料失败:', error);
          ElMessage.error(t('fabric.deleteFailed'));
        }
      })
      .catch(() => {
        ElMessage({
          type: "info",
          message: t('fabric.deleteCancel'),
        });
      });
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
  // 导航到添加面料页面
  const navigateToAddFabric = () => {
    router.push("/fabric/add");
  };
  // 显示打印预览
  const handlePrintPreview = () => {
    if (selectedFabrics.value.length === 0) {
      ElMessage.warning(t('fabric.selectItemsForPrint'));
      return;
    }
    printDialogVisible.value = true;
  };
  // 显示选项管理对话框
  const showOptionDialog = () => {
    optionDialogVisible.value = true;
  };
  // 获取访客统计数据
  const fetchVisitorStats = async () => {
    try {
      const res = await getVisitorStats();
      if (res?.data) {
        visitorStats.value = res.data;
      }
    } catch (error) {
      console.error('获取访客统计失败:', error);
      // 访客统计失败不阻止其他功能
    }
  };
  // 组件挂载时执行
  onMounted(() => {
    fetchFabricList();
    fetchVisitorStats();
  });
</script>
<style scoped>
/* 移除input number的箭头 */
:deep(.el-input-number .el-input-number__decrease),
:deep(.el-input-number .el-input-number__increase) {
  display: none;
}
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
:deep(.el-button) {
  font-weight: 500;
}
:deep(.el-dialog__header) {
  margin-right: 0;
  text-align: center;
  font-weight: bold;
}
/* 打印预览对话框样式 */
:deep(.print-preview-dialog .el-dialog__body) {
  padding: 0;
}
:deep(.print-preview-dialog .el-dialog) {
  max-width: 1000px;
}
.a4-page {
  width: 210mm;
  min-height: 297mm;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
}
.page-break-after-always {
  page-break-after: always;
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
@media print {
  .no-print {
    display: none;
  }
  body {
    background: none;
  }
  .a4-page {
    box-shadow: none;
    width: 100%;
  }
}
</style>
