import { LockService } from '@/modules/lock/lock.service';
import { RedisModule } from '@/modules/redis/redis.module';
import { Module } from '@nestjs/common';

@Module({
  imports: [RedisModule],
  providers: [LockService],
  exports: [LockService],
})
export class LockModule {}
