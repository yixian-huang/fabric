import api from './api';
import { CellStyle } from '@/components/GridCreator/GridTypes';

interface UpdateCellRequest {
  project: string;
  row: string;
  column: string;
  content: string;
  type?: string;
  style_data?: CellStyle;
}

type QueuedUpdate = {
  params: UpdateCellRequest;
  resolvers: Array<(value: unknown) => void>;
  rejecters: Array<(reason?: unknown) => void>;
};

type CellQueueState = {
  inFlight: boolean;
  pending: QueuedUpdate | null;
};

const cellUpdateQueues = new Map<string, CellQueueState>();

const getCellQueueKey = (params: UpdateCellRequest) =>
  `${params.project}:${params.row}:${params.column}`;

/**
 * 更新单元格内容与样式
 * @param params 包含行ID、列ID、内容、类型和样式数据的对象
 * @returns API 响应
 */
export const updateCell = async (params: UpdateCellRequest) => {
  try {
    const response = await api.patch('/grid/cells/update', params);
    return response.data;
  } catch (error) {
    console.error('更新单元格失败:', error);
    throw error;
  }
};

const drainCellQueue = async (queueKey: string): Promise<void> => {
  const state = cellUpdateQueues.get(queueKey);
  if (!state || state.inFlight || !state.pending) return;

  const currentUpdate = state.pending;
  state.pending = null;
  state.inFlight = true;

  try {
    const result = await updateCell(currentUpdate.params);
    currentUpdate.resolvers.forEach(resolve => resolve(result));
  } catch (error) {
    currentUpdate.rejecters.forEach(reject => reject(error));
  } finally {
    state.inFlight = false;
    if (state.pending) {
      void drainCellQueue(queueKey);
    } else {
      cellUpdateQueues.delete(queueKey);
    }
  }
};

/**
 * 按单元格维度合并更新请求：同一单元格永远只保留最新待发送请求。
 * 可避免弱网/并发情况下旧请求在新请求之后落库。
 */
export const updateCellLatest = (params: UpdateCellRequest): Promise<unknown> => {
  const queueKey = getCellQueueKey(params);
  const state = cellUpdateQueues.get(queueKey) ?? { inFlight: false, pending: null };

  return new Promise((resolve, reject) => {
    if (state.pending) {
      state.pending = {
        params,
        resolvers: [...state.pending.resolvers, resolve],
        rejecters: [...state.pending.rejecters, reject],
      };
    } else {
      state.pending = {
        params,
        resolvers: [resolve],
        rejecters: [reject],
      };
    }

    cellUpdateQueues.set(queueKey, state);
    void drainCellQueue(queueKey);
  });
};

/**
 * 批量更新单元格
 * @param cells 要更新的单元格数组
 * @returns API 响应
 */
export const batchUpdateCells = async (cells: UpdateCellRequest[]) => {
  try {
    const results = await Promise.all(cells.map((cell) => updateCell(cell)));
    return results;
  } catch (error) {
    console.error('批量更新单元格失败:', error);
    throw error;
  }
}; 

/**
 * 更新供应商备注
 * @param sharedKey 共享密钥
 * @param password 共享密码
 * @param row 行ID
 * @param column 列ID
 */
export const updateVendorRemark = async (
  sharedKey: string,
  password: string,
  row: string,
  column: string,
  vendorId: string,
  content: string
): Promise<void> => {
  try {
    await api.post('/grid/vendor-share/update_vendor_remark', {
      shared_key: sharedKey,
      password: password,
      row: row,
      column: column,
      vendorId: vendorId,
      content: content
    });
  } catch (error) {
    console.error('更新供应商备注失败:', error);
    throw error;
  }
};