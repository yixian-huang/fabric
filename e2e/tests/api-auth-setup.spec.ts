import { test, expect } from '@playwright/test';
import { apiJson, login, uniqueCode } from '../helpers/api';

const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('认证与系统', () => {
  test('healthz 健康检查', async ({ request }) => {
    const res = await request.get('/healthz');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.code).toBe(200);
    expect(body.data?.status).toBe('up');
  });

  test('登录 / me / favorite-count', async ({ request }) => {
    const token = await login(request, E2E_USER, E2E_PASS);
    await apiJson(request, 'GET', '/base/auth/me', { token, expectCode: 200 });
    await apiJson(request, 'GET', '/base/me/favorite-count', { token, expectCode: 200 });
  });

  test('setup status', async ({ request }) => {
    await apiJson(request, 'GET', '/base/setup/status', { expectCode: 200 });
  });

  test('公开面料列表无需登录', async ({ request }) => {
    const { body } = await apiJson(request, 'GET', '/fabrics/list_public?page=1&page_size=5', {
      expectCode: 200,
    });
    expect(body.data).toBeDefined();
  });

  test('record_visit 访客记录', async ({ request }) => {
    await apiJson(request, 'POST', '/fabrics/record_visit', {
      data: { page: 'e2e_test' },
      expectCode: 200,
    });
  });
});

test.describe('注册流程（可选）', () => {
  test('新用户注册', async ({ request }) => {
    const u = uniqueCode('reg');
    const { body } = await apiJson(request, 'POST', '/base/auth/register', {
      data: {
        username: u,
        password: 'RegTest123!',
        password_confirm: 'RegTest123!',
        email: `${u}@e2e.local`,
        email_subscription: false,
      },
    });
    expect([200, 409]).toContain(body.code);
  });
});
