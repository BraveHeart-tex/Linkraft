import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DrizzleLoggerModule } from './drizzle-logger/drizzle-logger.module';
import { DrizzleLoggerService } from './drizzle-logger/drizzle-logger.service';
import { DRIZZLE_CONNECTION } from 'src/modules/database/database.tokens';
import { AppConfigService } from 'src/config/app-config.service';

@Module({
  imports: [DrizzleLoggerModule],
  providers: [
    {
      provide: DRIZZLE_CONNECTION,
      useFactory: (
        appConfigService: AppConfigService,
        drizzleLogger: DrizzleLoggerService
      ) => {
        const pool = new Pool({
          connectionString: appConfigService.get('DATABASE_URL'),
        });
        return drizzle(pool, {
          schema,
          logger: drizzleLogger,
        });
      },
      inject: [AppConfigService, DrizzleLoggerService],
    },
  ],
  exports: [DRIZZLE_CONNECTION],
})
export class DatabaseModule {}
