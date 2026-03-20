import jwt from 'jsonwebtoken';
import { redis, jwtKey } from './redis';
import type { BaizeTokenPayload } from './baize-auth';

const getSecret = () => {
  const secret = process.env.JWT_SECRET || 'mock-secret-change-in-production';
  return secret;
};

export type { BaizeTokenPayload as JwtPayload };

/**
 * 验证 JWT：
 * 1. 验证签名与过期时间
 * 2. 查 Redis 确认未被主动失效（Baize logout 时删除）
 */
export async function verifyToken(token: string): Promise<BaizeTokenPayload> {
  const payload = jwt.verify(token, getSecret()) as BaizeTokenPayload;

  const key = jwtKey(payload.sub, payload.jti);
  const valid = await redis.get(key);
  if (!valid) {
    throw new Error('Token has been revoked');
  }

  return payload;
}
