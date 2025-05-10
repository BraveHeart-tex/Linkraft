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
          host: appConfigService.get('REDIS_HOST'),
          port: appConfigService.get('REDIS_PORT'),
          password: appConfigService.get('REDIS_PASSWORD'),
          db: appConfigService.get('REDIS_DB'),
        });
      },
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}
