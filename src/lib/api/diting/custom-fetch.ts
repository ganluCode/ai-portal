/**
 * Orval 自定义 fetcher (Diting)
 *
 * 服务端（Server Components / Route Handlers）：
 *   直接调用 DITING_API_URL，用 DITING_API_KEY 鉴权，无需经过代理。
 *
 * 客户端（Client Components）：
 *   通过 /api/proxy/diting 代理，鉴权由服务端 Hono 层处理，
 *   前端不接触 API Key。
 */

const isServer = typeof window === 'undefined';

function getBaseUrl() {
  if (isServer) {
    return process.env.DITING_API_URL ?? '';
  }
  return '/api/proxy/diting';
}

function getAuthHeaders(): Record<string, string> {
  if (isServer) {
    const key = process.env.DITING_API_KEY;
    return key ? { Authorization: `Bearer ${key}` } : {};
  }
  // 客户端走代理，代理自己加鉴权
  return {};
}

/**
 * 返回 orval fetch client 约定的形状：{ status, data, headers }
 * 泛型 T 会被推断为类似
 *   { data: Xxx; status: 200 } | { data: HTTPValidationError; status: 422 }
 * 的 union。
 */
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

  // 解析响应体：空响应（204 等）或非 JSON 返回 undefined
  const ct = res.headers.get('content-type') ?? '';
  let data: unknown = undefined;
  if (ct.includes('application/json')) {
    data = await res.json().catch(() => undefined);
  } else if (res.status !== 204) {
    const text = await res.text().catch(() => '');
    data = text || undefined;
  }

  if (!res.ok) {
    throw new DitingApiError(res.status, data);
  }

  return {
    status: res.status,
    data,
    headers: res.headers
  } as T;
};

export class DitingApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    const detail =
      typeof data === 'object' && data && 'detail' in data
        ? JSON.stringify((data as { detail: unknown }).detail)
        : String(data ?? '');
    super(`Diting API error ${status}: ${detail}`);
    this.name = 'DitingApiError';
  }
}
