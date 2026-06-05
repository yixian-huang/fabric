<template>
  <div class="admin-fabric-list">
    <AdminPageHeader
      :title="t('fabric.management')"
      :description="`${t('admin.totalItems')}: ${total}`"
    >
      <template #actions>
        <el-button type="primary" round @click="router.push('/admin/fabrics/new')">
          <el-icon class="mr-1"><Plus /></el-icon>{{ t('fabric.add') }}
        </el-button>
        <el-button round @click="handlePrintPreview">
          <el-icon class="mr-1"><Printer /></el-icon>{{ t('fabric.printPreview') }}
        </el-button>
        <el-button round @click="router.push('/admin/options')">
          <el-icon class="mr-1"><Setting /></el-icon>{{ t('fabric.optionManagement') }}
        </el-button>
      </template>
    </AdminPageHeader>

    <FabricSearchForm :initial-search-params="searchParams" @search="handleSearch" />

    <div v-loading="loading" class="admin-panel fabric-surface overflow-hidden">
      <FabricTable :fabrics="fabricList" @selection-change="handleSelectionChange">
        <template #actions="{ row }">
          <div class="flex justify-center space-x-2">
            <el-button type="primary" size="small" round @click="editFabric(row)">
              {{ t('fabric.edit') }}
            </el-button>
            <el-button type="danger" size="small" round @click="handleDeleteFabric(row)">
              {{ t('fabric.delete') }}
            </el-button>
          </div>
        </template>
      </FabricTable>
      <div class="flex justify-end p-4 border-t" style="border-color: var(--fabric-border)">
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

    <PrintPreviewDialog
      :visible="printDialogVisible"
      :print="false"
      @update:visible="printDialogVisible = $event"
      :fabrics="selectedFabrics"
    />
  </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Printer, Setting } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import FabricTable from '@/components/FabricTable.vue';
import FabricSearchForm from '@/components/FabricSearchForm.vue';
import PrintPreviewDialog from '@/components/PrintPreviewDialog.vue';
import { deleteFabric, getFabricList } from '@/api/fabric';
import { parseFabricListResponse } from '@/utils/fabric';
import { useFabricList } from '@/composables/useFabricList';

const router = useRouter();
const { t } = useI18n();

const printDialogVisible = ref(false);

const {
  currentPage,
  pageSize,
  total,
  loading,
  fabricList,
  selectedFabrics,
  searchParams,
  fetchFabricList,
  handleSearch,
  handleSizeChange,
  handleCurrentChange,
  handleSelectionChange,
} = useFabricList((params) => getFabricList(params));

const editFabric = (row: Record<string, unknown>) => {
  router.push(`/admin/fabrics/${row.fabric_id}/edit`);
};

const handleDeleteFabric = async (row: Record<string, unknown>) => {
  ElMessageBox.confirm(t('fabric.deleteConfirm', [row.code]), t('fabric.confirmTitle'), {
    confirmButtonText: t('fabric.confirm'),
    cancelButtonText: t('fabric.cancel'),
    type: 'warning',
  })
    .then(async () => {
      const res = await deleteFabric(row.fabric_id as string);
      if (res.code === 200) {
        ElMessage.success(t('fabric.deleteSuccess', [row.code]));
        fetchFabricList();
      } else {
        ElMessage.error(res.message || t('fabric.deleteFailed'));
      }
    })
    .catch(() => undefined);
};

const handlePrintPreview = () => {
  if (selectedFabrics.value.length === 0) {
    ElMessage.warning(t('fabric.selectItemsForPrint'));
    return;
  }
  printDialogVisible.value = true;
};

onMounted(fetchFabricList);
</script>

<style scoped>
.admin-panel {
  border-radius: 16px;
}
</style>
