import { Hono } from 'hono';
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId
} from 'ai';
import type { UIMessage } from 'ai';
import { authMiddleware } from '../middleware/auth';
import { modules } from '@/config/modules';

type AuthEnv = {
  Variables: {
    user: unknown;
    token: string;
  };
};

const chat = new Hono<AuthEnv>();
chat.use('*', authMiddleware);

chat.post('/', async (c) => {
  const token = c.get('token');
  const body = await c.req.json<{
    messages: UIMessage[];
    agent_id?: string;
    session_id?: string;
    thinking?: boolean;
  }>();

  // 只取最后一条用户消息
  const lastUserMsg = [...body.messages]
    .reverse()
    .find((m) => m.role === 'user');
  const message =
    lastUserMsg?.parts
      ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
      .map((p) => p.text)
      .join('\n') ?? '';

  if (!message) {
    return c.json({ error: 'Empty message' }, 400);
  }

  const { agent_id, session_id, thinking } = body;

  // 调 Baize 原生 SSE 接口
  const upstream = await fetch(`${modules.baize.apiUrl}/api/v1/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      message,
      agent_id: agent_id || undefined,
      session_id: session_id || undefined,
      thinking: thinking || undefined
    })
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => 'Unknown error');
    return c.json({ error: text }, upstream.status as 500);
  }
  if (!upstream.body) {
    return c.json({ error: 'No response body' }, 502);
  }

  const upstreamBody = upstream.body;

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';
      let inReasoning = false;
      let inText = false;
      const reasoningId = generateId();
      const textId = generateId();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const raw = line.slice(5).trim();
              if (!raw) continue;

              let parsed: Record<string, unknown>;
              try {
                parsed = JSON.parse(raw);
              } catch {
                parsed = { content: raw };
              }

              switch (currentEvent) {
                case 'thinking': {
                  if (!inReasoning) {
                    writer.write({ type: 'reasoning-start', id: reasoningId });
                    inReasoning = true;
                  }
                  writer.write({
                    type: 'reasoning-delta',
                    id: reasoningId,
                    delta: (parsed.content as string) ?? ''
                  });
                  break;
                }
                case 'token': {
                  if (inReasoning) {
                    writer.write({ type: 'reasoning-end', id: reasoningId });
                    inReasoning = false;
                  }
                  if (!inText) {
                    writer.write({ type: 'text-start', id: textId });
                    inText = true;
                  }
                  writer.write({
                    type: 'text-delta',
                    id: textId,
                    delta: (parsed.content as string) ?? ''
                  });
                  break;
                }
                case 'error': {
                  throw new Error(
                    (parsed.message as string) ?? 'Unknown error'
                  );
                }
                // done / tool_call / tool_result 暂不处理
              }
            } else if (line.trim() === '') {
              currentEvent = '';
            }
          }
        }

        if (inReasoning) {
          writer.write({ type: 'reasoning-end', id: reasoningId });
        }
        if (inText) {
          writer.write({ type: 'text-end', id: textId });
        }
        writer.write({ type: 'finish-step' });
      } finally {
        reader.releaseLock();
      }
    }
  });

  const response = createUIMessageStreamResponse({ stream });
  // 防止 gzip 缓冲
  response.headers.set('Content-Encoding', 'identity');
  response.headers.set('Cache-Control', 'no-cache, no-transform');
  response.headers.set('X-Accel-Buffering', 'no');
  return response;
});

export default chat;
