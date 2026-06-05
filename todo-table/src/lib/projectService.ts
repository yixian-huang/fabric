import api from './api';
import { GridColumn } from '@/components/GridCreator/GridTypes';
export interface Project {
  project_id: string;
  name: string;
  creator: string;
  created_at: string;
  description?: string;
  status?: string;
  cover_image?: string;
}

export interface RowCell {
  cell_id: string;
  content: string;
  row: string;
  column: string;
  columnDefinition: GridColumn;
  type: string;
  style: string; // JSON字符串
}

interface ProjectRow {
  row_id: string;
  row_index: number;
  cells: Array<RowCell>;
}

// 项目详情接口
export interface ProjectDetail extends Project {
  project_id: string;
  columns: Array<{
    column_id: string;
    title: string;
    column_index: number;
    width?: number;
    type?: string;
    style?: string;
    rule?: string;
    style_data?: Object;
    rule_data?: Object;
  }>;
  rows: Array<ProjectRow>;
  base_url: string;
}

export interface ImageResponse {
    file_id: string;
    url: string;
    file_name: string;
}

// 获取项目列表
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await api.get('/grid/projects/');
    // 后端返回的数据结构是 { code: 200, message: "成功", data: [...] }
    return response.data || [];
  } catch (error) {
    console.error('获取项目列表失败:', error);
    throw error;
  }
};

/**
 * 获取项目详情
 * @param projectId 项目ID
 * @returns 项目详情，包括基本信息、列配置和行数据
 */
export const getProjectDetail = async (projectId: string): Promise<ProjectDetail> => {
  try {
    const response = await api.get(`/grid/projects/${projectId}/`);
    // 后端返回的数据结构是 { code: 200, message: "成功", data: {...} }
    return response.data;
  } catch (error) {
    console.error(`获取项目详情失败 (ID: ${projectId}):`, error);
    throw error;
  }
};

/**
 * 获取项目详情
 * @param projectId 项目ID
 * @returns 项目详情，包括基本信息、列配置和行数据
 */
export const getProjectTodoDetail = async (): Promise<ProjectDetail> => {
  try {
    const response = await api.get(`/grid/projects/todo/`);
    // 后端返回的数据结构是 { code: 200, message: "成功", data: {...} }
    return response.data;
  } catch (error) {
    console.error(`获取待办事项项目详情失败:`, error);
    throw error;
  }
};

