export type AdminNavItem = {
  path: string;
  titleKey: string;
  icon: string;
  external?: boolean;
};

export const adminPrimaryNav: AdminNavItem[] = [
  { path: '/admin', titleKey: 'admin.dashboard', icon: 'Odometer' },
  { path: '/admin/fabrics', titleKey: 'admin.fabrics', icon: 'Grid' },
  { path: '/admin/options', titleKey: 'admin.options', icon: 'List' },
  { path: '/admin/suppliers', titleKey: 'admin.suppliers', icon: 'Shop' },
];

export const adminMoreNav: AdminNavItem[] = [];

export const adminFooterNav: AdminNavItem[] = [
  { path: '/', titleKey: 'admin.viewStorefront', icon: 'HomeFilled', external: false },
];
