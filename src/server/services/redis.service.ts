import { Redis } from '@upstash/redis';
import { logger } from './logger';

export interface CacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class MemoryCacheStore implements CacheStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class UpstashRedisStore implements CacheStore {
  private client: Redis;

  constructor(url: string, token: string) {
    this.client = new Redis({ url, token });
  }

  async get(key: string): Promise<string | null> {
    // Upstash Redis automatically deserializes JSON-looking values. Keep the
    // service contract stable for callers that store JSON strings and parse
    // them themselves.
    const res = await this.client.get<unknown>(key);
    if (res === null || res === undefined) return null;
    return typeof res === 'string' ? res : JSON.stringify(res);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}

export class RedisService {
  private cache: CacheStore;

  constructor() {
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (upstashUrl && upstashToken) {
      logger.info('Connected to Upstash Redis Free Tier.');
      this.cache = new UpstashRedisStore(upstashUrl, upstashToken);
    } else {
      logger.info('Upstash Redis credentials not detected. Running with in-memory Redis-compatible cache store.');
      this.cache = new MemoryCacheStore();
    }
  }

  async get(key: string): Promise<string | null> {
    return this.cache.get(key);
  }

  async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
    return this.cache.set(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    return this.cache.del(key);
  }

  // Rate Limiting Sliding Window
  async checkRateLimit(
    identifier: string,
    action: string,
    limit: number = 10,
    windowSeconds: number = 60
  ): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:${action}:${identifier}`;
    const rawCount = await this.cache.get(key);
    const count = rawCount ? parseInt(rawCount, 10) : 0;

    if (count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    await this.cache.set(key, String(count + 1), windowSeconds);
    return { allowed: true, remaining: limit - (count + 1) };
  }

  // Distributed Lock
  async acquireLock(resource: string, ttlSeconds: number = 10): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    const current = await this.cache.get(lockKey);
    if (current) return false;
    await this.cache.set(lockKey, 'locked', ttlSeconds);
    return true;
  }

  async releaseLock(resource: string): Promise<void> {
    await this.cache.del(`lock:${resource}`);
  }

  // Idempotency Key Guard
  async checkIdempotency(key: string): Promise<boolean> {
    const idempotencyKey = `idempotency:${key}`;
    const exists = await this.cache.get(idempotencyKey);
    if (exists) return false;
    await this.cache.set(idempotencyKey, 'processed', 86400);
    return true;
  }
}

export const redisService = new RedisService();
