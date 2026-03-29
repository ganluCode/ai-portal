/**
 * Orval 自定义 fetcher
 *
 * 服务端（Server Components / Route Handlers）：
 *   直接调用 BAIZE_API_URL，用 BAIZE_API_KEY 鉴权，无需经过代理。
 *
 * 客户端（Client Components）：
 *   通过 /api/proxy/baize 代理，鉴权由服务端 Hono 层处理，
 *   前端不接触 API Key。
 */

const isServer = typeof window === 'undefined';

function getBaseUrl() {
  if (isServer) {
    return process.env.BAIZE_API_URL ?? '';
  }
  return '/api/proxy/baize';
}

function getAuthHeaders(): Record<string, string> {
  if (isServer) {
    const key = process.env.BAIZE_API_KEY;
    return key ? { Authorization: `Bearer ${key}` } : {};
  }
  // 客户端走代理，代理自己加鉴权
  return {};
}

export const customFetch = async <T>(
  url: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> => {
  const { params, ...init } = options;

  // 拼接查询参数
  let fullUrl = `${getBaseUrl()}${url}`;
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString();
    fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
  }

  const res = await fetch(fullUrl, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers ?? {})
    }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Baize API error ${res.status}: ${text}`);
  }

  // 空响应（204 No Content 等）
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
};
