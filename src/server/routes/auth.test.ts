import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';

// Mock prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    }
  }
}));

// Mock bcryptjs
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
  name: 'Test User',
  password: 'hashed_password',
  role: 'USER' as const,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long!!';
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
        name: 'Test User'
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
  it('returns token on valid credentials', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.email).toBe('test@example.com');
    // token should be set as cookie
    expect(res.headers.get('set-cookie')).toContain('token=');
  });

  it('returns 401 on invalid password', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrong'
      })
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 on unknown email', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@example.com',
        password: 'password123'
      })
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
