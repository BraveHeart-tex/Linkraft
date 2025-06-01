import { REDIS_CLIENT } from '@/modules/redis/redis.tokens';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class LockService {
  private redlock: Redlock;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
    this.redlock = new Redlock([this.redisClient], {
      retryCount: 5,
      retryDelay: 200,
      retryJitter: 100,
    });
  }

  /**
   * Acquire a lock for a given key.
   * Runs the callback if lock acquired.
   * @param key Unique lock key (e.g., upload:<object-key>)
   * @param callback Async function to run while lock is held
   * @param ttl Lock expiration in ms (default 10s)
   */
  async acquireLock<T>(
    key: string,
    callback: () => Promise<T>,
    ttl = 10000
  ): Promise<T> {
    const lockKey = `lock:${key}`;
    const lock = await this.redlock.acquire([lockKey], ttl);
    try {
      return await callback();
    } finally {
      await lock.release().catch(() => {
        // ignore if lock already expired or released
      });
    }
  }
}
