/**
 * BaizeAuthClient — 封装对 Baize 认证接口的调用
 *
 * BAIZE_MODE=mock  → 自签 JWT + 写内存 Redis（默认）
 * BAIZE_MODE=real  → 调用真实 Baize API
 */

import jwt from 'jsonwebtoken';
import { redis, jwtKey } from './redis';

export interface BaizeTokenPayload {
  sub: string; // user id
  email: string;
  role: string;
  jti: string; // JWT ID，用于 Redis 查找
}

const MOCK_SECRET =
  process.env.JWT_SECRET || 'mock-secret-change-in-production';
const JWT_TTL = 60 * 60 * 24 * 7; // 7 days

// ── Mock 实现 ────────────────────────────────────────────────
async function mockLogin(
  payload: Omit<BaizeTokenPayload, 'jti'>
): Promise<string> {
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, MOCK_SECRET, {
    expiresIn: JWT_TTL
  });
  // 模拟 Baize 将 JWT 写入 Redis
  await redis.set(jwtKey(payload.sub, jti), '1', JWT_TTL);
  return token;
}

async function mockLogout(token: string): Promise<void> {
  try {
    const payload = jwt.decode(token) as BaizeTokenPayload | null;
    if (payload?.sub && payload?.jti) {
      await redis.del(jwtKey(payload.sub, payload.jti));
    }
  } catch {
    // ignore
  }
}

// ── Real 实现（等 Baize 建好后填充）────────────────────────
async function realLogin(
  _payload: Omit<BaizeTokenPayload, 'jti'>
): Promise<string> {
  // const res = await fetch(`${process.env.BAIZE_API_URL}/api/v1/auth/login`, { ... })
  throw new Error('Real Baize auth not implemented yet. Set BAIZE_MODE=mock');
}

async function realLogout(_token: string): Promise<void> {
  throw new Error('Real Baize auth not implemented yet. Set BAIZE_MODE=mock');
}

// ── 导出 ─────────────────────────────────────────────────────
const isMock = process.env.BAIZE_MODE !== 'real';

export const baizeAuth = {
  login: (payload: Omit<BaizeTokenPayload, 'jti'>) =>
    isMock ? mockLogin(payload) : realLogin(payload),
  logout: (token: string) => (isMock ? mockLogout(token) : realLogout(token))
};
