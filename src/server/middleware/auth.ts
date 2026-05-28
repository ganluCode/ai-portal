import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import { decodeToken, type TokenPayload } from '../lib/jwt';

type AuthEnv = {
  Variables: {
    user: TokenPayload;
    token: string;
  };
};

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getCookie(c, 'token');

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const payload = decodeToken(token);
    c.set('user', payload);
    c.set('token', token);
    await next();
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});
