import { computed, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { parseFabricListResponse } from '@/utils/fabric';

export type FabricListFetcher = (params: Record<string, unknown>) => Promise<unknown>;

export function useFabricList(fetchList: FabricListFetcher, defaultPageSize = 20) {
  const currentPage = ref(1);
  const pageSize = ref(defaultPageSize);
  const total = ref(0);
  const allCount = ref(0);
  const loading = ref(false);
  const loadingMore = ref(false);
  const fabricList = ref<Record<string, unknown>[]>([]);
  const selectedFabrics = ref<Record<string, unknown>[]>([]);
  const searchParams = reactive<Record<string, unknown>>({});

  const hasMore = computed(() => fabricList.value.length < total.value);

  const fetchFabricList = async (append = false) => {
    if (append) {
      if (loadingMore.value || !hasMore.value) return;
      loadingMore.value = true;
    } else {
      loading.value = true;
    }
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
      if (append) {
        fabricList.value = [...fabricList.value, ...items];
      } else {
        fabricList.value = items;
      }
      total.value = listTotal;
      if (allCount.value < total.value) {
        allCount.value = total.value;
      }
    } catch (error) {
      console.error('获取面料列表失败:', error);
      ElMessage.error('获取面料列表失败');
    } finally {
      loading.value = false;
      loadingMore.value = false;
    }
  };

  const loadMoreFabrics = async () => {
    if (!hasMore.value || loadingMore.value || loading.value) return;
    currentPage.value += 1;
    await fetchFabricList(true);
  };

  const handleSearch = (params: Record<string, unknown>) => {
    Object.keys(searchParams).forEach((key) => {
      delete searchParams[key];
    });
    Object.assign(searchParams, params);
    currentPage.value = 1;
    fetchFabricList(false);
  };

  const handleSizeChange = (val: number) => {
    pageSize.value = val;
    currentPage.value = 1;
    fetchFabricList(false);
  };

  const handleCurrentChange = (val: number) => {
    currentPage.value = val;
    fetchFabricList(false);
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
    loadingMore,
    hasMore,
    fabricList,
    selectedFabrics,
    searchParams,
    fetchFabricList,
    loadMoreFabrics,
    handleSearch,
    handleSizeChange,
    handleCurrentChange,
    handleSelectionChange,
  };
}
