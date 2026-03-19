'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';
import { useAuthStore } from '@/stores/auth';

export function useFilteredNavItems(items: NavItem[]) {
  const role = useAuthStore((s) => s.user?.role);

  return useMemo(() => {
    return items.filter((item) => {
      if (!item.access) return true;
      if (item.access.role && item.access.role !== role) return false;
      return true;
    });
  }, [items, role]);
}
