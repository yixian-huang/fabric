import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import { apiJson, login, testImagePath } from '../helpers/api';

const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('图片上传与下载', () => {
  let token: string;
  let fileId: string;

  test.beforeAll(async ({ request }) => {
    token = await login(request, E2E_USER, E2E_PASS);
  });

  test('上传图片 POST /base/images/upload', async ({ request }) => {
    const imgPath = testImagePath();
    expect(fs.existsSync(imgPath)).toBeTruthy();

    const res = await request.post('/api/base/images/upload/', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: fs.readFileSync(imgPath),
        },
      },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(200);
    const data = body.data as { file_id?: string; id?: string };
    fileId = (data.file_id ?? data.id ?? '') as string;
    expect(fileId).toBeTruthy();
  });

  test('下载图片 GET /base/images/download_file', async ({ request }) => {
    test.skip(!fileId, '需要先上传成功');
    const res = await request.get(`/api/base/images/download_file/?file_id=${fileId}`);
    expect(res.status()).toBe(200);
    const ct = res.headers()['content-type'] ?? '';
    expect(ct).toMatch(/image|octet-stream/i);
    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(0);
  });

  test('未授权上传应拒绝', async ({ request }) => {
    const imgPath = testImagePath();
    const res = await request.post('/api/base/images/upload/', {
      multipart: {
        file: {
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: fs.readFileSync(imgPath),
        },
      },
    });
    expect(res.status()).toBe(401);
  });
});
