import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { apiJson, login, testImagePath, uniqueCode } from '../helpers/api';

const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('面料 CRUD', () => {
  let token: string;
  let imageFileId: string;
  let fabricId: string;
  let fabricCode: string;
  let optionId: string;
  let vendorId: string;

  test.beforeAll(async ({ request }) => {
    token = await login(request, E2E_USER, E2E_PASS);

    const uploadRes = await request.post('/api/base/images/upload/', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'fabric.png',
          mimeType: 'image/png',
          buffer: fs.readFileSync(testImagePath()),
        },
      },
    });
    const uploadBody = await uploadRes.json();
    const data = uploadBody.data as { file_id?: string };
    imageFileId = data?.file_id ?? '';
  });

  test('get_options 选项字典', async ({ request }) => {
    await apiJson(request, 'GET', '/fabrics/get_options', { expectCode: 200 });
    await apiJson(request, 'GET', '/fabrics/get_options?category_code=fabric_type', {
      expectCode: 200,
    });
  });

  test('create_option / update_option / delete_option', async ({ request }) => {
    const name = uniqueCode('opt');
    const { body: created } = await apiJson<{ option_id: string }>(
      request,
      'POST',
      '/fabrics/create_option',
      {
        token,
        data: {
          CategoryCode: 'style',
          OptionName: `E2E ${name}`,
          SortOrder: 99,
        },
        expectCode: 200,
      },
    );
    optionId = (created.data as { option_id?: string })?.option_id ?? '';
    expect(optionId).toBeTruthy();

    await apiJson(request, 'PUT', `/fabrics/update_option/${optionId}`, {
      token,
      data: { option_name: `E2E Updated ${name}` },
      expectCode: 200,
    });

    await apiJson(request, 'DELETE', `/fabrics/delete_option/${optionId}`, {
      token,
      expectCode: 200,
    });
    optionId = '';
  });

  test('供应商 vendors CRUD', async ({ request }) => {
    const code = uniqueCode('VND');
    const { body: created } = await apiJson(request, 'POST', '/fabrics/vendors/', {
      token,
      data: { name: `E2E Vendor ${code}`, contact: 'e2e', phone: '13800000000' },
      expectCode: 200,
    });
    vendorId = (created.data as { vendor_id?: string })?.vendor_id ?? '';
    expect(vendorId).toBeTruthy();

    await apiJson(request, 'GET', `/fabrics/vendors/${vendorId}/`, { token, expectCode: 200 });
    await apiJson(request, 'GET', '/fabrics/vendors/', { token, expectCode: 200 });

    await apiJson(request, 'PUT', `/fabrics/vendors/${vendorId}/`, {
      token,
      data: { name: `E2E Updated ${code}` },
      expectCode: 200,
    });

    await apiJson(request, 'DELETE', `/fabrics/vendors/${vendorId}/`, {
      token,
      expectCode: 200,
    });
    vendorId = '';
  });

  test('创建面料', async ({ request }) => {
    fabricCode = uniqueCode('FAB');
    const { body } = await apiJson(request, 'POST', '/fabrics/fabrics/', {
      token,
      data: {
        code: fabricCode,
        merchant_code: 'M001',
        weight: 200,
        weight_unit: 'g/m2',
        fabric_type: 1,
        style_codes: [],
        process_codes: [],
        remark: 'e2e fabric',
        image_file_id: imageFileId || null,
        components: [],
      },
      expectCode: 200,
    });
    const data = body.data as { fabric_id?: string };
    fabricId = data?.fabric_id ?? '';
    expect(fabricId).toBeTruthy();
  });

  test('check_fabric_code 编号检查', async ({ request }) => {
    test.skip(!fabricCode, '需要先创建面料');
    const { body } = await apiJson(request, 'GET', `/fabrics/check_fabric_code?fabric_code=${fabricCode}`, {
      token,
      expectCode: 200,
    });
    expect(body.data).toBeDefined();
  });

  test('列表与详情', async ({ request }) => {
    test.skip(!fabricId, '需要先创建面料');
    await apiJson(request, 'GET', '/fabrics/list?page=1&page_size=10', { token, expectCode: 200 });
    await apiJson(request, 'GET', '/fabrics/fabrics/?page=1&page_size=10', { token, expectCode: 200 });
    await apiJson(request, 'GET', `/fabrics/fabrics/${fabricId}/`, { token, expectCode: 200 });
  });

  test('更新面料', async ({ request }) => {
    test.skip(!fabricId, '需要先创建面料');
    await apiJson(request, 'PUT', `/fabrics/fabrics/${fabricId}/`, {
      token,
      data: {
        code: fabricCode,
        merchant_code: 'M002',
        weight: 220,
        weight_unit: 'g/m2',
        fabric_type: 1,
        remark: 'e2e updated',
        components: [],
      },
      expectCode: 200,
    });
  });

  test('收藏 toggle_favorite', async ({ request }) => {
    test.skip(!fabricId, '需要先创建面料');
    await apiJson(request, 'POST', '/fabrics/toggle_favorite', {
      token,
      data: { fabric_id: fabricId },
      expectCode: 200,
    });
    await apiJson(request, 'GET', '/fabrics/fabrics/my_favorites', { token, expectCode: 200 });
    await apiJson(request, 'POST', '/fabrics/toggle_favorite', {
      token,
      data: { fabric_id: fabricId },
      expectCode: 200,
    });
  });

  test('visitor_stats', async ({ request }) => {
    await apiJson(request, 'GET', '/fabrics/visitor_stats', { token, expectCode: 200 });
  });

  test('删除面料', async ({ request }) => {
    test.skip(!fabricId, '需要先创建面料');
    await apiJson(request, 'DELETE', `/fabrics/fabrics/${fabricId}/`, {
      token,
      expectCode: 200,
    });
    const { body } = await apiJson(request, 'GET', `/fabrics/fabrics/${fabricId}`, {
      token,
      expectCode: 40404,
    });
    expect(body.message).toMatch(/不存在/);
    fabricId = '';
  });
});
