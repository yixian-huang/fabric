import { test, expect } from '@playwright/test';
import { apiJson, login } from '../helpers/api';

const E2E_USER = process.env.E2E_USERNAME ?? 'e2e_tester';
const E2E_PASS = process.env.E2E_PASSWORD ?? 'E2eTest123!';

test.describe('Todo/Grid 项目 CRUD', () => {
  let token: string;
  let projectId: string;
  let columnId: string;
  let rowId: string;
  let todoProjectId: string;

  test.beforeAll(async ({ request }) => {
    token = await login(request, E2E_USER, E2E_PASS);
  });

  test('获取 Todo 默认项目', async ({ request }) => {
    const { body } = await apiJson(request, 'GET', '/grid/projects/todo/', {
      token,
      expectCode: 200,
    });
    const data = body.data as { project_id?: string };
    todoProjectId = data?.project_id ?? '';
    expect(todoProjectId).toBeTruthy();
  });

  test('创建普通项目', async ({ request }) => {
    const { body } = await apiJson(request, 'POST', '/grid/projects/', {
      token,
      data: { name: `E2E Project ${Date.now()}`, description: 'playwright e2e' },
      expectCode: 200,
    });
    projectId = (body.data as { project_id?: string })?.project_id ?? '';
    expect(projectId).toBeTruthy();
  });

  test('项目列表与详情', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    await apiJson(request, 'GET', '/grid/projects/', { token, expectCode: 200 });
    await apiJson(request, 'GET', `/grid/projects/${projectId}/`, { token, expectCode: 200 });
  });

  test('更新项目', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    await apiJson(request, 'PATCH', `/grid/projects/${projectId}/`, {
      token,
      data: { name: `E2E Updated ${Date.now()}`, description: 'updated' },
      expectCode: 200,
    });
  });

  test('创建列', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    const { body } = await apiJson(request, 'POST', '/grid/columns/', {
      token,
      data: {
        project_id: projectId,
        title: 'E2E Column',
        width: 120,
        type: 'text',
      },
      expectCode: 200,
    });
    columnId = (body.data as { column_id?: string })?.column_id ?? '';
    expect(columnId).toBeTruthy();
  });

  test('更新列', async ({ request }) => {
    test.skip(!columnId, '需要先创建列');
    await apiJson(request, 'PATCH', `/grid/columns/${columnId}/`, {
      token,
      data: { title: 'E2E Column Renamed' },
      expectCode: 200,
    });
  });

  test('创建行', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    const { body } = await apiJson(request, 'POST', '/grid/rows/', {
      token,
      data: { project_id: projectId },
      expectCode: 200,
    });
    rowId = (body.data as { row_id?: string })?.row_id ?? '';
    expect(rowId).toBeTruthy();
  });

  test('获取行列表', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    await apiJson(request, 'GET', `/grid/rows/get_rows/?project_id=${projectId}&hidden=false`, {
      token,
      expectCode: 200,
    });
  });

  test('更新单元格', async ({ request }) => {
    test.skip(!projectId || !rowId || !columnId, '需要项目/行/列');
    await apiJson(request, 'PATCH', '/grid/cells/update', {
      token,
      data: {
        project: projectId,
        row: rowId,
        column: columnId,
        content: 'e2e cell value',
        type: 'text',
      },
      expectCode: 200,
    });
  });

  test('隐藏/显示行', async ({ request }) => {
    test.skip(!rowId, '需要先创建行');
    await apiJson(request, 'POST', '/grid/rows/toggle_hidden/', {
      token,
      data: { row_ids: [rowId], hidden: true },
      expectCode: 200,
    });
    await apiJson(request, 'POST', '/grid/rows/toggle_hidden/', {
      token,
      data: { row_ids: [rowId], hidden: false },
      expectCode: 200,
    });
  });

  test('删除行', async ({ request }) => {
    test.skip(!rowId, '需要先创建行');
    await apiJson(request, 'DELETE', `/grid/rows/${rowId}/`, { token, expectCode: 200 });
    rowId = '';
  });

  test('删除列', async ({ request }) => {
    test.skip(!columnId, '需要先创建列');
    await apiJson(request, 'DELETE', `/grid/columns/${columnId}/`, { token, expectCode: 200 });
    columnId = '';
  });

  test('删除项目', async ({ request }) => {
    test.skip(!projectId, '需要先创建项目');
    await apiJson(request, 'DELETE', `/grid/projects/${projectId}/`, { token, expectCode: 200 });
    projectId = '';
  });

  test('Todo 项目行操作（在默认 todo 项目上）', async ({ request }) => {
    test.skip(!todoProjectId, '需要 todo 项目');
    const { body } = await apiJson(request, 'POST', '/grid/rows/', {
      token,
      data: { project_id: todoProjectId },
      expectCode: 200,
    });
    const todoRowId = (body.data as { row_id?: string })?.row_id ?? '';
    expect(todoRowId).toBeTruthy();
    await apiJson(request, 'DELETE', `/grid/rows/${todoRowId}/`, { token, expectCode: 200 });
  });
});
