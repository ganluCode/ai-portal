import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthStore } from './auth';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'testuser',
  role: 'USER' as const,
  avatar: null,
  isActive: true,
  createdAt: new Date().toISOString()
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ user: null, status: 'idle' });
});

describe('useAuthStore', () => {
  it('has initial idle state', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('idle');
  });

  it('login sets user on success with email', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.status).toBe('authenticated');
  });

  it('login sets user on success with username', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('testuser', 'password123');
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.status).toBe('authenticated');
  });

  it('login sets error on failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.login('testuser', 'wrong').catch(() => {});
    });

    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('logout clears user', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    useAuthStore.setState({ user: mockUser, status: 'authenticated' });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
  });

  it('fetchMe sets user when authenticated', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: mockUser })
    });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.fetchMe();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.status).toBe('authenticated');
  });

  it('fetchMe sets unauthenticated on 401', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

    const { result } = renderHook(() => useAuthStore());
    await act(async () => {
      await result.current.fetchMe();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.status).toBe('unauthenticated');
  });
});
