/**
 * ProxyClient — 向上游模块发起请求的 HTTP 客户端
 *
 * 鉴权策略：
 * - Authorization: Bearer <userToken>  用户 JWT，所有模块共用
 * - X-API-KEY: <staticApiKey>          可选，模块级静态鉴权（baize 不需要）
 *
 * 直接返回 Response，调用方可决定是否流式透传。
 */
export interface ProxyClientOptions {
  /** 模块静态 API Key；设置后会以 X-API-KEY header 发送 */
  staticApiKey?: string;
}

export interface ProxyRequestInit extends Omit<RequestInit, 'headers'> {
  headers?: HeadersInit;
  /** 当前登录用户的 JWT，将作为 Authorization: Bearer 发送 */
  userToken?: string | null;
}

export class ProxyClient {
  constructor(
    private readonly baseUrl: string,
    private readonly options: ProxyClientOptions = {}
  ) {}

  async request(path: string, init: ProxyRequestInit = {}): Promise<Response> {
    const { userToken, headers: srcHeaders, ...rest } = init;
    const headers = new Headers();

    // 显式遍历，兼容 Headers 实例 / 普通对象 / 数组三种形式
    if (srcHeaders) {
      if (srcHeaders instanceof Headers) {
        srcHeaders.forEach((v, k) => headers.set(k, v));
      } else if (Array.isArray(srcHeaders)) {
        srcHeaders.forEach(([k, v]) => headers.set(k, v));
      } else {
        Object.entries(srcHeaders as Record<string, string>).forEach(([k, v]) =>
          headers.set(k, v)
        );
      }
    }

    // 用户 JWT → Authorization: Bearer
    if (userToken) {
      headers.set('Authorization', `Bearer ${userToken}`);
    }

    // 模块静态 Key → X-API-KEY
    if (this.options.staticApiKey) {
      headers.set('X-API-KEY', this.options.staticApiKey);
    }

    // 只在没有显式 Content-Type 时设默认值（避免覆盖 multipart 等）
    if (!headers.has('Content-Type') && rest.body) {
      headers.set('Content-Type', 'application/json');
    }

    return fetch(`${this.baseUrl}${path}`, { ...rest, headers });
  }
}
