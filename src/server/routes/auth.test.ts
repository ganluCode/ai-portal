import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn()
  }
}));

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'testuser',
  password: 'hashed_password',
  role: 'USER' as const,
  avatar: null,
  isActive: true,
  apiKeyHash: null,
  preferences: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
  process.env.BAIZE_MODE = 'mock';
});

describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue(mockUser);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
        name: 'testuser'
      })
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe('test@example.com');
    expect(body.user.password).toBeUndefined();
  });

  it('returns 409 if email already exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);

    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('returns token on valid email credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

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
    expect(res.headers.get('set-cookie')).toContain('token=');
  });

  it('returns token on valid username credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'testuser', password: 'password123' })
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('token=');
  });

  it('returns 401 on invalid password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'wrong'
      })
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 for inactive user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      ...mockUser,
      isActive: false
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown identifier', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'nobody', password: 'password123' })
    });

    expect(res.status).toBe(401);
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
    const res = await app.request('/api/auth/logout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('token=;');
  });
});
