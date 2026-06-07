import request from './request';

export function listUsers() {
  return request({
    url: '/base/users/',
    method: 'get',
  });
}

export function getUser(userId: string) {
  return request({
    url: `/base/users/${userId}/`,
    method: 'get',
  });
}

export function updateUser(userId: string, data: Record<string, unknown>) {
  return request({
    url: `/base/users/${userId}/`,
    method: 'put',
    data,
  });
}

export function deleteUser(userId: string) {
  return request({
    url: `/base/users/${userId}/`,
    method: 'delete',
  });
}
