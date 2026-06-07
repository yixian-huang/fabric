import request from './request';

export function getPublicSettings() {
  return request({
    url: '/base/settings/public',
    method: 'get',
  });
}

export function getSettings() {
  return request({
    url: '/base/settings',
    method: 'get',
  });
}

export function updateSettings(data: Record<string, unknown>) {
  return request({
    url: '/base/settings',
    method: 'put',
    data,
  });
}
