import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { verifyToken, type JwtPayload } from '../lib/jwt';

type AuthEnv = {
  Variables: {
    user: JwtPayload;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, 'token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = await verifyToken(token);
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
