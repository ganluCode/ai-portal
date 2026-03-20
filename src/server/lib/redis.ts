/**
 * Redis 客户端
 * REDIS_MODE=mock  → 内存 Map（默认，Baize 未建好时使用）
 * REDIS_MODE=real  → 连接真实 Redis（生产环境）
 */

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ── Mock 实现（内存）──────────────────────────────────────────
class MockRedis implements RedisClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number) {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined
    });
  }

  async del(key: string) {
    this.store.delete(key);
  }
}

// ── Real 实现（ioredis）─────────────────────────────────────
// 等 Baize 建好后解除注释并安装 ioredis
// import Redis from 'ioredis';
// class RealRedis implements RedisClient { ... }

// ── 单例 ────────────────────────────────────────────────────
// 使用 globalThis 防止 Next.js 热重载时内存 store 被重置
const globalForRedis = globalThis as unknown as { mockRedis: MockRedis };

function createRedis(): RedisClient {
  if (process.env.REDIS_MODE === 'real') {
    throw new Error('Real Redis not implemented yet. Set REDIS_MODE=mock');
  }
  if (!globalForRedis.mockRedis) {
    globalForRedis.mockRedis = new MockRedis();
  }
  return globalForRedis.mockRedis;
}

// 测试环境每次创建新实例，避免测试间状态泄漏
export const redis =
  process.env.NODE_ENV === 'test' ? new MockRedis() : createRedis();

// JWT 在 Redis 里的 key 格式（与 Baize 约定一致）
export const jwtKey = (userId: string, jti: string) => `jwt:${userId}:${jti}`;
