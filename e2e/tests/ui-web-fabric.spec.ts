import { test, expect } from '@playwright/test';
import { seedAuth } from '../helpers/auth-ui';

test.describe('todo-web 面料 UI', () => {
  test.beforeEach(async ({ page, request }) => {
    await seedAuth(page, request);
  });

  test('登录态可访问面料与供应商页', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();

    for (const path of ['/fabric', '/menu/supplier']) {
      const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
      expect(res?.status()).toBeLessThan(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('面料表单页可打开', async ({ page }) => {
    const res = await page.goto('/fabric/add', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBeLessThan(500);
  });
});
