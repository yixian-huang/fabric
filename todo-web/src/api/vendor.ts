import request from './request'

export interface Vendor {
  vendor_id: string
  name: string
  contact?: string
  phone?: string
  address?: string
  email?: string
  remark?: string
  created_at?: string
  updated_at?: string
}

export interface VendorInput {
  name: string
  contact?: string
  phone?: string
  address?: string
  email?: string
  remark?: string
}

export function listVendors() {
  return request({
    url: '/fabrics/vendors/',
    method: 'get',
  })
}

export function createVendor(data: VendorInput) {
  return request({
    url: '/fabrics/vendors/',
    method: 'post',
    data,
  })
}

export function getVendor(vendorId: string) {
  return request({
    url: `/fabrics/vendors/${vendorId}/`,
    method: 'get',
  })
}

export function updateVendor(vendorId: string, data: VendorInput) {
  return request({
    url: `/fabrics/vendors/${vendorId}/`,
    method: 'put',
    data,
  })
}

export function deleteVendor(vendorId: string) {
  return request({
    url: `/fabrics/vendors/${vendorId}/`,
    method: 'delete',
  })
}
