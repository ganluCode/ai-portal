'use client';

import { useMemo } from 'react';
import type { NavItem } from '@/types';

/**
 * Hook to filter navigation items based on RBAC.
 * TODO(step-5): replace with zustand auth store when auth is implemented.
 */
export function useFilteredNavItems(items: NavItem[]) {
  return useMemo(() => items, [items]);
}
