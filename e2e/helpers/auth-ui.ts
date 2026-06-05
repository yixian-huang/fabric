import { Page, APIRequestContext } from '@playwright/test';
import { login } from './api';

export async function seedAuth(
  page: Page,
  request: APIRequestContext,
  username = process.env.E2E_USERNAME ?? 'e2e_tester',
  password = process.env.E2E_PASSWORD ?? 'E2eTest123!',
): Promise<string> {
  const token = await login(request, username, password);
  await page.goto('/');
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
    localStorage.setItem('isAuthenticated', 'true');
  }, token);
  return token;
}
