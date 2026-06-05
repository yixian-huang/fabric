import { APIRequestContext, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export const API_ROOT = process.env.API_BASE_URL ?? 'http://127.0.0.1:8000';
export const API_PREFIX = `${API_ROOT}/api`;

export type ApiEnvelope<T = unknown> = {
  code: number;
  message: string;
  data?: T;
};

export async function apiJson<T>(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  urlPath: string,
  opts?: {
    token?: string;
    data?: unknown;
    multipart?: Record<string, string | fs.ReadStream>;
    expectCode?: number;
  },
): Promise<{ status: number; body: ApiEnvelope<T>; raw: unknown }> {
  const headers: Record<string, string> = {};
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`;

  let response;
  const fullUrl = urlPath.startsWith('http') ? urlPath : `${API_PREFIX}${urlPath}`;

  if (opts?.multipart) {
    response = await request.fetch(fullUrl, {
      method,
      headers,
      multipart: opts.multipart,
    });
  } else {
    headers['Content-Type'] = 'application/json';
    response = await request.fetch(fullUrl, {
      method,
      headers,
      data: opts?.data !== undefined ? opts.data : undefined,
    });
  }

  const status = response.status();
  let raw: unknown;
  const ct = response.headers()['content-type'] ?? '';
  if (ct.includes('application/json')) {
    raw = await response.json();
  } else {
    raw = await response.text();
  }

  const body = raw as ApiEnvelope<T>;
  if (opts?.expectCode !== undefined) {
    expect(body.code, `${method} ${urlPath} -> code`).toBe(opts.expectCode);
  }
  return { status, body, raw };
}

export async function login(
  request: APIRequestContext,
  username: string,
  password: string,
): Promise<string> {
  const { body } = await apiJson<{ token: string }>(request, 'POST', '/base/auth/login', {
    data: { username, password },
    expectCode: 200,
  });
  const token = (body.data as { token?: string })?.token;
  expect(token).toBeTruthy();
  return token!;
}

export function testImagePath(): string {
  return path.join(__dirname, '..', 'fixtures', 'test-image.png');
}

export function uniqueCode(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