// 创建新项目
export const createProject = async (name: string, description: string = ''): Promise<Project> => {
  try {
    const response = await api.post('/grid/projects/', {
      name,
      description
    });
    // 后端返回的数据结构是 { code: 200, message: "成功", data: {...} }
    return response.data;
  } catch (error) {
    console.error('创建项目失败:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    await api.delete(`/grid/projects/${projectId}/`);
  } catch (error) {
    console.error(`删除项目失败 (ID: ${projectId}):`, error);
    throw error;
  }
};

export const updateColumn = async (columnId: string, column: GridColumn): Promise<void> => {
  try {
    // 将 style 和 rule 对象转换为 JSON 字符串
    const columnData = {
      ...column,
      style: column.style ? JSON.stringify(column.style) : null,
      rule: column.rule ? JSON.stringify(column.rule) : null
    };
    
    await api.patch(`/grid/columns/${columnId}/`, columnData);
  } catch (error) {
    console.error(`更新列失败 (ID: ${columnId}):`, error);
    throw error;
  }
};

export interface CreatedColumn {
  column_id: string;
  title: string;
  width: number;
  type: string;
  column_index: number;
  style_data?: Record<string, unknown>;
  rule_data?: Record<string, unknown>;
}

export const createProjectColumn = async (
  projectId: string,
  opts?: { title?: string; width?: number; type?: string }
): Promise<CreatedColumn> => {
  try {
    const response = await api.post('/grid/columns/', {
      project_id: projectId,
      title: opts?.title ?? '新列',
      width: opts?.width ?? 100,
      type: opts?.type ?? 'text',
    });
    return response.data;
  } catch (error) {
    console.error(`创建列失败 (项目: ${projectId}):`, error);
    throw error;
  }
};

export const deleteProjectColumn = async (columnId: string): Promise<void> => {
  try {
    await api.delete(`/grid/columns/${columnId}/`);
  } catch (error) {
    console.error(`删除列失败 (ID: ${columnId}):`, error);
    throw error;
  }
};

export const updateColumnTitle = async (columnId: string, title: string): Promise<void> => {
  try {
    await api.patch(`/grid/columns/${columnId}/`, { title });
  } catch (error) {
    console.error(`更新列标题失败 (ID: ${columnId}):`, error);
    throw error;
  }
};

export const addProjectRow = async (projectId: string): Promise<ProjectRow> => {
  try {
    const response = await api.post(`/grid/rows/`, {
      project_id: projectId
    });
    return response.data;
  } catch (error) {
    console.error(`添加行失败 (ID: ${projectId}):`, error);
    throw error;
  }
};

export const deleteProjectRow = async (rowId: string): Promise<void> => {
  try {
    await api.delete(`/grid/rows/${rowId}/`);
  } catch (error) {
    console.error(`删除行失败 (ID: ${rowId}):`, error);
    throw error;
  }
};

export const updateImage = async (file: File, projectId: string): Promise<ImageResponse> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('project_id', projectId);
    const response = await api.post(`/base/images/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

// 共享链接接口
export interface SharedLinkResponse {
  shared_id: string;
  shared_key: string;
  shared_password: string;
  project: string;
  project_name: string;
  vender?: string;
  row_ids_list: string[];
  created_at: string;
  updated_at: string;
}

/**
 * 创建共享链接
 * @param projectId 项目ID
 * @param rowIds 选中的行ID列表
 * @param vender 可选的供应商名称
 * @returns 共享链接信息数组
 */
export const createSharedLink = async (
  projectId: string, 
  rowIds: string[], 
): Promise<SharedLinkResponse[]> => {
  try {
    const response = await api.post('/grid/shared/', {
      project: projectId,
      row_ids_list: rowIds,
    });
    
    // 返回数据可能是单个对象或数组，统一处理为数组
    const responseData = response.data;
    return Array.isArray(responseData) ? responseData : [responseData];
  } catch (error) {
    console.error('创建共享链接失败:', error);
    throw error;
  }
};

/**
 * 获取项目的所有共享链接
 * @param projectId 项目ID
 * @returns 共享链接信息数组
 */
export const getProjectSharedLinks = async (
  projectId: string
): Promise<SharedLinkResponse[]> => {
  try {
    const response = await api.get(`/grid/shared/?project_id=${projectId}`);
    const responseData = response.data || [];
    return Array.isArray(responseData) ? responseData : [responseData];
  } catch (error) {
    console.error('获取项目共享链接失败:', error);
    throw error;
  }
};

/**
 * 通过共享密钥和密码访问共享项目
 * @param sharedKey 共享密钥
 * @param password 共享密码
 * @returns 项目详情、列、行等数据
 */
export const accessSharedProject = async (
  sharedKey: string,
  password: string
): Promise<any> => {
  try {
    const response = await api.get(
      `/grid/shared/project_access?shared_key=${sharedKey}&shared_password=${password}`
    );
    return response.data;
  } catch (error) {
    console.error('访问共享项目失败:', error);
    throw error;
  }
};

/**
 * 删除共享链接
 * @param sharedId 共享链接ID
 * @returns Promise
 */
export const deleteSharedLink = async (sharedId: string): Promise<void> => {
  try {
    await api.delete(`/grid/shared/${sharedId}/`);
  } catch (error) {
    console.error('删除共享链接失败:', error);
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
    await api.post('/grid/shared/update_vendor_remark', {
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

/**
 * 更新列的样式
 * @param columnId 列ID
 * @param style 样式对象
 * @returns 更新后的列信息
 */
export const updateColumnStyle = async (
  columnId: string,
  style: Record<string, any>
): Promise<any> => {
  try {
    const response = await api.patch(`/grid/columns/${columnId}/`, {
      style: JSON.stringify(style)
    });
    return response.data;
  } catch (error) {
    console.error(`更新列样式失败 (ID: ${columnId}):`, error);
    throw error;
  }
};

/**
 * 更新列的规则
 * @param columnId 列ID
 * @param rule 规则对象
 * @returns 更新后的列信息
 */
export const updateColumnRule = async (
  columnId: string,
  rule: Record<string, any>
): Promise<any> => {
  try {
    const response = await api.patch(`/grid/columns/${columnId}/`, {
      rule: JSON.stringify(rule)
    });
    return response.data;
  } catch (error) {
    console.error(`更新列规则失败 (ID: ${columnId}):`, error);
    throw error;
  }
};

export const getRows = async (projectId: string, hidden: boolean): Promise<any> => {
  try {
    const response = await api.get(`/grid/rows/get_rows?project_id=${projectId}&hidden=${hidden}`);
    return response.data;
  } catch (error) {
    console.error(`获取行失败:`, error);
    throw error;
  }
};

/**
 * 切换行的隐藏状态
 * @param rowIds 行ID数组
 * @param hidden 是否隐藏
 * @returns 更新结果
 */
export const toggleRowsHidden = async (
  rowIds: string[],
  hidden: boolean
): Promise<any> => {
  try {
    const response = await api.post(`/grid/rows/toggle_hidden/`, {
      row_ids: rowIds,
      hidden
    });
    return response.data;
  } catch (error) {
    console.error(`切换行隐藏状态失败:`, error);
    throw error;
  }
};

export const downloadFile = async (fileId: string): Promise<any> => {
  try {
    const response = await api.get(`/base/images/download_file/?file_id=${fileId}`);
    return response;
  } catch (error) {
    console.error(`下载文件失败:`, error);
    throw error;
  }
};

/**
 * 供应商接口
 */
export interface Vendor {
  vendor_id: string;
  name: string;
  contact?: string;
  phone?: string;
  address?: string;
  email?: string;
  remark?: string;
  created_at: string;
  updated_at: string;
}

/**
 * 获取供应商列表
 * @returns 供应商列表
 */
export const getVendors = async (): Promise<Vendor[]> => {
  try {
    const response = await api.get('/fabrics/vendors/');
    return response.data || [];
  } catch (error) {
    console.error('获取供应商列表失败:', error);
    throw error;
  }
};

/**
 * 创建供应商
 * @param name 供应商名称
 * @param contact 联系人
 * @param phone 联系电话
 * @param address 地址
 * @param email 邮箱
 * @param remark 备注
 * @returns 创建的供应商
 */
export const createVendor = async (
  name: string,
  contact?: string,
  phone?: string,
  address?: string,
  email?: string,
  remark?: string,
  vendor_id?: string
): Promise<Vendor> => {
  try {
    const response = await api.post('/fabrics/vendors/', {
      name,
      contact,
      phone,
      address,
      email,
      remark,
      vendor_id
    });
    return response.data;
  } catch (error) {
    console.error('创建供应商失败:', error);
    throw error;
  }
};

/**
 * 获取供应商详情
 * @param vendorId 供应商ID
 * @returns 供应商详情
 */
export const getVendorDetail = async (vendorId: string): Promise<Vendor> => {
  try {
    const response = await api.get(`/fabrics/vendors/${vendorId}/`);
    return response.data;
  } catch (error) {
    console.error(`获取供应商详情失败 (ID: ${vendorId}):`, error);
    throw error;
  }
};

/**
 * 创建供应商共享链接
 * @param projectId 项目ID
 * @param vendorId 供应商ID
 * @param rowIds 行ID列表
 * @param expiresAt 过期时间
 * @returns 共享链接信息
 */
export const createVendorShare = async (
  projectId: string,
  vendorId: string,
  rowIds: string[],
  expiresAt?: string
): Promise<any> => {
  try {
    const response = await api.post('/grid/vendor-share/', {
      project: projectId,
      vendor: vendorId,
      row_ids_list: rowIds,
      expires_at: expiresAt
    });
    return response.data;
  } catch (error) {
    console.error('创建供应商共享链接失败:', error);
    throw error;
  }
};

/**
 * 获取项目的供应商共享链接
 * @param projectId 项目ID
 * @returns 共享链接列表
 */
export const getProjectVendorShares = async (projectId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/grid/vendor-share/?project_id=${projectId}`);
    return response.data || [];
  } catch (error) {
    console.error('获取项目供应商共享链接失败:', error);
    throw error;
  }
};

