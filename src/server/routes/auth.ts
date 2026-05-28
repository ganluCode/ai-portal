import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { baizeClient, type BaizeUserResponse } from '../lib/baize-auth';
import { authMiddleware } from '../middleware/auth';
import type { AuthUser } from '@/stores/auth';

const auth = new Hono();

// 支持 email 或 username 登录
const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1)
});

/** Baize snake_case → Portal camelCase */
function mapUser(u: BaizeUserResponse): AuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role as AuthUser['role'],
    avatar: u.avatar,
    isActive: u.is_active,
    createdAt: u.created_at
  };
}

function setCookieWithToken(
  c: Parameters<typeof setCookie>[0],
  token: string,
  expiresIn: number
) {
  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: expiresIn
  });
}

// POST /api/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { identifier, password } = c.req.valid('json');

  try {
    const tokenRes = await baizeClient.login(identifier, password);
    const baizeUser = await baizeClient.getMe(tokenRes.access_token);

    setCookieWithToken(c, tokenRes.access_token, tokenRes.expires_in);

    return c.json({ user: mapUser(baizeUser) });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    return c.json({ error: 'Authentication service unavailable' }, 503);
  }
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const token = c.get('token');
  try {
    const baizeUser = await baizeClient.getMe(token);
    return c.json({ user: mapUser(baizeUser) });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ error: 'Failed to fetch user' }, 502);
  }
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  const token = getCookie(c, 'token');
  if (token) {
    await baizeClient.logout(token); // best-effort
  }
  deleteCookie(c, 'token');
  return c.json({ ok: true });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  try {
    const tokenRes = await baizeClient.refresh(token);
    setCookieWithToken(c, tokenRes.access_token, tokenRes.expires_in);
    return c.json({ ok: true });
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) {
      deleteCookie(c, 'token');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return c.json({ error: 'Refresh failed' }, 502);
  }
});

export default auth;
