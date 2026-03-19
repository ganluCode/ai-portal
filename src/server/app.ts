import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import users from './routes/users';

const app = new Hono().basePath('/api');

app.use(
  '*',
  cors({ origin: process.env.NEXT_PUBLIC_APP_URL || '*', credentials: true })
);

app.route('/auth', auth);
app.route('/users', users);

app.get('/health', (c) => c.json({ ok: true }));

export default app;
