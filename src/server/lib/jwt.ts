import jwt from 'jsonwebtoken';

export interface TokenPayload {
  sub: string;
  email?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

/**
 * 仅解码 JWT（不验签），并检查本地过期时间。
 *
 * Portal 作为 BFF，不与 Baize 共享签名密钥。
 * 真正的签名验证由 Baize 在每次上游请求时完成。
 * 若 token 已过期则快速失败，避免无效请求到达 Baize。
 */
export function decodeToken(token: string): TokenPayload {
  const payload = jwt.decode(token);
  if (!payload || typeof payload === 'string') {
    throw new Error('Invalid token');
  }
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    throw new Error('Token expired');
  }
  return payload as TokenPayload;
}
