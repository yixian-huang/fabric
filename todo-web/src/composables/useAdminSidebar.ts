import { ref, watch } from 'vue';

const STORAGE_KEY = 'admin-sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const collapsed = ref(readCollapsed());

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
});

export function useAdminSidebar() {
  const toggle = () => {
    collapsed.value = !collapsed.value;
  };

  return { collapsed, toggle };
}
