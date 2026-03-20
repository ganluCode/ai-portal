import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'USER';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  avatar: string | null;
  isActive: boolean;
  createdAt: string;
}

type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',

  login: async (identifier, password) => {
    set({ status: 'loading' });
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
      credentials: 'include'
    });
    if (!res.ok) {
      set({ status: 'unauthenticated' });
      const body = await res.json();
      throw new Error(body.error || 'Login failed');
    }
    const { user } = await res.json();
    set({ user, status: 'authenticated' });
  },

  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    set({ user: null, status: 'unauthenticated' });
  },

  fetchMe: async () => {
    set({ status: 'loading' });
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) {
      set({ user: null, status: 'unauthenticated' });
      return;
    }
    const { user } = await res.json();
    set({ user, status: 'authenticated' });
  }
}));