/**
 * 访问供应商共享链接
 * @param sharedKey 共享密钥
 * @param password 密码
 * @returns 共享项目数据
 */
export const accessVendorShare = async (
  sharedKey: string,
  password: string
): Promise<any> => {
  try {
    const response = await api.get(
      `/grid/vendor-share/access?shared_key=${sharedKey}&shared_password=${password}`
    );
    return response.data;
  } catch (error) {
    console.error('访问供应商共享链接失败:', error);
    throw error;
  }
};

/**
 * 生成项目的供应商共享链接
 * @param projectId 项目ID
 * @returns 生成的供应商共享链接列表
 */
export const generateVendorLinks = async (projectId: string): Promise<any[]> => {
  try {
    const response = await api.post('/grid/vendor-share/generate', {
      project_id: projectId
    });
    return response.data || [];
  } catch (error) {
    console.error('生成供应商共享链接失败:', error);
    throw error;
  }
};

/**
 * 获取项目的供应商共享链接
 * @param projectId 项目ID
 * @returns 供应商共享链接列表
 */
export const getVendorSharedLinks = async (projectId: string): Promise<any[]> => {
  try {
    const response = await api.get(`/grid/vendor-share/?project_id=${projectId}`);
    return response.data || [];
  } catch (error) {
    console.error('获取供应商共享链接失败:', error);
    throw error;
  }
};

/**
 * 访问供应商共享项目
 * @param sharedKey 共享密钥
 * @param password 密码
 * @returns 供应商共享项目数据
 */
export const accessVendorSharedProject = async (
  sharedKey: string,
  password: string
): Promise<any> => {
  try {
    const response = await api.get(
      `/grid/vendor-share/vendor_access?shared_key=${sharedKey}&shared_password=${password}`
    );
    return response.data;
  } catch (error) {
    console.error('访问供应商共享项目失败:', error);
    throw error;
  }
};