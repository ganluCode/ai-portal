import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';

// Mock baizeClient
vi.mock('../lib/baize-auth', () => ({
  baizeClient: {
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    getMe: vi.fn()
  }
}));

import { baizeClient } from '../lib/baize-auth';

const mockTokenRes = {
  access_token: 'fake-jwt-token',
  token_type: 'bearer',
  expires_in: 604800
};

const mockBaizeUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'testuser',
  role: 'USER',
  avatar: null,
  preferences: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  it('returns user and sets cookie on valid credentials', async () => {
    vi.mocked(baizeClient.login).mockResolvedValue(mockTokenRes);
    vi.mocked(baizeClient.getMe).mockResolvedValue(mockBaizeUser);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.isActive).toBe(true);
    expect(body.user.password).toBeUndefined();
    expect(res.headers.get('set-cookie')).toContain('token=');
  });

  it('maps snake_case fields to camelCase', async () => {
    vi.mocked(baizeClient.login).mockResolvedValue(mockTokenRes);
    vi.mocked(baizeClient.getMe).mockResolvedValue(mockBaizeUser);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'password123'
      })
    });

    const body = await res.json();
    expect(body.user.isActive).toBeDefined();
    expect(body.user.createdAt).toBeDefined();
    expect(body.user.is_active).toBeUndefined();
  });

  it('returns 401 when Baize returns 401', async () => {
    const err = Object.assign(new Error('Unauthorized'), { status: 401 });
    vi.mocked(baizeClient.login).mockRejectedValue(err);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'bad@example.com', password: 'wrong' })
    });

    expect(res.status).toBe(401);
  });

  it('returns 503 when Baize is unavailable', async () => {
    vi.mocked(baizeClient.login).mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(503);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 without token', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the token cookie', async () => {
    vi.mocked(baizeClient.logout).mockResolvedValue(undefined);

    const res = await app.request('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('token=;');
  });

  it('clears cookie even without existing token', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 401 without token', async () => {
    const res = await app.request('/api/auth/refresh', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
