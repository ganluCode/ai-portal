import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { signToken, verifyToken } from '../lib/jwt';
import { authMiddleware } from '../middleware/auth';

const auth = new Hono();

const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1)
});

// POST /api/auth/register
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, name } = c.req.valid('json');

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: 'Email already in use' }, 409);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, password: hashed, name }
  });

  const { password: _, ...safeUser } = user;
  return c.json({ user: safeUser }, 201);
});

// POST /api/auth/login
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });

  setCookie(c, 'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 60 * 60 * 24 * 7 // 7 days
  });

  const { password: _, ...safeUser } = user;
  return c.json({ user: safeUser });
});

// GET /api/auth/me
auth.get('/me', authMiddleware, async (c) => {
  const { sub } = c.get('user');
  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user) return c.json({ error: 'User not found' }, 404);
  const { password: _, ...safeUser } = user;
  return c.json({ user: safeUser });
});

// POST /api/auth/logout
auth.post('/logout', (c) => {
  deleteCookie(c, 'token');
  return c.json({ ok: true });
});

export default auth;
