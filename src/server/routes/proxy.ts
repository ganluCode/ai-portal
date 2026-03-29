import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { modules } from '@/config/modules';
import { ProxyClient } from '../lib/proxy-client';

const proxy = new Hono();

// 所有代理请求都需要登录
proxy.use('*', authMiddleware);

/**
 * catch-all proxy: /api/proxy/:module/**
 * 把请求透传给对应模块的上游服务，完整保留 SSE 流
 */
proxy.all('/:module/*', async (c) => {
  const moduleName = c.req.param('module');
  const mod = modules[moduleName];

  if (!mod?.enabled) {
    return c.json(
      { error: `Module '${moduleName}' is not configured or disabled` },
      503
    );
  }

  // 拼接目标路径：去掉 /api/proxy/:module 前缀
  const upstreamPath = '/' + c.req.param('*');

  // 转发请求体（GET/HEAD 没有 body）
  const hasBody = !['GET', 'HEAD'].includes(c.req.method);
  const body = hasBody ? await c.req.raw.arrayBuffer() : undefined;

  // 只透传内容协商相关 header，避免 Host 等引起上游混淆
  const FORWARD_HEADERS = ['content-type', 'accept', 'accept-language'];
  const upstreamHeaders: Record<string, string> = {};
  for (const key of FORWARD_HEADERS) {
    const val = c.req.header(key);
    if (val) upstreamHeaders[key] = val;
  }

  const client = new ProxyClient(mod.apiUrl, mod.apiKey);
  const upstream = await client.request(upstreamPath, {
    method: c.req.method,
    headers: upstreamHeaders,
    body
  });

  // SSE 流式透传
  const contentType = upstream.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { 'Content-Type': contentType || 'application/json' }
  });
});

export default proxy;
