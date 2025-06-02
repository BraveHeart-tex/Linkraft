import { Module } from '@nestjs/common';
import Redis from 'ioredis';
import { AppConfigService } from 'src/config/app-config.service';
import { RedisService } from 'src/modules/redis/redis.service';
import { REDIS_CLIENT } from 'src/modules/redis/redis.tokens';

@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [AppConfigService],
      useFactory: (appConfigService: AppConfigService) => {
        return new Redis({
          host: appConfigService.getOrThrow('REDIS_HOST'),
          port: appConfigService.getOrThrow('REDIS_PORT'),
          password: appConfigService.getOrThrow('REDIS_PASSWORD'),
          db: appConfigService.getOrThrow('REDIS_DB'),
        });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
