import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authMiddleware } from '../middleware/auth';

const users = new Hono();

users.use('*', authMiddleware);

const updateSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  password: z.string().min(6).optional()
});

// GET /api/users
users.get('/', async (c) => {
  const list = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      createdAt: true
    }
  });
  return c.json({ users: list });
});

// GET /api/users/:id
users.get('/:id', async (c) => {
  const user = await prisma.user.findUnique({
    where: { id: c.req.param('id') },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      createdAt: true
    }
  });
  if (!user) return c.json({ error: 'Not found' }, 404);
  return c.json({ user });
});

// PATCH /api/users/:id
users.patch('/:id', zValidator('json', updateSchema), async (c) => {
  const data = c.req.valid('json');
  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.avatar !== undefined) updates.avatar = data.avatar;
  if (data.password) updates.password = await bcrypt.hash(data.password, 10);

  const user = await prisma.user.update({
    where: { id: c.req.param('id') },
    data: updates,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      updatedAt: true
    }
  });
  return c.json({ user });
});

// DELETE /api/users/:id
users.delete('/:id', async (c) => {
  await prisma.user.delete({ where: { id: c.req.param('id') } });
  return c.json({ ok: true });
});

export default users;
