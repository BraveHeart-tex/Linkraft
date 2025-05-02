import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from 'src/modules/redis/redis.tokens';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private buildKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  async set<T>(
    namespace: string,
    key: string,
    value: T,
    ttlSeconds?: number
  ): Promise<void> {
    const serialized = JSON.stringify(value);
    const fullKey = this.buildKey(namespace, key);

    if (ttlSeconds) {
      await this.redis.set(fullKey, serialized, 'EX', ttlSeconds);
    } else {
      await this.redis.set(fullKey, serialized);
    }
  }

  async get<T>(namespace: string, key: string): Promise<T | null> {
    const fullKey = this.buildKey(namespace, key);
    const raw = await this.redis.get(fullKey);

    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async del(namespace: string, key: string): Promise<void> {
    const fullKey = this.buildKey(namespace, key);
    await this.redis.del(fullKey);
  }

  async incr(namespace: string, key: string): Promise<number> {
    const fullKey = this.buildKey(namespace, key);
    return await this.redis.incr(fullKey);
  }

  async mget<T>(namespace: string, ...keys: string[]): Promise<(T | null)[]> {
    const fullKeys = keys.map((key) => this.buildKey(namespace, key));
    const raw = await this.redis.mget(...fullKeys);

    return raw.map((val) => {
      if (!val) return null;
      try {
        return JSON.parse(val) as T;
      } catch {
        return null;
      }
    });
  }
}
