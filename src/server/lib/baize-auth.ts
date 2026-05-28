/**
 * BaizeAuthClient — 直接调用 Baize 真实 API 完成认证
 *
 * 不再依赖本地 JWT 签发或 Redis，所有认证状态由 Baize 管理。
 * BAIZE_API_URL 必须配置，否则启动时报错。
 */

const getBaizeUrl = () => {
  const url = process.env.BAIZE_API_URL;
  if (!url) throw new Error('BAIZE_API_URL is not set');
  return url;
};

export interface BaizeTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface BaizeUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar: string | null;
  preferences: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

async function callBaize<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${getBaizeUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw Object.assign(new Error(`Baize ${res.status}: ${text}`), {
      status: res.status
    });
  }
  return res.json() as Promise<T>;
}

export const baizeClient = {
  /** 用户登录，返回 access_token */
  async login(login: string, password: string): Promise<BaizeTokenResponse> {
    return callBaize<BaizeTokenResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password })
    });
  },

  /** 吊销 token（best-effort，失败不抛出） */
  async logout(token: string): Promise<void> {
    try {
      await callBaize('/api/v1/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      // best-effort
    }
  },

  /** 刷新 token，返回新的 TokenResponse */
  async refresh(token: string): Promise<BaizeTokenResponse> {
    return callBaize<BaizeTokenResponse>('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  /** 获取当前用户信息 */
  async getMe(token: string): Promise<BaizeUserResponse> {
    return callBaize<BaizeUserResponse>('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
