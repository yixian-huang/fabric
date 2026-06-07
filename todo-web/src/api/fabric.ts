import request from './request';
import axios from 'axios';

/**
 * 面料相关接口
 */

// 获取面料列表
export function getFabricList(params: any) {
  return request({
    url: '/fabrics/fabrics/',
    method: 'get',
    params
  });
}

// 获取公开面料详情（不需要认证）
export function getPublicFabricDetail(referenceCode: string) {
  return request(`/fabrics/public/${encodeURIComponent(referenceCode)}`, {
    method: 'get',
  });
}

// 获取公开面料列表（不需要认证）
export function getPublicFabricList(params: any) {
  // 使用axios直接创建请求，不使用request实例（因为request会自动添加token）
  return request('/fabrics/list_public', {
    params,
    method: 'get',
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// 获取面料详情
export function getFabricDetail(id: string | number) {
  return request({
    url: `/fabrics/fabrics/${id}/`,
    method: 'get'
  });
}

// 检查面料编号是否存在
export function checkFabricCode(fabricCode: string) {
  return request({
    url: `/fabrics/check_fabric_code?fabric_code=${fabricCode}`,
    method: 'get'
  });
}

// 添加面料
export function addFabric(data: any) {
  return request({
    url: '/fabrics/fabrics/',
    method: 'post',
    data
  });
}

// 更新面料
export function updateFabric(id: string | number, data: any) {
  return request({
    url: `/fabrics/fabrics/${id}/`,
    method: 'put',
    data
  });
}

// 删除面料
export function deleteFabric(id: string | number) {
  return request({
    url: `/fabrics/fabrics/${id}/`,
    method: 'delete'
  });
}

// 上传面料图片
export function uploadFabricImage(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  return request({
    url: '/base/images/upload/',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
}

/**
 * 获取选项字典
 * @returns {Promise} 选项字典数据
 */
export function getOptions(params?: any) {
  return request({
    url: '/fabrics/get_options',
    method: 'get',
    params
  });
}

/**
 * 创建选项
 * @param data 选项数据
 * @returns {Promise}
 */
export function createOption(data: any) {
  return request({
    url: '/fabrics/create_option',
    method: 'post',
    data
  });
}

/**
 * 更新选项
 * @param id 选项ID
 * @param data 选项数据
 * @returns {Promise}
 */
export function updateOption(id: string, data: any) {
  return request({
    url: `/fabrics/update_option/${id}`,
    method: 'put',
    data
  });
}

/**
 * 删除选项
 * @param id 选项ID
 * @returns {Promise}
 */
export function deleteOption(id: string) {
  return request({
    url: `/fabrics/delete_option/${id}`,
    method: 'delete'
  });
}

/**
 * 记录访客信息
 * @param pageInfo 页面信息，包含访问的页面名称
 * @returns Promise
 */
export function recordVisit(pageInfo: { page?: string; url?: string; referrer?: string } = {}) {
  const payload = {
    page: pageInfo.page || 'fabric_preview',
    url: pageInfo.url || (typeof window !== 'undefined' ? window.location.pathname : ''),
    referrer: pageInfo.referrer || (typeof document !== 'undefined' ? document.referrer : ''),
  };
  return request({
    url: '/fabrics/record_visit',
    method: 'post',
    data: payload,
  });
}

/**
 * 获取访客统计数据
 * @returns Promise 访客统计数据
 */
export function getVisitorStats() {
  return request({
    url: '/fabrics/visitor_stats',
    method: 'get'
  });
}

export function submitFabricInquiry(data: {
  reference_code: string;
  email: string;
  message: string;
}) {
  return request({
    url: '/fabrics/inquiry',
    method: 'post',
    data,
  });
} 