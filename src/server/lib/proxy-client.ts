/**
 * ProxyClient — 向上游模块（如 Baize）发起请求的 HTTP 客户端
 * - 自动携带 Authorization: Bearer <apiKey>
 * - 直接返回 Response，调用方可决定是否流式透传
 */
export class ProxyClient {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string
  ) {}

  async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers();

    // 显式遍历，兼容 Headers 实例 / 普通对象 / 数组三种形式
    const src = init.headers;
    if (src) {
      if (src instanceof Headers) {
        src.forEach((v, k) => headers.set(k, v));
      } else if (Array.isArray(src)) {
        src.forEach(([k, v]) => headers.set(k, v));
      } else {
        Object.entries(src as Record<string, string>).forEach(([k, v]) =>
          headers.set(k, v)
        );
      }
    }

    headers.set('Authorization', `Bearer ${this.apiKey}`);
    // 只在没有显式 Content-Type 时设默认值（避免覆盖 multipart 等）
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${this.baseUrl}${path}`, { ...init, headers });
  }
}

// 单例，由 modules 配置驱动
import { modules } from '@/config/modules';
export const baizeClient = new ProxyClient(
  modules.baize.apiUrl,
  modules.baize.apiKey
);
