import request from './request';

export function getAnalyticsSummary(params: { from?: string; to?: string }) {
  return request({
    url: '/fabrics/analytics/summary',
    method: 'get',
    params,
  });
}

export function getAnalyticsDimensions(params: {
  from?: string;
  to?: string;
  dimension?: string;
  limit?: number;
}) {
  return request({
    url: '/fabrics/analytics/dimensions',
    method: 'get',
    params,
  });
}

export function getAnalyticsTrends(params: {
  from?: string;
  to?: string;
  metric?: string;
  granularity?: string;
}) {
  return request({
    url: '/fabrics/analytics/trends',
    method: 'get',
    params,
  });
}
