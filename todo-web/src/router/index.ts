import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import MainLayout from '@/layout/MainLayout.vue';
import { getSetupStatus } from '@/api/setup';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'FabricPreview',
    component: () => import('@/views/fabric/FabricPreview.vue'),
    meta: { requiresAuth: false, title: '面料展示' }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: () => import('@/views/setup/index.vue'),
    meta: { requiresAuth: false, title: '首次配置' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' }
  },
  {
    path: '/menu',
    component: MainLayout,
    redirect: '/menu/project',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'project',
        name: 'Project',
        component: () => import('@/views/project/index.vue'),
        meta: { title: '项目管理', icon: 'Folder' }
      },
      {
        path: 'template',
        name: 'Template',
        component: () => import('@/views/template/index.vue'),
        meta: { title: '模板管理', icon: 'Document' }
      },
      {
        path: 'supplier',
        name: 'Supplier',
        component: () => import('@/views/supplier/index.vue'),
        meta: { title: '供应商管理', icon: 'Shop' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  },
  {
    path: '/fabric/add',
    name: 'AddFabric',
    component: () => import('@/views/fabric/add-fabric.vue'),
    meta: { requiresAuth: true }
  },{
    path: '/fabric/edit/:id',
    name: 'EditFabric',
    component: () => import('@/views/fabric/add-fabric.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/fabric',
    name: 'ListFabric',
    component: () => import('@/views/fabric/fabric.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/share/:token',
    name: 'SharedFavorites',
    component: () => import('@/views/shared/SharedFavorites.vue'),
    meta: { requiresAuth: false, title: '分享的收藏' }
  },
  {
    path: '/verify-email',
    name: 'VerifyEmail',
    component: () => import('@/views/auth/VerifyEmail.vue'),
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

function isSetupExemptPath(path: string): boolean {
  return (
    path === '/setup' ||
    path === '/login' ||
    path === '/verify-email' ||
    path === '/' ||
    path.startsWith('/share/')
  );
}

router.beforeEach(async (to, from, next) => {
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
    next('/fabric');
  } else {
    next();
  }
});

export default router;