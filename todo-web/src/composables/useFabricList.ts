import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { parseFabricListResponse } from '@/utils/fabric';

export type FabricListFetcher = (params: Record<string, unknown>) => Promise<unknown>;

export function useFabricList(fetchList: FabricListFetcher) {
  const currentPage = ref(1);
  const pageSize = ref(10);
  const total = ref(0);
  const allCount = ref(0);
  const loading = ref(false);
  const fabricList = ref<Record<string, unknown>[]>([]);
  const selectedFabrics = ref<Record<string, unknown>[]>([]);
  const searchParams = reactive<Record<string, unknown>>({});

  const fetchFabricList = async () => {
    loading.value = true;
    try {
      const params = {
        page: currentPage.value,
        page_size: pageSize.value,
        ...searchParams,
      };
      const res = await fetchList(params);
      const { items, total: listTotal } = parseFabricListResponse(
        res as Parameters<typeof parseFabricListResponse>[0],
      );
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

  const handleSearch = (params: Record<string, unknown>) => {
    Object.keys(searchParams).forEach((key) => {
      delete searchParams[key];
    });
    Object.assign(searchParams, params);
    currentPage.value = 1;
    fetchFabricList();
  };

  const handleSizeChange = (val: number) => {
    pageSize.value = val;
    fetchFabricList();
  };

  const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    fetchFabricList();
  };

  const handleSelectionChange = (selection: Record<string, unknown>[]) => {
    selectedFabrics.value = selection;
  };

  return {
    currentPage,
    pageSize,
    total,
    allCount,
    loading,
    fabricList,
    selectedFabrics,
    searchParams,
    fetchFabricList,
    handleSearch,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange,
  };
}
