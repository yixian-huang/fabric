import { test, expect } from '@playwright/test';

/**
 * todo-table auth.ts 与 axios 拦截器返回结构不一致，表单登录可能无法写入 token。
 * 此用例用于记录已知问题；通过则代表已修复。
 */
const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('todo-table 登录表单', () => {
  test('表单登录', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[placeholder="用户名"]').fill(E2E_USER);
    await page.locator('input[placeholder="密码"]').fill(E2E_PASS);
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL(/\/todo/, { timeout: 20_000 });
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
