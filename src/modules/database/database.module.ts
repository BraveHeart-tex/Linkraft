import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../db/schema';
import { DrizzleLoggerModule } from './drizzle-logger/drizzle-logger.module';
import { DrizzleLoggerService } from './drizzle-logger/drizzle-logger.service';

export const DRIZZLE_CONNECTION = Symbol('DRIZZLE_CONNECTION');

@Module({
  imports: [ConfigModule, DrizzleLoggerModule],
  providers: [
    {
      provide: DRIZZLE_CONNECTION,
      useFactory: (
        configService: ConfigService,
        drizzleLogger: DrizzleLoggerService
      ) => {
        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
        });

        return drizzle(pool, {
          schema,
          logger: drizzleLogger,
        });
      },
      inject: [ConfigService, DrizzleLoggerService],
    },
  ],
  exports: [DRIZZLE_CONNECTION],
})
export class DatabaseModule {}
