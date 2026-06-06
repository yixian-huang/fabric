import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { getSetupStatus } from '@/api/setup';

const FABRIC_RESERVED_PATHS = new Set(['add', 'edit']);

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'FabricPreview',
    component: () => import('@/views/fabric/FabricPreview.vue'),
    meta: { requiresAuth: false, title: '面料展示' },
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/setup/index.vue'),
    meta: { requiresAuth: false, title: '首次配置' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/admin',
    component: () => import('@/layout/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/views/admin/Dashboard.vue'),
        meta: { adminTitleKey: 'admin.dashboard' },
      },
      {
        path: 'fabrics',
        name: 'AdminFabrics',
        component: () => import('@/views/admin/fabrics/FabricList.vue'),
        meta: { adminTitleKey: 'admin.fabrics' },
      },
      {
        path: 'fabrics/new',
        name: 'AdminFabricNew',
        component: () => import('@/views/admin/fabrics/FabricForm.vue'),
        meta: { adminTitleKey: 'admin.fabricNew' },
      },
      {
        path: 'fabrics/:id/edit',
        name: 'AdminFabricEdit',
        component: () => import('@/views/admin/fabrics/FabricForm.vue'),
        meta: { adminTitleKey: 'admin.fabricEdit' },
      },
      {
        path: 'options',
        name: 'AdminOptions',
        component: () => import('@/views/admin/options/OptionList.vue'),
        meta: { adminTitleKey: 'admin.options' },
      },
      {
        path: 'suppliers',
        name: 'AdminSuppliers',
        component: () => import('@/views/admin/suppliers/SupplierList.vue'),
        meta: { adminTitleKey: 'admin.suppliers' },
      },
    ],
  },
  {
    path: '/menu/supplier',
    redirect: '/admin/suppliers',
  },
  {
    path: '/fabric/add',
    redirect: '/admin/fabrics/new',
  },
  {
    path: '/fabric/edit/:id',
    redirect: (to) => `/admin/fabrics/${to.params.id}/edit`,
  },
  {
    path: '/fabric/:referenceCode',
    name: 'FabricDetail',
    component: () => import('@/views/fabric/FabricDetail.vue'),
    meta: { requiresAuth: false, title: '面料详情' },
    beforeEnter: (to, _from, next) => {
      const ref = String(to.params.referenceCode || '');
      if (!ref || FABRIC_RESERVED_PATHS.has(ref)) {
        next('/');
        return;
      }
      next();
    },
  },
  {
    path: '/fabric',
    redirect: '/admin/fabrics',
  },
  {
    path: '/share/:token',
    name: 'SharedFavorites',
    component: () => import('@/views/shared/SharedFavorites.vue'),
    meta: { requiresAuth: false, title: '分享的收藏' },
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/views/auth/VerifyEmail.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

function isSetupExemptPath(path: string): boolean {
  if (
    path === '/setup' ||
    path === '/login' ||
    path === '/verify-email' ||
    path === '/' ||
    path.startsWith('/share/')
  ) {
    return true;
  }
  if (path.startsWith('/fabric/')) {
    const segment = path.slice('/fabric/'.length).split('/')[0];
    return (
      segment !== '' &&
      !FABRIC_RESERVED_PATHS.has(segment) &&
      !path.startsWith('/fabric/edit/')
    );
  }
  return false;
}

router.beforeEach(async (to, _from, next) => {
  const token = localStorage.getItem('token');

  if (to.path === '/setup') {
    next();
    return;
  }

  try {
    const res = await getSetupStatus();
    const data = (res as { data?: { setup_required?: boolean } }).data ?? res;
    if (data?.setup_required && !token && !isSetupExemptPath(to.path)) {
      next('/setup');
      return;
    }
  } catch {
    // API 不可用时仍允许访问公开页
  }

  if (to.meta.requiresAuth === false) {
    next();
    return;
  }

  if (to.meta.requiresAuth && !token) {
    next('/login');
  } else if (token && to.path === '/login') {
    next('/admin');
  } else {
    next();
  }
});

export default router;
