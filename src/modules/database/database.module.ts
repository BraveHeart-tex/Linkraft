import { createDb, createPgPool } from '@/modules/database/bootstrap';
import { LoggerService } from '@/modules/logging/logger.service';
import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { AppConfigService } from 'src/config/app-config.service';
import {
  DRIZZLE_CONNECTION,
  PG_POOL,
} from 'src/modules/database/database.tokens';
import * as schema from '../../db/schema';
import { DrizzleLoggerModule } from './drizzle-logger/drizzle-logger.module';
import { DrizzleLoggerService } from './drizzle-logger/drizzle-logger.service';

@Module({
  imports: [DrizzleLoggerModule],
  providers: [
    {
      provide: PG_POOL,
      useFactory: (config: AppConfigService): Pool =>
        createPgPool({ connectionString: config.getOrThrow('DATABASE_URL') }),
      inject: [AppConfigService],
    },
    {
      provide: DRIZZLE_CONNECTION,
      useFactory: (
        pool: Pool,
        drizzleLogger: DrizzleLoggerService
      ): NodePgDatabase<typeof schema> =>
        createDb(pool, { logger: drizzleLogger }),
      inject: [PG_POOL, DrizzleLoggerService],
    },
  ],
  exports: [DRIZZLE_CONNECTION],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(
    private readonly logger: LoggerService,
    @Inject(PG_POOL) private readonly pool: Pool
  ) {}
  async onApplicationShutdown(signal?: string) {
    await this.pool.end();
    this.logger.log('PG pool disconnected on shutdown', {
      context: DatabaseModule.name,
      meta: {
        signal,
      },
    });
  }
}
