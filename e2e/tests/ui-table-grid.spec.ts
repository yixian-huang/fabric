import { test, expect } from '@playwright/test';
import { seedAuth } from '../helpers/auth-ui';

test.describe('todo-table Grid UI', () => {
  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('登录态可打开首页与 Todo', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    for (const path of ['/', '/todo']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
