import { test, expect } from '@playwright/test';

const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('todo-web 登录表单', () => {
  test.fixme('表单登录写入 token（若 setup_required 会重定向）', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[placeholder="用户名"]').fill(E2E_USER);
    await page.locator('input[placeholder="密码"]').fill(E2E_PASS);
    await page.getByRole('button', { name: '登录' }).click();
    await page.waitForURL(/\/fabric/, { timeout: 20_000 });
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
