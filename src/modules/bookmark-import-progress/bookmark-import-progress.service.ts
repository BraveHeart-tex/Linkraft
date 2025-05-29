import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from 'src/modules/redis/redis.tokens';

@Injectable()
export class BookmarkImportProgressService {
  private readonly TTL_SECONDS = 60 * 10; // 10 minutes
  private readonly prefix = 'bookmark:import:progress';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  private getDoneKey(parentJobId: string): string {
    return `${this.prefix}:${parentJobId}:done`;
  }

  private getTotalKey(parentJobId: string): string {
    return `${this.prefix}:${parentJobId}:total`;
  }

  async setTotalProgress(
    parentJobId: string,
    totalCount: number
  ): Promise<void> {
    const totalKey = this.getTotalKey(parentJobId);
    const doneKey = this.getDoneKey(parentJobId);

    await this.redis
      .multi()
      .set(totalKey, totalCount, 'EX', this.TTL_SECONDS)
      .set(doneKey, 0, 'EX', this.TTL_SECONDS)
      .exec();
  }

  async incrementProgress(parentJobId: string): Promise<void> {
    const doneKey = this.getDoneKey(parentJobId);
    const ttl = await this.redis.ttl(doneKey);

    const pipeline = this.redis.pipeline().incr(doneKey);
    if (ttl > 0) {
      pipeline.expire(doneKey, this.TTL_SECONDS);
    }
    await pipeline.exec();
  }

  async getProgress(parentJobId: string): Promise<number> {
    const [doneStr, totalStr] = await this.redis.mget(
      this.getDoneKey(parentJobId),
      this.getTotalKey(parentJobId)
    );

    const done = parseInt(doneStr || '0', 10);
    const total = parseInt(totalStr || '0', 10);

    if (total === 0) return 0;

    return Math.min(Math.round((done / total) * 100), 100);
  }

  async cleanupProgress(parentJobId: string): Promise<void> {
    await this.redis.del(
      this.getDoneKey(parentJobId),
      this.getTotalKey(parentJobId)
    );
  }
}
